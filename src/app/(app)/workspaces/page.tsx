import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { workspaceMembers, workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { CreateWorkspaceForm } from './create-workspace-form';

export default async function WorkspacesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const memberRows = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, session.user.id));

  const userWorkspaces = memberRows.map((r) => r.workspace);

  if (userWorkspaces.length === 1) {
    redirect(`/${userWorkspaces[0].slug}`);
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8">Your workspaces</h1>

      {userWorkspaces.length > 0 && (
        <div className="grid gap-4 mb-12">
          {userWorkspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/${ws.slug}`}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-500 rounded flex items-center justify-center text-white font-bold">
                {ws.name[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{ws.name}</div>
                <div className="text-sm text-gray-500">{ws.slug}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateWorkspaceForm />
    </div>
  );
}
