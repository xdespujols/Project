import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { issues, issueActivities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { automationsQueue } from '@/lib/queue';

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(['none', 'urgent', 'high', 'medium', 'low']).optional(),
  stateId: z.string().uuid().nullable().optional(),
  descriptionText: z.string().optional(),
  description: z.any().optional(),
  dueDate: z.string().nullable().optional(),
  estimate: z.number().nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const { issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) return apiError('Not found', 404);

  return apiResponse(issue);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const { projectId, issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const [existing] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!existing) return apiError('Not found', 404);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const updates = parsed.data;

  const [updated] = await db
    .update(issues)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(issues.id, issueId))
    .returning();

  // Log changed fields
  const activities = [];
  for (const [field, newVal] of Object.entries(updates)) {
    const oldVal = (existing as any)[field];
    if (oldVal !== newVal) {
      activities.push({
        issueId,
        actorId: session.user.id,
        field,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      });
    }
  }

  if (activities.length > 0) {
    await db.insert(issueActivities).values(activities);
  }

  // Fire automation triggers asynchronously (non-blocking)
  for (const activity of activities) {
    const triggerMap: Record<string, string> = {
      stateId: 'issue_state_changed',
      priority: 'issue_priority_changed',
    };
    const triggerType = triggerMap[activity.field];
    if (triggerType) {
      automationsQueue.add(triggerType, {
        projectId,
        issueId,
        triggerType,
        triggerData: { field: activity.field, oldValue: activity.oldValue, newValue: activity.newValue },
      }).catch(() => { /* non-critical */ });
    }
  }

  return apiResponse(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const { issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  await db.delete(issues).where(eq(issues.id, issueId));
  return apiResponse({ deleted: true });
}
