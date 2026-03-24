import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import {
  issues,
  states,
  issueAssignees,
  workspaceMembers,
  projects,
} from '@/db/schema';
import { eq, and, sql, gte, count } from 'drizzle-orm';
import { users } from '@/db/schema';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { projectId } = await params;

  // Verify project exists and user has access
  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
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

  // Total issues
  const [{ total }] = await db
    .select({ total: count() })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  // Issues by state
  const byState = await db
    .select({
      stateId: issues.stateId,
      stateName: states.name,
      stateColor: states.color,
      stateGroup: states.group,
      count: count(),
    })
    .from(issues)
    .leftJoin(states, eq(issues.stateId, states.id))
    .where(eq(issues.projectId, projectId))
    .groupBy(issues.stateId, states.name, states.color, states.group);

  // Issues by priority
  const byPriority = await db
    .select({
      priority: issues.priority,
      count: count(),
    })
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .groupBy(issues.priority);

  // Issues by assignee
  const byAssignee = await db
    .select({
      userId: issueAssignees.userId,
      userName: users.name,
      userEmail: users.email,
      count: count(),
    })
    .from(issueAssignees)
    .innerJoin(issues, eq(issueAssignees.issueId, issues.id))
    .leftJoin(users, eq(issueAssignees.userId, users.id))
    .where(eq(issues.projectId, projectId))
    .groupBy(issueAssignees.userId, users.name, users.email)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // Completed issues per day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const completionTrend = await db
    .select({
      day: sql<string>`date_trunc('day', ${issues.completedAt})::date::text`,
      count: count(),
    })
    .from(issues)
    .where(
      and(
        eq(issues.projectId, projectId),
        gte(issues.completedAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`date_trunc('day', ${issues.completedAt})::date`)
    .orderBy(sql`date_trunc('day', ${issues.completedAt})::date`);

  return apiResponse({ total, byState, byPriority, byAssignee, completionTrend });
}
