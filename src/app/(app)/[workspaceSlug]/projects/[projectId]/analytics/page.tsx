import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { issues, states, issueAssignees, projects } from '@/db/schema';
import { users } from '@/db/schema';
import { eq, and, sql, gte, count } from 'drizzle-orm';
import { cn } from '@/lib/utils';

type Props = {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  none: 'bg-gray-400',
};

const GROUP_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
  started: 'bg-blue-500',
  unstarted: 'bg-gray-300',
  backlog: 'bg-purple-400',
};

export default async function AnalyticsPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) redirect(`/${workspaceSlug}`);

  // Total
  const [{ total }] = await db
    .select({ total: count() })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  // By state
  const byState = await db
    .select({
      stateId: issues.stateId,
      stateName: states.name,
      stateColor: states.color,
      stateGroup: states.group,
      count: count(),
    })
    .from(issues)
    .leftJoin(states, eq(issues.stateId, states.id))
    .where(eq(issues.projectId, projectId))
    .groupBy(issues.stateId, states.name, states.color, states.group)
    .orderBy(sql`count(*) desc`);

  // By priority
  const byPriority = await db
    .select({ priority: issues.priority, count: count() })
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .groupBy(issues.priority)
    .orderBy(sql`count(*) desc`);

  // By assignee (top 8)
  const byAssignee = await db
    .select({
      userId: issueAssignees.userId,
      userName: users.name,
      userEmail: users.email,
      count: count(),
    })
    .from(issueAssignees)
    .innerJoin(issues, eq(issueAssignees.issueId, issues.id))
    .leftJoin(users, eq(issueAssignees.userId, users.id))
    .where(eq(issues.projectId, projectId))
    .groupBy(issueAssignees.userId, users.name, users.email)
    .orderBy(sql`count(*) desc`)
    .limit(8);

  // Completion trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const completionTrend = await db
    .select({
      day: sql<string>`date_trunc('day', ${issues.completedAt})::date::text`,
      count: count(),
    })
    .from(issues)
    .where(
      and(
        eq(issues.projectId, projectId),
        gte(issues.completedAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`date_trunc('day', ${issues.completedAt})::date`)
    .orderBy(sql`date_trunc('day', ${issues.completedAt})::date`);

  const completedCount = byState
    .filter((s) => s.stateGroup === 'completed')
    .reduce((acc, s) => acc + s.count, 0);

  const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const maxStateCount = Math.max(...byState.map((s) => s.count), 1);
  const maxPriorityCount = Math.max(...byPriority.map((p) => p.count), 1);
  const maxAssigneeCount = Math.max(...byAssignee.map((a) => a.count), 1);
  const maxTrendCount = Math.max(...completionTrend.map((t) => t.count), 1);

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.name} — Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of issue progress and team activity</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Issues" value={total} />
        <StatCard label="Completed" value={completedCount} />
        <StatCard label="In Progress" value={byState.filter((s) => s.stateGroup === 'started').reduce((a, s) => a + s.count, 0)} />
        <StatCard label="Completion Rate" value={`${completionPct}%`} />
      </div>

      {/* Completion progress bar */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Completion</span>
          <span className="text-sm text-gray-500">{completedCount} / {total} issues</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{completionPct}% complete</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By state */}
        <ChartCard title="Issues by State">
          {byState.length === 0 ? (
            <p className="text-sm text-gray-400">No issues yet</p>
          ) : (
            <div className="space-y-3">
              {byState.map((s) => (
                <div key={s.stateId ?? 'no-state'}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: s.stateColor ?? '#6b7280' }}
                      />
                      <span>{s.stateName ?? 'No state'}</span>
                    </div>
                    <span className="text-gray-500">{s.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', GROUP_COLORS[s.stateGroup ?? ''] ?? 'bg-gray-300')}
                      style={{ width: `${(s.count / maxStateCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* By priority */}
        <ChartCard title="Issues by Priority">
          {byPriority.length === 0 ? (
            <p className="text-sm text-gray-400">No issues yet</p>
          ) : (
            <div className="space-y-3">
              {byPriority.map((p) => (
                <div key={p.priority}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{PRIORITY_LABELS[p.priority] ?? p.priority}</span>
                    <span className="text-gray-500">{p.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', PRIORITY_COLORS[p.priority] ?? 'bg-gray-300')}
                      style={{ width: `${(p.count / maxPriorityCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* By assignee */}
      {byAssignee.length > 0 && (
        <ChartCard title="Issues by Assignee" className="mb-6">
          <div className="space-y-3">
            {byAssignee.map((a) => (
              <div key={a.userId}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                      {(a.userName ?? a.userEmail ?? '?')[0]?.toUpperCase()}
                    </div>
                    <span>{a.userName ?? a.userEmail ?? 'Unknown'}</span>
                  </div>
                  <span className="text-gray-500">{a.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-400"
                    style={{ width: `${(a.count / maxAssigneeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Completion trend */}
      {completionTrend.length > 0 && (
        <ChartCard title="Completed Issues — Last 30 Days">
          <div className="flex items-end gap-1 h-24">
            {completionTrend.map((t) => (
              <div
                key={t.day}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${t.day}: ${t.count} completed`}
              >
                <div
                  className="w-full bg-green-400 rounded-t"
                  style={{ height: `${(t.count / maxTrendCount) * 88}px` }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {completionTrend.reduce((a, t) => a + t.count, 0)} issues completed in the last 30 days
          </p>
        </ChartCard>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-white border rounded-lg p-5', className)}>
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
