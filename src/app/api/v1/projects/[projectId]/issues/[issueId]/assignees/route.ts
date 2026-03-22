import { auth } from '../../../../../../../../../auth';
import { db } from '@/db';
import { issueAssignees, users, issueActivities } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const schema = z.object({
  userIds: z.array(z.string()),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(issueAssignees)
    .innerJoin(users, eq(issueAssignees.userId, users.id))
    .where(eq(issueAssignees.issueId, issueId));

  return apiResponse(rows);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const { projectId, issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  // Replace all assignees
  await db.delete(issueAssignees).where(eq(issueAssignees.issueId, issueId));

  if (parsed.data.userIds.length > 0) {
    await db.insert(issueAssignees).values(
      parsed.data.userIds.map((userId) => ({ issueId, userId })),
    );
  }

  await db.insert(issueActivities).values({
    issueId,
    actorId: session.user.id,
    field: 'assignees',
    newValue: parsed.data.userIds.join(','),
  });

  return apiResponse({ updated: true });
}
