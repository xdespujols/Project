import { auth } from '../../../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { issues, states, issueActivities, issueComments, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: Promise<{ workspaceSlug: string; projectId: string; issueId: string }>;
};

const PRIORITY_LABELS: Record<string, string> = {
  none: 'No priority',
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_COLORS: Record<string, string> = {
  none: 'text-gray-400',
  urgent: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-400',
};

export default async function IssueDetailPage({ params }: Props) {
  const { workspaceSlug, projectId, issueId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [issue] = await db
    .select()
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);

  if (!issue) notFound();

  const [state] = issue.stateId
    ? await db.select().from(states).where(eq(states.id, issue.stateId)).limit(1)
    : [null];

  const activities = await db
    .select()
    .from(issueActivities)
    .where(eq(issueActivities.issueId, issueId))
    .orderBy(issueActivities.createdAt);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        href={`/${workspaceSlug}/projects/${projectId}/issues`}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Issues
      </Link>

      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start gap-4 mb-4">
          {state && (
            <span
              className="mt-1 w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: state.color }}
            />
          )}
          <h1 className="text-xl font-bold">{issue.title}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span className="font-medium">{state?.name || 'No state'}</span>
          </div>
          <div>
            <span className="text-gray-500">Priority:</span>{' '}
            <span className={`font-medium ${PRIORITY_COLORS[issue.priority]}`}>
              {PRIORITY_LABELS[issue.priority]}
            </span>
          </div>
          {issue.dueDate && (
            <div>
              <span className="text-gray-500">Due date:</span>{' '}
              <span className="font-medium">{issue.dueDate}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Created:</span>{' '}
            <span className="font-medium">
              {new Date(issue.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {issue.descriptionText && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{issue.descriptionText}</p>
          </div>
        )}

        {activities.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Activity</h2>
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="text-xs text-gray-500">
                  <span className="font-medium">Updated</span> {activity.field}
                  {activity.oldValue && ` from "${activity.oldValue}"`}
                  {activity.newValue && ` to "${activity.newValue}"`}
                  <span className="ml-2 text-gray-400">
                    {new Date(activity.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
