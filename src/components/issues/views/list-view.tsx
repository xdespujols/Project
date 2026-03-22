'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type Issue = {
  id: string;
  title: string;
  priority: string;
  stateId: string | null;
  sequenceId: number;
  createdAt: Date;
  dueDate: string | null;
};

type State = {
  id: string;
  name: string;
  color: string;
  group: string;
};

type Props = {
  issues: Issue[];
  states: State[];
  workspaceSlug: string;
  projectId: string;
};

const PRIORITY_ICONS: Record<string, { label: string; color: string }> = {
  none: { label: '–', color: 'text-gray-400' },
  urgent: { label: '!', color: 'text-red-600' },
  high: { label: '↑', color: 'text-orange-500' },
  medium: { label: '→', color: 'text-yellow-500' },
  low: { label: '↓', color: 'text-blue-400' },
};

export function IssueListView({ issues, states, workspaceSlug, projectId }: Props) {
  const stateMap = new Map(states.map((s) => [s.id, s]));

  if (issues.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        No issues yet. Create the first one!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-4 py-2 w-8">#</th>
            <th className="text-left px-4 py-2">Title</th>
            <th className="text-left px-4 py-2 w-32">Status</th>
            <th className="text-left px-4 py-2 w-24">Priority</th>
            <th className="text-left px-4 py-2 w-28">Due date</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => {
            const state = issue.stateId ? stateMap.get(issue.stateId) : null;
            const priority = PRIORITY_ICONS[issue.priority] || PRIORITY_ICONS.none;

            return (
              <tr
                key={issue.id}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2.5 text-gray-400">{issue.sequenceId}</td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/${workspaceSlug}/projects/${projectId}/issues/${issue.id}`}
                    className="hover:text-indigo-600 font-medium"
                  >
                    {issue.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  {state ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: state.color }}
                      />
                      <span className="text-gray-700">{state.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">No state</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn('font-medium', priority.color)}>{priority.label}</span>
                  <span className="ml-1 text-gray-500 capitalize">{issue.priority}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {issue.dueDate || '–'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
