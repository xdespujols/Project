import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { webhooks, workspaces, workspaceMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const patchSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string; webhookId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { workspaceSlug, webhookId } = await params;

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (!ws) return apiError('Not found', 404);

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member || !['owner', 'admin'].includes(member.role)) return apiError('Forbidden', 403);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db
    .update(webhooks)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, ws.id)))
    .returning();

  return apiResponse(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceSlug: string; webhookId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { workspaceSlug, webhookId } = await params;

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (!ws) return apiError('Not found', 404);

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member || !['owner', 'admin'].includes(member.role)) return apiError('Forbidden', 403);

  await db.delete(webhooks).where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, ws.id)));

  return apiResponse({ deleted: true });
}
