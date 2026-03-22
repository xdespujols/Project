import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { projects, workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceHomePage({ params }: Props) {
  const { workspaceSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  if (!workspace) redirect('/workspaces');

  const projectList = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href={`/${workspaceSlug}/projects/new`}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
        >
          New project
        </Link>
      </div>

      {projectList.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-4">No projects yet</p>
          <Link
            href={`/${workspaceSlug}/projects/new`}
            className="text-indigo-600 hover:underline"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectList.map((project) => (
            <Link
              key={project.id}
              href={`/${workspaceSlug}/projects/${project.id}/issues`}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center text-sm font-bold text-indigo-700">
                  {project.identifier}
                </div>
                <h2 className="font-semibold">{project.name}</h2>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
