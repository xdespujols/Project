'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ChevronDown, ChevronRight, Circle } from 'lucide-react';

type SubIssue = {
  id: string;
  title: string;
  sequenceId: number;
  priority: string;
  stateColor?: string | null;
  stateName?: string | null;
};

type Props = {
  parentId: string;
  projectId: string;
  workspaceSlug: string;
  subIssues: SubIssue[];
};

export function SubIssues({ parentId, projectId, workspaceSlug, subIssues }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  async function createSubIssue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/v1/projects/${projectId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, parentId }),
    });
    setLoading(false);
    setTitle('');
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <div
        className="flex items-center gap-2 cursor-pointer select-none mb-2"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Sub-issues ({subIssues.length})
        </h2>
      </div>

      {expanded && (
        <div className="space-y-1">
          {subIssues.map((sub) => (
            <Link
              key={sub.id}
              href={`/${workspaceSlug}/projects/${projectId}/issues/${sub.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 text-sm"
            >
              {sub.stateColor ? (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.stateColor }} />
              ) : (
                <Circle className="h-3.5 w-3.5 text-gray-300" />
              )}
              <span className="text-gray-400 text-xs">#{sub.sequenceId}</span>
              <span className="flex-1">{sub.title}</span>
            </Link>
          ))}

          {adding ? (
            <form onSubmit={createSubIssue} className="flex gap-2 px-3 py-1">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sub-issue title"
                className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setTitle(''); }}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add sub-issue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
