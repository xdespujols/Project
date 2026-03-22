'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

type Issue = { id: string; title: string; sequenceId: number };

type Props = {
  moduleId: string;
  unassignedIssues: Issue[];
};

export function ModuleIssueManager({ moduleId, unassignedIssues }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function addIssue(issueId: string) {
    setLoading(issueId);
    await fetch(`/api/v1/projects/unknown/modules/${moduleId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueId }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 mb-3">Add issues</h2>
      {unassignedIssues.length === 0 ? (
        <p className="text-xs text-gray-400">All issues are in this module.</p>
      ) : (
        <div className="space-y-1">
          {unassignedIssues.map((issue) => (
            <div key={issue.id} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs w-8">#{issue.sequenceId}</span>
              <span className="flex-1 truncate text-xs">{issue.title}</span>
              <button
                onClick={() => addIssue(issue.id)}
                disabled={loading === issue.id}
                className="text-gray-400 hover:text-indigo-600"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
