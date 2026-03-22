import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { cycles, cycleIssues, issues, states, projects } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { CycleCard } from '@/components/cycles/cycle-card';
import { CreateCycleButton } from './create-cycle-button';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string }> };

export default async function CyclesPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  const cycleList = await db
    .select()
    .from(cycles)
    .where(eq(cycles.projectId, projectId))
    .orderBy(cycles.createdAt);

  // Count issues per cycle
  const cycleIds = cycleList.map((c) => c.id);
  const issueRows = cycleIds.length > 0
    ? await db
        .select({ cycleId: cycleIssues.cycleId, stateId: issues.stateId, stateGroup: states.group })
        .from(cycleIssues)
        .innerJoin(issues, eq(cycleIssues.issueId, issues.id))
        .leftJoin(states, eq(issues.stateId, states.id))
        .where(inArray(cycleIssues.cycleId, cycleIds))
    : [];

  const cyclesWithCounts = cycleList.map((c) => {
    const cycleIssueRows = issueRows.filter((r) => r.cycleId === c.id);
    return {
      ...c,
      issueCount: cycleIssueRows.length,
      completedCount: cycleIssueRows.filter((r) => r.stateGroup === 'completed').length,
    };
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">{project?.name} / Cycles</h1>
        <CreateCycleButton projectId={projectId} />
      </div>

      {cyclesWithCounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No cycles yet</p>
          <p className="text-sm">Use cycles to plan time-boxed sprints.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cyclesWithCounts.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              workspaceSlug={workspaceSlug}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
