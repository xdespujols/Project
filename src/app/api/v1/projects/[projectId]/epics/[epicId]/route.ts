import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { epics } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.unknown().optional(),
  descriptionText: z.string().optional(),
  color: z.string().optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, epicId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db.update(epics)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(epics.id, epicId))
    .returning();
  if (!updated) return apiError('Not found', 404);
  return apiResponse(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, epicId } = await params;
  await assertProjectMember(session.user.id, projectId);

  await db.delete(epics).where(eq(epics.id, epicId));
  return apiResponse({ deleted: true });
}
