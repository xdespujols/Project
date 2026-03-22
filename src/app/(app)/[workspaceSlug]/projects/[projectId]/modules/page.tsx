import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { modules, moduleIssues, issues, states, projects } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { CreateModuleButton } from './create-module-button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string }> };

const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-amber-100 text-amber-700',
  paused: 'bg-orange-100 text-orange-600',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default async function ModulesPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  const moduleList = await db.select().from(modules).where(eq(modules.projectId, projectId));

  const moduleIds = moduleList.map((m) => m.id);
  const issueRows = moduleIds.length > 0
    ? await db
        .select({ moduleId: moduleIssues.moduleId, stateGroup: states.group })
        .from(moduleIssues)
        .innerJoin(issues, eq(moduleIssues.issueId, issues.id))
        .leftJoin(states, eq(issues.stateId, states.id))
        .where(inArray(moduleIssues.moduleId, moduleIds))
    : [];

  const modulesWithProgress = moduleList.map((m) => {
    const rows = issueRows.filter((r) => r.moduleId === m.id);
    return {
      ...m,
      issueCount: rows.length,
      completedCount: rows.filter((r) => r.stateGroup === 'completed').length,
    };
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">{project?.name} / Modules</h1>
        <CreateModuleButton projectId={projectId} />
      </div>

      {modulesWithProgress.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No modules yet</p>
          <p className="text-sm">Group related issues into modules for better organization.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulesWithProgress.map((mod) => {
            const progress = mod.issueCount > 0
              ? Math.round((mod.completedCount / mod.issueCount) * 100) : 0;
            return (
              <Link
                key={mod.id}
                href={`/${workspaceSlug}/projects/${projectId}/modules/${mod.id}`}
                className="block border rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{mod.name}</h3>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[mod.status])}>
                    {mod.status}
                  </span>
                </div>
                {mod.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{mod.description}</p>
                )}
                {mod.issueCount > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{mod.completedCount}/{mod.issueCount} issues</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
