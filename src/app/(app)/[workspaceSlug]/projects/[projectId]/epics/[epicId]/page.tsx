import { auth } from '../../../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { epics, epicIssues, issues, states } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EpicIssueManager } from './epic-issue-manager';

type Props = {
  params: Promise<{ workspaceSlug: string; projectId: string; epicId: string }>;
};

export default async function EpicDetailPage({ params }: Props) {
  const { workspaceSlug, projectId, epicId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [epic] = await db.select().from(epics).where(eq(epics.id, epicId)).limit(1);
  if (!epic) notFound();

  const epicIssueRows = await db
    .select({
      id: issues.id,
      title: issues.title,
      sequenceId: issues.sequenceId,
      priority: issues.priority,
      stateId: issues.stateId,
      stateName: states.name,
      stateColor: states.color,
    })
    .from(epicIssues)
    .innerJoin(issues, eq(epicIssues.issueId, issues.id))
    .leftJoin(states, eq(issues.stateId, states.id))
    .where(eq(epicIssues.epicId, epicId));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Link href={`/${workspaceSlug}/projects/${projectId}/epics`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: epic.color }}
        />
        <h1 className="text-lg font-semibold">{epic.title}</h1>
        <span className="text-sm text-gray-400 ml-auto">E-{epic.sequenceId}</span>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex gap-4 text-sm text-gray-500 mb-6">
          {epic.startDate && (
            <span>Start: <span className="font-medium text-gray-700">{epic.startDate}</span></span>
          )}
          {epic.dueDate && (
            <span>Due: <span className="font-medium text-gray-700">{epic.dueDate}</span></span>
          )}
        </div>

        <EpicIssueManager
          epicId={epicId}
          projectId={projectId}
          workspaceSlug={workspaceSlug}
          issues={epicIssueRows}
        />
      </div>
    </div>
  );
}
