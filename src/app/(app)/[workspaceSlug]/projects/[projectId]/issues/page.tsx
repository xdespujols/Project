import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { issues, states, labels, projects, issueLabels } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { IssueListView } from '@/components/issues/views/list-view';
import { CreateIssueButton } from '@/components/issues/create-issue-button';
import { IssueFilters } from '@/components/issues/issue-filters';
import { IssueSearch } from '@/components/issues/issue-search';

type Props = {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
  searchParams: Promise<{ state?: string; priority?: string; label?: string }>;
};

export default async function IssuesPage({ params, searchParams }: Props) {
  const { workspaceSlug, projectId } = await params;
  const { state: stateFilter, priority: priorityFilter, label: labelFilter } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  const projectStates = await db
    .select()
    .from(states)
    .where(eq(states.projectId, projectId))
    .orderBy(states.sequence);

  const projectLabels = await db
    .select()
    .from(labels)
    .where(eq(labels.projectId, projectId));

  // Build filter conditions
  const conditions = [eq(issues.projectId, projectId)];
  if (stateFilter) conditions.push(eq(issues.stateId, stateFilter));
  if (priorityFilter) conditions.push(eq(issues.priority, priorityFilter as any));

  let issueIds: string[] | null = null;
  if (labelFilter) {
    const labelIssueRows = await db
      .select({ issueId: issueLabels.issueId })
      .from(issueLabels)
      .where(eq(issueLabels.labelId, labelFilter));
    issueIds = labelIssueRows.map((r) => r.issueId);
    if (issueIds.length === 0) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-3 border-b flex-wrap gap-3">
            <h1 className="text-lg font-semibold">{project?.name} / Issues</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <IssueSearch projectId={projectId} workspaceSlug={workspaceSlug} />
              <IssueFilters states={projectStates} labels={projectLabels} />
              <CreateIssueButton projectId={projectId} states={projectStates} />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No issues with this label.</div>
        </div>
      );
    }
    conditions.push(inArray(issues.id, issueIds));
  }

  const issueList = await db
    .select({
      id: issues.id, title: issues.title, priority: issues.priority,
      stateId: issues.stateId, sequenceId: issues.sequenceId,
      createdAt: issues.createdAt, dueDate: issues.dueDate,
    })
    .from(issues)
    .where(and(...conditions))
    .orderBy(desc(issues.createdAt));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b flex-wrap gap-3">
        <h1 className="text-lg font-semibold">{project?.name} / Issues</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <IssueSearch projectId={projectId} workspaceSlug={workspaceSlug} />
          <IssueFilters states={projectStates} labels={projectLabels} />
          <CreateIssueButton projectId={projectId} states={projectStates} />
        </div>
      </div>
      <IssueListView
        issues={issueList}
        states={projectStates}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
      />
    </div>
  );
}
