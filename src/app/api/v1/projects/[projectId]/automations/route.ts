import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { automations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  triggerType: z.enum([
    'issue_created',
    'issue_state_changed',
    'issue_priority_changed',
    'issue_assignee_changed',
    'issue_due_date_passed',
    'issue_label_added',
  ]),
  triggerConditions: z.unknown().optional(),
  actionType: z.enum([
    'set_state',
    'set_priority',
    'add_label',
    'remove_label',
    'assign_to',
    'send_notification',
  ]),
  actionPayload: z.unknown().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const rows = await db.select().from(automations)
    .where(eq(automations.projectId, projectId))
    .orderBy(automations.createdAt);
  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId } = await params;
  await assertProjectMember(session.user.id, projectId, 'member');

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [automation] = await db.insert(automations).values({
    projectId,
    name: parsed.data.name,
    triggerType: parsed.data.triggerType,
    triggerConditions: parsed.data.triggerConditions as object ?? null,
    actionType: parsed.data.actionType,
    actionPayload: parsed.data.actionPayload as object ?? null,
  }).returning();

  return apiResponse(automation, 201);
}
