'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Issue = {
  id: string;
  title: string;
  sequenceId: number;
  priority: string;
  stateColor?: string | null;
  stateName?: string | null;
};

type Props = {
  epicId: string;
  projectId: string;
  workspaceSlug: string;
  issues: Issue[];
};

export function EpicIssueManager({ epicId, projectId, workspaceSlug, issues }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [issueId, setIssueId] = useState('');
  const [loading, setLoading] = useState(false);

  async function addIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueId.trim()) return;
    setLoading(true);
    await fetch(`/api/v1/projects/${projectId}/epics/${epicId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueId: issueId.trim() }),
    });
    setLoading(false);
    setAdding(false);
    setIssueId('');
    router.refresh();
  }

  async function removeIssue(id: string) {
    await fetch(`/api/v1/projects/${projectId}/epics/${epicId}/issues`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueId: id }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Issues ({issues.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Issue
        </Button>
      </div>

      {adding && (
        <form onSubmit={addIssue} className="flex gap-2 mb-3">
          <input
            autoFocus
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            placeholder="Issue ID (UUID)"
            className="flex-1 text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <Button size="sm" type="submit" disabled={loading}>Add</Button>
          <Button size="sm" type="button" variant="outline" onClick={() => { setAdding(false); setIssueId(''); }}>
            Cancel
          </Button>
        </form>
      )}

      <div className="space-y-1">
        {issues.map((issue) => (
          <div key={issue.id} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 group">
            {issue.stateColor ? (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: issue.stateColor }} />
            ) : (
              <Circle className="h-3.5 w-3.5 text-gray-300" />
            )}
            <span className="text-gray-400 text-xs">#{issue.sequenceId}</span>
            <Link
              href={`/${workspaceSlug}/projects/${projectId}/issues/${issue.id}`}
              className="flex-1 text-sm hover:text-indigo-600"
            >
              {issue.title}
            </Link>
            <button
              onClick={() => removeIssue(issue.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {issues.length === 0 && (
          <p className="text-sm text-gray-400 px-3 py-2">No issues in this epic yet.</p>
        )}
      </div>
    </div>
  );
}
