import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { customProperties } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  options: z.array(z.object({ id: z.string(), name: z.string(), color: z.string().optional() })).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; propertyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, propertyId } = await params;
  await assertProjectMember(session.user.id, projectId, 'member');

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db.update(customProperties)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(customProperties.id, propertyId))
    .returning();
  if (!updated) return apiError('Not found', 404);
  return apiResponse(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; propertyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, propertyId } = await params;
  await assertProjectMember(session.user.id, projectId, 'member');

  await db.delete(customProperties).where(eq(customProperties.id, propertyId));
  return apiResponse({ deleted: true });
}
