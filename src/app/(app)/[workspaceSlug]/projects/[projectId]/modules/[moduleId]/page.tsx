import { auth } from '../../../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { modules, moduleIssues, issues, states } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { IssueListView } from '@/components/issues/views/list-view';
import { ModuleIssueManager } from './module-issue-manager';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string; moduleId: string }> };

export default async function ModuleDetailPage({ params }: Props) {
  const { workspaceSlug, projectId, moduleId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [mod] = await db.select().from(modules).where(eq(modules.id, moduleId)).limit(1);
  if (!mod) notFound();

  const projectStates = await db
    .select()
    .from(states)
    .where(eq(states.projectId, projectId))
    .orderBy(states.sequence);

  const modIssueRows = await db
    .select({ issue: issues })
    .from(moduleIssues)
    .innerJoin(issues, eq(moduleIssues.issueId, issues.id))
    .where(eq(moduleIssues.moduleId, moduleId));

  const allIssues = await db
    .select({ id: issues.id, title: issues.title, sequenceId: issues.sequenceId })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  const modIssueList = modIssueRows.map((r) => ({
    id: r.issue.id, title: r.issue.title, priority: r.issue.priority,
    stateId: r.issue.stateId, sequenceId: r.issue.sequenceId,
    createdAt: r.issue.createdAt, dueDate: r.issue.dueDate,
  }));

  const assignedIds = new Set(modIssueList.map((i) => i.id));
  const unassigned = allIssues.filter((i) => !assignedIds.has(i.id));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-lg font-semibold">{mod.name}</h1>
        <p className="text-xs text-gray-500 capitalize mt-0.5">{mod.status}</p>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <IssueListView issues={modIssueList} states={projectStates} workspaceSlug={workspaceSlug} projectId={projectId} />
        </div>
        <div className="w-72 border-l flex-shrink-0 overflow-y-auto p-4">
          <ModuleIssueManager moduleId={moduleId} unassignedIssues={unassigned} />
        </div>
      </div>
    </div>
  );
}
