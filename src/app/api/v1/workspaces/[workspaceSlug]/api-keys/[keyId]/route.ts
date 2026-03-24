import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { apiKeys, workspaces, workspaceMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { apiResponse, apiError } from '@/lib/utils';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceSlug: string; keyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { workspaceSlug, keyId } = await params;

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

  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, ws.id)));

  return apiResponse({ deleted: true });
}
