'use client';

import Link from 'next/link';
import { Calendar, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Cycle = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  issueCount?: number;
  completedCount?: number;
};

type Props = {
  cycle: Cycle;
  workspaceSlug: string;
  projectId: string;
};

function getStatus(startDate: string | null, endDate: string | null) {
  const now = new Date();
  if (!startDate && !endDate) return { label: 'No dates', color: 'bg-gray-200 text-gray-600' };
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (end && now > end) return { label: 'Completed', color: 'bg-green-100 text-green-700' };
  if (start && now < start) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
  return { label: 'Active', color: 'bg-amber-100 text-amber-700' };
}

export function CycleCard({ cycle, workspaceSlug, projectId }: Props) {
  const status = getStatus(cycle.startDate, cycle.endDate);
  const total = cycle.issueCount ?? 0;
  const done = cycle.completedCount ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      href={`/${workspaceSlug}/projects/${projectId}/cycles/${cycle.id}`}
      className="block border rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{cycle.name}</h3>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.color)}>
          {status.label}
        </span>
      </div>

      {cycle.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{cycle.description}</p>
      )}

      {(cycle.startDate || cycle.endDate) && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Calendar className="h-3.5 w-3.5" />
          {cycle.startDate || '–'} → {cycle.endDate || '–'}
        </div>
      )}

      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{done}/{total} issues</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="text-xs text-gray-400">No issues assigned</p>
      )}
    </Link>
  );
}
