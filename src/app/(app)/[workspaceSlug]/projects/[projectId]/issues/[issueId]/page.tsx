import { auth } from '../../../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import {
  issues,
  states,
  issueActivities,
  issueComments,
  issueAssignees,
  users,
  labels,
} from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { IssueDetailClient } from './issue-detail-client';
import { SubIssues } from '@/components/issues/sub-issues';

type Props = {
  params: Promise<{ workspaceSlug: string; projectId: string; issueId: string }>;
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

  const projectStates = await db
    .select()
    .from(states)
    .where(eq(states.projectId, projectId))
    .orderBy(states.sequence);

  const projectLabels = await db
    .select()
    .from(labels)
    .where(eq(labels.projectId, projectId));

  const activities = await db
    .select({
      id: issueActivities.id,
      field: issueActivities.field,
      oldValue: issueActivities.oldValue,
      newValue: issueActivities.newValue,
      actorId: issueActivities.actorId,
      createdAt: issueActivities.createdAt,
      actorName: users.name,
    })
    .from(issueActivities)
    .leftJoin(users, eq(issueActivities.actorId, users.id))
    .where(eq(issueActivities.issueId, issueId))
    .orderBy(issueActivities.createdAt);

  const comments = await db
    .select({
      id: issueComments.id,
      comment: issueComments.comment,
      commentText: issueComments.commentText,
      actorId: issueComments.actorId,
      createdAt: issueComments.createdAt,
      actorName: users.name,
    })
    .from(issueComments)
    .leftJoin(users, eq(issueComments.actorId, users.id))
    .where(eq(issueComments.issueId, issueId))
    .orderBy(issueComments.createdAt);

  const assignees = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(issueAssignees)
    .innerJoin(users, eq(issueAssignees.userId, users.id))
    .where(eq(issueAssignees.issueId, issueId));

  const subIssueRows = await db
    .select({
      id: issues.id,
      title: issues.title,
      sequenceId: issues.sequenceId,
      priority: issues.priority,
      stateId: issues.stateId,
      stateColor: states.color,
      stateName: states.name,
    })
    .from(issues)
    .leftJoin(states, eq(issues.stateId, states.id))
    .where(and(eq(issues.parentId, issueId), eq(issues.projectId, projectId)));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Link
          href={`/${workspaceSlug}/projects/${projectId}/issues`}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm text-gray-500">
          Issues / #{issue.sequenceId}
        </span>
      </div>

      <IssueDetailClient
        issue={issue}
        states={projectStates}
        labels={projectLabels}
        activities={activities}
        comments={comments}
        assignees={assignees}
        subIssues={subIssueRows}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
        currentUserId={session.user.id}
      />
    </div>
  );
}
