import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { states } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  group: z.enum(['backlog', 'unstarted', 'started', 'completed', 'cancelled']).optional(),
  sequence: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; stateId: string }> },
) {
  const { projectId, stateId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db
    .update(states)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(states.id, stateId), eq(states.projectId, projectId)))
    .returning();

  if (!updated) return apiError('Not found', 404);
  return apiResponse(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; stateId: string }> },
) {
  const { projectId, stateId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  await db
    .delete(states)
    .where(and(eq(states.id, stateId), eq(states.projectId, projectId)));

  return apiResponse({ deleted: true });
}
