import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import {
  issues,
  states,
  issueAssignees,
  issueLabels,
  projects,
  workspaceMembers,
} from '@/db/schema';
import { users } from '@/db/schema';
import { labels } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { apiError } from '@/lib/utils';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { projectId } = await params;

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId, name: projects.name })
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

  // Fetch all issues with their state
  const issueRows = await db
    .select({
      id: issues.id,
      sequenceId: issues.sequenceId,
      title: issues.title,
      priority: issues.priority,
      stateName: states.name,
      stateGroup: states.group,
      startDate: issues.startDate,
      dueDate: issues.dueDate,
      estimate: issues.estimate,
      descriptionText: issues.descriptionText,
      createdAt: issues.createdAt,
      completedAt: issues.completedAt,
    })
    .from(issues)
    .leftJoin(states, eq(issues.stateId, states.id))
    .where(eq(issues.projectId, projectId))
    .orderBy(issues.sequenceId);

  if (issueRows.length === 0) {
    const csv = 'ID,Title,State,Priority,Assignees,Labels,Start Date,Due Date,Estimate,Created At\n';
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${project.name}-issues.csv"`,
      },
    });
  }

  const issueIds = issueRows.map((i) => i.id);

  // Assignees
  const assigneeRows = await db
    .select({ issueId: issueAssignees.issueId, name: users.name, email: users.email })
    .from(issueAssignees)
    .leftJoin(users, eq(issueAssignees.userId, users.id))
    .where(inArray(issueAssignees.issueId, issueIds));

  const assigneeMap = new Map<string, string[]>();
  for (const a of assigneeRows) {
    if (!assigneeMap.has(a.issueId)) assigneeMap.set(a.issueId, []);
    assigneeMap.get(a.issueId)!.push(a.name ?? a.email ?? 'Unknown');
  }

  // Labels
  const labelRows = await db
    .select({ issueId: issueLabels.issueId, name: labels.name })
    .from(issueLabels)
    .leftJoin(labels, eq(issueLabels.labelId, labels.id))
    .where(inArray(issueLabels.issueId, issueIds));

  const labelMap = new Map<string, string[]>();
  for (const l of labelRows) {
    if (!labelMap.has(l.issueId)) labelMap.set(l.issueId, []);
    labelMap.get(l.issueId)!.push(l.name ?? '');
  }

  function csvCell(value: string | null | undefined): string {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const header = 'ID,Title,State,Priority,Assignees,Labels,Start Date,Due Date,Estimate,Created At\n';

  const rows = issueRows.map((issue) => {
    const assignees = (assigneeMap.get(issue.id) ?? []).join('; ');
    const lbls = (labelMap.get(issue.id) ?? []).join('; ');
    return [
      csvCell(`${project.name}-${issue.sequenceId}`),
      csvCell(issue.title),
      csvCell(issue.stateName),
      csvCell(issue.priority),
      csvCell(assignees),
      csvCell(lbls),
      csvCell(issue.startDate),
      csvCell(issue.dueDate),
      csvCell(issue.estimate != null ? String(issue.estimate) : null),
      csvCell(issue.createdAt.toISOString()),
    ].join(',');
  });

  const csv = header + rows.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${project.name}-issues.csv"`,
    },
  });
}
