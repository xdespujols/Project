'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssigneeSelector } from '@/components/issues/assignee-selector';
import { SubIssues } from '@/components/issues/sub-issues';
import { cn } from '@/lib/utils';

type State = { id: string; name: string; color: string };
type Label = { id: string; name: string; color: string };
type Activity = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  actorName: string | null;
  createdAt: Date;
};
type Comment = {
  id: string;
  comment: unknown;
  commentText: string | null;
  actorName: string | null;
  createdAt: Date;
};

type Issue = {
  id: string;
  title: string;
  description: unknown;
  descriptionText: string | null;
  priority: string;
  stateId: string | null;
  sequenceId: number;
  dueDate: string | null;
};

type Assignee = { id: string; name: string | null; email: string | null };
type SubIssue = { id: string; title: string; sequenceId: number; priority: string; stateColor?: string | null; stateName?: string | null };

type Props = {
  issue: Issue;
  states: State[];
  labels: Label[];
  activities: Activity[];
  comments: Comment[];
  assignees: Assignee[];
  subIssues: SubIssue[];
  projectId: string;
  workspaceSlug: string;
  currentUserId: string;
};

const PRIORITIES = ['none', 'urgent', 'high', 'medium', 'low'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-400',
  none: 'text-gray-400',
};

export function IssueDetailClient({
  issue,
  states,
  labels,
  activities,
  comments,
  assignees,
  subIssues,
  projectId,
  workspaceSlug,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(issue.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [stateId, setStateId] = useState(issue.stateId || '');
  const [priority, setPriority] = useState(issue.priority);
  const [descJson, setDescJson] = useState<object | null>(
    (issue.description as object) ?? null,
  );
  const [descText, setDescText] = useState(issue.descriptionText ?? '');
  const [savingDesc, setSavingDesc] = useState(false);

  const [commentJson, setCommentJson] = useState<object | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  async function patch(data: Record<string, unknown>) {
    await fetch(`/api/v1/projects/${projectId}/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    startTransition(() => router.refresh());
  }

  async function saveTitle() {
    if (title !== issue.title) await patch({ title });
    setEditingTitle(false);
  }

  async function saveDescription() {
    setSavingDesc(true);
    await patch({ description: descJson, descriptionText: descText });
    setSavingDesc(false);
  }

  async function handleStateChange(val: string) {
    setStateId(val);
    await patch({ stateId: val });
  }

  async function handlePriorityChange(val: string) {
    setPriority(val);
    await patch({ priority: val });
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);

    await fetch(`/api/v1/projects/${projectId}/issues/${issue.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: commentJson, commentText }),
    });

    setCommentJson(null);
    setCommentText('');
    setSubmittingComment(false);
    startTransition(() => router.refresh());
  }

  const currentState = states.find((s) => s.id === stateId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') { setTitle(issue.title); setEditingTitle(false); }
            }}
            className="w-full text-2xl font-bold border-0 border-b-2 border-indigo-400 focus:outline-none pb-1 mb-6"
          />
        ) : (
          <h1
            className="text-2xl font-bold mb-6 cursor-text hover:text-indigo-700 transition-colors"
            onClick={() => setEditingTitle(true)}
          >
            {title}
          </h1>
        )}

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Description
          </h2>
          <RichTextEditor
            content={(descJson ?? undefined) as object | undefined}
            placeholder="Add a description..."
            onChange={(json, text) => { setDescJson(json); setDescText(text); }}
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={saveDescription} disabled={savingDesc}>
              {savingDesc ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Sub-issues */}
        <SubIssues
          parentId={issue.id}
          projectId={projectId}
          workspaceSlug={workspaceSlug}
          subIssues={subIssues}
        />

        {/* Activity */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Activity
          </h2>
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {(a.actorName ?? 'U')[0]?.toUpperCase()}
                </div>
                <div className="text-gray-600">
                  <span className="font-medium text-gray-800">{a.actorName ?? 'Unknown'}</span>{' '}
                  {a.field === 'issue' && a.newValue === 'created'
                    ? 'created this issue'
                    : <>updated <span className="font-medium">{a.field}</span>
                        {a.oldValue && <> from <span className="line-through text-gray-400">"{a.oldValue}"</span></>}
                        {a.newValue && <> to "<span className="font-medium">{a.newValue}</span>"</>}
                      </>}
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-gray-400">No activity yet.</p>
            )}
          </div>
        </div>

        {/* Comments */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Comments
          </h2>

          <div className="space-y-4 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  {(c.actorName ?? 'U')[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{c.actorName ?? 'Unknown'}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    {c.commentText || '(empty)'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitComment}>
            <RichTextEditor
              placeholder="Write a comment..."
              onChange={(json, text) => { setCommentJson(json); setCommentText(text); }}
            />
            <div className="flex justify-end mt-2">
              <Button type="submit" size="sm" disabled={submittingComment || !commentText.trim()}>
                {submittingComment ? 'Posting...' : 'Comment'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l bg-gray-50 p-4 overflow-y-auto flex-shrink-0">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Status
            </label>
            <Select value={stateId} onValueChange={handleStateChange}>
              <SelectTrigger className="h-8 text-sm">
                <div className="flex items-center gap-2">
                  {currentState && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: currentState.color }}
                    />
                  )}
                  <SelectValue placeholder="No state" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Priority
            </label>
            <Select value={priority} onValueChange={handlePriorityChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className={cn('capitalize', PRIORITY_COLORS[p])}>{p === 'none' ? 'No priority' : p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Assignees
            </label>
            <AssigneeSelector
              projectId={projectId}
              issueId={issue.id}
              workspaceSlug={workspaceSlug}
              initialAssignees={assignees}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Created
            </label>
            <p className="text-sm text-gray-600">
              {new Date(issue.dueDate ?? Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
