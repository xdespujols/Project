import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { savedViews } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.string()).optional(),
  isShared: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; viewId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { viewId } = await params;

  const [view] = await db
    .select()
    .from(savedViews)
    .where(and(eq(savedViews.id, viewId), eq(savedViews.createdBy, session.user.id)))
    .limit(1);
  if (!view) return apiError('Not found', 404);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db
    .update(savedViews)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(savedViews.id, viewId))
    .returning();

  return apiResponse(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; viewId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { viewId } = await params;

  await db
    .delete(savedViews)
    .where(and(eq(savedViews.id, viewId), eq(savedViews.createdBy, session.user.id)));

  return apiResponse({ deleted: true });
}
