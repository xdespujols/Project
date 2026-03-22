import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { issues, states, projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { SpreadsheetView } from '@/components/issues/views/spreadsheet-view';
import { CreateIssueButton } from '@/components/issues/create-issue-button';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string }> };

export default async function SpreadsheetPage({ params }: Props) {
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
      createdAt: issues.createdAt, dueDate: issues.dueDate, startDate: issues.startDate,
    })
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .orderBy(desc(issues.createdAt));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-lg font-semibold">{project?.name} / Spreadsheet</h1>
        <CreateIssueButton projectId={projectId} states={projectStates} />
      </div>
      <SpreadsheetView
        issues={issueList}
        states={projectStates}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
