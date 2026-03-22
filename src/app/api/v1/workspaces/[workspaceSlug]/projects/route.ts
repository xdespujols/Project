import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { projects, workspaces, workspaceMembers, states, projectMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertWorkspaceMember } from '@/lib/permissions/guards';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  identifier: z.string().min(1).max(6).regex(/^[A-Z0-9]+$/),
  description: z.string().optional(),
});

const DEFAULT_STATES = [
  { name: 'Backlog', color: '#6b7280', group: 'backlog' as const, sequence: 0 },
  { name: 'Todo', color: '#6366f1', group: 'unstarted' as const, sequence: 1 },
  { name: 'In Progress', color: '#f59e0b', group: 'started' as const, sequence: 2 },
  { name: 'Done', color: '#10b981', group: 'completed' as const, sequence: 3 },
  { name: 'Cancelled', color: '#ef4444', group: 'cancelled' as const, sequence: 4 },
];

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

  const projectList = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id));

  return apiResponse(projectList);
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

  await assertWorkspaceMember(session.user.id, workspace.id, 'member');

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      identifier: parsed.data.identifier,
      description: parsed.data.description,
      createdBy: session.user.id,
    })
    .returning();

  // Seed default states
  await db.insert(states).values(
    DEFAULT_STATES.map((s) => ({
      ...s,
      projectId: project.id,
      isDefault: s.name === 'Todo' ? 1 : 0,
    })),
  );

  // Add creator as project member
  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: session.user.id,
    role: 'owner',
  });

  return apiResponse(project, 201);
}
