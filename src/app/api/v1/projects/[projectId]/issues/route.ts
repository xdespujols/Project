import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { issues, projects, issueActivities } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { PermissionError } from '@/lib/permissions/guards';

const createSchema = z.object({
  title: z.string().min(1).max(500),
  priority: z.enum(['none', 'urgent', 'high', 'medium', 'low']).default('none'),
  stateId: z.string().uuid().nullable().optional(),
  descriptionText: z.string().optional(),
  description: z.any().optional(),
  dueDate: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const url = new URL(req.url);
  const stateId = url.searchParams.get('state');
  const priority = url.searchParams.get('priority');

  const conditions = [eq(issues.projectId, projectId)];
  if (stateId) conditions.push(eq(issues.stateId, stateId));
  if (priority) conditions.push(eq(issues.priority, priority as any));

  const issueList = await db
    .select()
    .from(issues)
    .where(and(...conditions))
    .orderBy(desc(issues.createdAt));

  return apiResponse(issueList);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return apiError('Project not found', 404);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  // Get next sequence ID
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  const sequenceId = Number(count) + 1;

  const [issue] = await db
    .insert(issues)
    .values({
      projectId,
      title: parsed.data.title,
      priority: parsed.data.priority,
      stateId: parsed.data.stateId || null,
      descriptionText: parsed.data.descriptionText,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate || null,
      parentId: parsed.data.parentId || null,
      sequenceId,
      createdBy: session.user.id,
    })
    .returning();

  // Log activity
  await db.insert(issueActivities).values({
    issueId: issue.id,
    actorId: session.user.id,
    field: 'issue',
    newValue: 'created',
  });

  return apiResponse(issue, 201);
}
