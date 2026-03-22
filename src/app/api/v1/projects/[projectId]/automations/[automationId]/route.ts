import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { automations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isEnabled: z.boolean().optional(),
  triggerConditions: z.unknown().optional(),
  actionPayload: z.unknown().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; automationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, automationId } = await params;
  await assertProjectMember(session.user.id, projectId, 'member');

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db.update(automations)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(automations.id, automationId))
    .returning();
  if (!updated) return apiError('Not found', 404);
  return apiResponse(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; automationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, automationId } = await params;
  await assertProjectMember(session.user.id, projectId, 'member');

  await db.delete(automations).where(eq(automations.id, automationId));
  return apiResponse({ deleted: true });
}
