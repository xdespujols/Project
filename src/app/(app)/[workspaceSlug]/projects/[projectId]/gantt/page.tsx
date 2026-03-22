import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { issues, states, projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { GanttView } from '@/components/issues/views/gantt-view';
import { CreateIssueButton } from '@/components/issues/create-issue-button';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string }> };

export default async function GanttPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  const projectStates = await db
    .select()
    .from(states)
    .where(eq(states.projectId, projectId))
    .orderBy(states.sequence);

  const issueList = await db
    .select({
      id: issues.id, title: issues.title, priority: issues.priority,
      stateId: issues.stateId, sequenceId: issues.sequenceId,
      startDate: issues.startDate, dueDate: issues.dueDate,
    })
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .orderBy(desc(issues.createdAt));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-lg font-semibold">{project?.name} / Gantt</h1>
        <CreateIssueButton projectId={projectId} states={projectStates} />
      </div>
      <GanttView
        issues={issueList}
        states={projectStates}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
