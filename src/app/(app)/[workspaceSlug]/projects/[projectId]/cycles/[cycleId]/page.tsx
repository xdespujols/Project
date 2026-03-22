import { auth } from '../../../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { cycles, cycleIssues, issues, states, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { IssueListView } from '@/components/issues/views/list-view';
import { CycleIssueManager } from './cycle-issue-manager';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string; cycleId: string }> };

export default async function CycleDetailPage({ params }: Props) {
  const { workspaceSlug, projectId, cycleId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [cycle] = await db.select().from(cycles).where(eq(cycles.id, cycleId)).limit(1);
  if (!cycle) notFound();

  const projectStates = await db
    .select()
    .from(states)
    .where(eq(states.projectId, projectId))
    .orderBy(states.sequence);

  const cycleIssueRows = await db
    .select({ issue: issues })
    .from(cycleIssues)
    .innerJoin(issues, eq(cycleIssues.issueId, issues.id))
    .where(eq(cycleIssues.cycleId, cycleId));

  const allIssues = await db
    .select({ id: issues.id, title: issues.title, sequenceId: issues.sequenceId })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  const cycleIssueList = cycleIssueRows.map((r) => ({
    id: r.issue.id,
    title: r.issue.title,
    priority: r.issue.priority,
    stateId: r.issue.stateId,
    sequenceId: r.issue.sequenceId,
    createdAt: r.issue.createdAt,
    dueDate: r.issue.dueDate,
  }));

  const assignedIds = new Set(cycleIssueList.map((i) => i.id));
  const unassigned = allIssues.filter((i) => !assignedIds.has(i.id));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-lg font-semibold">{cycle.name}</h1>
        {(cycle.startDate || cycle.endDate) && (
          <p className="text-sm text-gray-500 mt-0.5">{cycle.startDate} → {cycle.endDate}</p>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <IssueListView
            issues={cycleIssueList}
            states={projectStates}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
          />
        </div>
        <div className="w-72 border-l flex-shrink-0 overflow-y-auto p-4">
          <CycleIssueManager
            cycleId={cycleId}
            assignedIds={Array.from(assignedIds)}
            unassignedIssues={unassigned}
          />
        </div>
      </div>
    </div>
  );
}
