import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { initiatives, workspaces, workspaceMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.unknown().optional(),
  descriptionText: z.string().optional(),
  color: z.string().optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

async function getWorkspaceAndAssertMember(slug: string, userId: string) {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (!ws) return null;
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!member) return null;
  return ws;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string; initiativeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { workspaceSlug, initiativeId } = await params;
  const ws = await getWorkspaceAndAssertMember(workspaceSlug, session.user.id);
  if (!ws) return apiError('Forbidden', 403);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db.update(initiatives)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(initiatives.id, initiativeId), eq(initiatives.workspaceId, ws.id)))
    .returning();
  if (!updated) return apiError('Not found', 404);
  return apiResponse(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string; initiativeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { workspaceSlug, initiativeId } = await params;
  const ws = await getWorkspaceAndAssertMember(workspaceSlug, session.user.id);
  if (!ws) return apiError('Forbidden', 403);

  await db.delete(initiatives).where(
    and(eq(initiatives.id, initiativeId), eq(initiatives.workspaceId, ws.id)),
  );
  return apiResponse({ deleted: true });
}
