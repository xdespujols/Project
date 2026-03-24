import { auth } from '../../../../../../../../../auth';
import { db } from '@/db';
import { issueComments, issueActivities } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { publishProjectEvent } from '@/lib/pubsub';

const createSchema = z.object({
  comment: z.any().optional(),
  commentText: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const { issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db
    .select()
    .from(issueComments)
    .where(eq(issueComments.issueId, issueId))
    .orderBy(asc(issueComments.createdAt));

  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const { issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [comment] = await db
    .insert(issueComments)
    .values({
      issueId,
      actorId: session.user.id,
      comment: parsed.data.comment,
      commentText: parsed.data.commentText,
    })
    .returning();

  await db.insert(issueActivities).values({
    issueId,
    actorId: session.user.id,
    field: 'comment',
    newValue: 'added',
  });

  publishProjectEvent(projectId, { type: 'comment.created', issueId, commentId: comment.id });

  return apiResponse(comment, 201);
}
