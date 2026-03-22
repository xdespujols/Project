import { auth } from '../../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { epics, epicIssues, issues, projects } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { CreateEpicButton } from './create-epic-button';

type Props = {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
};

export default async function EpicsPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db.select({ name: projects.name })
    .from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) notFound();

  const rows = await db
    .select({
      id: epics.id,
      sequenceId: epics.sequenceId,
      title: epics.title,
      color: epics.color,
      startDate: epics.startDate,
      dueDate: epics.dueDate,
      issueCount: sql<number>`count(${epicIssues.issueId})`,
    })
    .from(epics)
    .leftJoin(epicIssues, eq(epicIssues.epicId, epics.id))
    .where(eq(epics.projectId, projectId))
    .groupBy(epics.id)
    .orderBy(epics.sequenceId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Epics</h1>
        <CreateEpicButton projectId={projectId} workspaceSlug={workspaceSlug} />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No epics yet</p>
          <p className="text-sm">Create an epic to group related issues together.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((epic) => (
            <Link
              key={epic.id}
              href={`/${workspaceSlug}/projects/${projectId}/epics/${epic.id}`}
              className="flex items-center gap-4 border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: epic.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">E-{epic.sequenceId}</span>
                  <span className="font-medium">{epic.title}</span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  {epic.startDate && <span>Start: {epic.startDate}</span>}
                  {epic.dueDate && <span>Due: {epic.dueDate}</span>}
                  <span>{Number(epic.issueCount)} issues</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
