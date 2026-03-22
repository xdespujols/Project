import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { workspaces, workspaceMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertWorkspaceMember } from '@/lib/permissions/guards';
import bcrypt from 'bcryptjs';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer', 'guest']).default('member'),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const { workspaceSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  if (!workspace) return apiError('Workspace not found', 404);
  await assertWorkspaceMember(session.user.id, workspace.id);

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspace.id));

  return apiResponse(members);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const { workspaceSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  if (!workspace) return apiError('Workspace not found', 404);
  await assertWorkspaceMember(session.user.id, workspace.id, 'admin');

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!user) return apiError('User not found', 404);

  const [existing] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (existing) return apiError('Already a member', 409);

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: parsed.data.role,
  });

  return apiResponse({ invited: true }, 201);
}
