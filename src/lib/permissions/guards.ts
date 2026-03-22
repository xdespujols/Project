import { db } from '@/db';
import { workspaceMembers, projectMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { type Role, hasAtLeastRole } from './roles';

export class PermissionError extends Error {
  status = 403;
  constructor(message = 'Forbidden') {
    super(message);
  }
}

export async function assertWorkspaceMember(
  userId: string,
  workspaceId: string,
  requiredRole: Role = 'guest',
) {
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!member) throw new PermissionError('Not a workspace member');
  if (!hasAtLeastRole(member.role, requiredRole)) {
    throw new PermissionError(`Requires ${requiredRole} role or higher`);
  }
  return member;
}

export async function assertProjectMember(
  userId: string,
  projectId: string,
  requiredRole: Role = 'guest',
) {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.projectId, projectId),
      ),
    )
    .limit(1);

  if (!member) throw new PermissionError('Not a project member');
  if (!hasAtLeastRole(member.role, requiredRole)) {
    throw new PermissionError(`Requires ${requiredRole} role or higher`);
  }
  return member;
}
