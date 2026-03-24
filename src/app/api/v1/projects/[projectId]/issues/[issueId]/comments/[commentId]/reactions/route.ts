import { auth } from '../../../../../../../../../../../auth';
import { db } from '@/db';
import { commentReactions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const schema = z.object({ emoji: z.string().min(1).max(10) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { commentId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  // Toggle: remove if exists, add if not
  const [existing] = await db
    .select()
    .from(commentReactions)
    .where(
      and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, session.user.id),
        eq(commentReactions.emoji, parsed.data.emoji),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(commentReactions)
      .where(eq(commentReactions.id, existing.id));
    return apiResponse({ action: 'removed' });
  }

  const [reaction] = await db
    .insert(commentReactions)
    .values({
      commentId,
      userId: session.user.id,
      emoji: parsed.data.emoji,
    })
    .returning();

  return apiResponse({ action: 'added', reaction }, 201);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { commentId } = await params;

  const rows = await db
    .select()
    .from(commentReactions)
    .where(eq(commentReactions.commentId, commentId));

  // Group by emoji
  const grouped: Record<string, { count: number; userIds: string[] }> = {};
  for (const r of rows) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userIds: [] };
    grouped[r.emoji].count++;
    grouped[r.emoji].userIds.push(r.userId);
  }

  return apiResponse(grouped);
}
