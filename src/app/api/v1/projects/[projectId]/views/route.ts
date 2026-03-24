import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { savedViews, projects, workspaceMembers } from '@/db/schema';
import { and, eq, or, desc } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.string()).default({}),
  isShared: z.boolean().default(false),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { projectId } = await params;

  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return apiError('Not found', 404);

  const [member] = await db
    .select({ id: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) return apiError('Forbidden', 403);

  // Return views owned by user + shared views for this project
  const rows = await db
    .select()
    .from(savedViews)
    .where(
      and(
        eq(savedViews.projectId, projectId),
        or(eq(savedViews.createdBy, session.user.id), eq(savedViews.isShared, true)),
      ),
    )
    .orderBy(desc(savedViews.createdAt));

  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { projectId } = await params;

  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return apiError('Not found', 404);

  const [member] = await db
    .select({ id: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) return apiError('Forbidden', 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [view] = await db
    .insert(savedViews)
    .values({
      projectId,
      createdBy: session.user.id,
      name: parsed.data.name,
      filters: parsed.data.filters,
      isShared: parsed.data.isShared,
    })
    .returning();

  return apiResponse(view, 201);
}
