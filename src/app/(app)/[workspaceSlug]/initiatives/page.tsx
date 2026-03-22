import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { initiatives, workspaces, workspaceMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateInitiativeButton } from './create-initiative-button';

type Props = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function InitiativesPage({ params }: Props) {
  const { workspaceSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug)).limit(1);
  if (!ws) redirect('/');

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member) redirect('/');

  const rows = await db.select().from(initiatives)
    .where(eq(initiatives.workspaceId, ws.id))
    .orderBy(initiatives.sequenceId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Initiatives</h1>
        <CreateInitiativeButton workspaceSlug={workspaceSlug} />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No initiatives yet</p>
          <p className="text-sm">Create an initiative to track strategic goals across projects.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((initiative) => (
            <div
              key={initiative.id}
              className="flex items-center gap-4 border rounded-xl p-4 bg-white"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: initiative.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">I-{initiative.sequenceId}</span>
                  <span className="font-medium">{initiative.title}</span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  {initiative.startDate && <span>Start: {initiative.startDate}</span>}
                  {initiative.dueDate && <span>Due: {initiative.dueDate}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
