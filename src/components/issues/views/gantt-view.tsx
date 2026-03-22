'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Issue = {
  id: string;
  title: string;
  stateId: string | null;
  sequenceId: number;
  startDate: string | null;
  dueDate: string | null;
  priority: string;
};
type State = { id: string; name: string; color: string };

type Props = {
  issues: Issue[];
  states: State[];
  projectId: string;
  workspaceSlug: string;
};

const DAY_WIDTH = 28; // px per day
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 260;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatMonth(date: Date) {
  return date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
  none: 'bg-indigo-500',
};

export function GanttView({ issues, states, projectId, workspaceSlug }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewStart, setViewStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 14);
    return d;
  });

  const totalDays = 90;
  const viewEnd = addDays(viewStart, totalDays);

  const stateMap = new Map(states.map((s) => [s.id, s]));

  const months = useMemo(() => {
    const result: { label: string; offsetDays: number; span: number }[] = [];
    let d = new Date(viewStart);
    while (d < viewEnd) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const clampedStart = d > monthStart ? d : monthStart;
      const clampedEnd = monthEnd < viewEnd ? monthEnd : viewEnd;
      result.push({
        label: formatMonth(d),
        offsetDays: daysBetween(viewStart, clampedStart),
        span: daysBetween(clampedStart, clampedEnd) + 1,
      });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return result;
  }, [viewStart, viewEnd]);

  const issuesWithDates = issues.filter((i) => i.startDate || i.dueDate);
  const issuesWithoutDates = issues.filter((i) => !i.startDate && !i.dueDate);

  function shift(days: number) {
    setViewStart((prev) => addDays(prev, days));
  }

  const todayOffset = daysBetween(viewStart, today);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-white flex-shrink-0">
        <button onClick={() => shift(-30)} className="p-1 rounded hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={() => setViewStart(() => { const d = new Date(today); d.setDate(d.getDate() - 14); return d; })}
          className="text-xs px-3 py-1 border rounded hover:bg-gray-50">Today</button>
        <button onClick={() => shift(30)} className="p-1 rounded hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
        <span className="text-sm text-gray-500 ml-2">{formatMonth(viewStart)} – {formatMonth(viewEnd)}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}>
          {/* Frozen label column */}
          <div className="flex-shrink-0 sticky left-0 z-20 bg-white" style={{ width: LABEL_WIDTH }}>
            {/* Month header placeholder */}
            <div className="h-8 border-b border-r bg-gray-50" />
            {/* Day header placeholder */}
            <div className="h-8 border-b border-r bg-gray-50" />
            {/* Issue labels */}
            {issuesWithDates.map((issue) => {
              const state = issue.stateId ? stateMap.get(issue.stateId) : null;
              return (
                <div key={issue.id} className="flex items-center gap-2 px-3 border-b border-r" style={{ height: ROW_HEIGHT }}>
                  {state && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: state.color }} />}
                  <Link
                    href={`/${workspaceSlug}/projects/${projectId}/issues/${issue.id}`}
                    className="text-sm truncate hover:text-indigo-600"
                  >
                    {issue.title}
                  </Link>
                </div>
              );
            })}
            {issuesWithoutDates.length > 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 border-t border-r">
                {issuesWithoutDates.length} issues without dates
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="flex-1">
            {/* Month row */}
            <div className="flex h-8 border-b bg-gray-50">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="border-r flex items-center px-2 text-xs font-semibold text-gray-600 overflow-hidden"
                  style={{ width: m.span * DAY_WIDTH }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Day numbers row */}
            <div className="flex h-8 border-b bg-gray-50">
              {Array.from({ length: totalDays }, (_, i) => {
                const d = addDays(viewStart, i);
                const isToday = i === todayOffset;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={cn(
                      'border-r flex items-center justify-center text-xs flex-shrink-0',
                      isToday && 'bg-indigo-500 text-white font-bold',
                      !isToday && isWeekend && 'bg-gray-100 text-gray-400',
                      !isToday && !isWeekend && 'text-gray-400',
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Issue bars */}
            {issuesWithDates.map((issue) => {
              const start = issue.startDate ? new Date(issue.startDate) : null;
              const end = issue.dueDate ? new Date(issue.dueDate) : start;
              const barStart = start ? Math.max(0, daysBetween(viewStart, start)) : null;
              const barEnd = end ? Math.min(totalDays - 1, daysBetween(viewStart, end)) : barStart;
              const barWidth = barStart != null && barEnd != null ? Math.max(1, barEnd - barStart + 1) * DAY_WIDTH : 0;
              const barLeft = (barStart ?? 0) * DAY_WIDTH;

              return (
                <div
                  key={issue.id}
                  className="relative border-b flex items-center"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Weekend shading */}
                  {Array.from({ length: totalDays }, (_, i) => {
                    const d = addDays(viewStart, i);
                    if (d.getDay() !== 0 && d.getDay() !== 6) return null;
                    return <div key={i} className="absolute bg-gray-50" style={{ left: i * DAY_WIDTH, width: DAY_WIDTH, height: '100%' }} />;
                  })}

                  {/* Today marker */}
                  {todayOffset >= 0 && todayOffset < totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-indigo-400 opacity-50 z-10"
                      style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                    />
                  )}

                  {/* Bar */}
                  {barStart != null && barWidth > 0 && (
                    <div
                      className={cn(
                        'absolute h-5 rounded-full opacity-90 flex items-center px-2 z-20',
                        PRIORITY_COLORS[issue.priority],
                      )}
                      style={{ left: barLeft, width: barWidth }}
                      title={`${issue.title} (${issue.startDate || '?'} → ${issue.dueDate || '?'})`}
                    >
                      {barWidth > 48 && (
                        <span className="text-white text-xs truncate font-medium">{issue.title}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
