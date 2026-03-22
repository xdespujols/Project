'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type Issue = {
  id: string;
  title: string;
  priority: string;
  stateId: string | null;
  sequenceId: number;
  createdAt: Date;
  dueDate: string | null;
  startDate: string | null;
};
type State = { id: string; name: string; color: string };

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3, none: 4,
};

type CellProps = {
  issue: Issue;
  projectId: string;
  states: State[];
  onUpdate: (id: string, field: string, value: unknown) => Promise<void>;
};

function TitleCell({ issue, projectId, onUpdate }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(issue.title);

  async function save() {
    if (value !== issue.title) await onUpdate(issue.id, 'title', value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(issue.title); setEditing(false); } }}
        className="w-full border-0 border-b-2 border-indigo-400 focus:outline-none bg-transparent text-sm"
      />
    );
  }

  return (
    <span
      className="cursor-text hover:text-indigo-600 text-sm block truncate"
      onClick={() => setEditing(true)}
    >
      {issue.title}
    </span>
  );
}

function PriorityCell({ issue, onUpdate }: CellProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={issue.priority}
        onBlur={() => setEditing(false)}
        onChange={async (e) => { await onUpdate(issue.id, 'priority', e.target.value); setEditing(false); }}
        className="text-xs border rounded px-1 py-0.5 focus:outline-none bg-white"
      >
        {['none', 'urgent', 'high', 'medium', 'low'].map((p) => (
          <option key={p} value={p}>{p === 'none' ? 'No priority' : p}</option>
        ))}
      </select>
    );
  }

  const colors: Record<string, string> = {
    urgent: 'text-red-600 bg-red-50', high: 'text-orange-500 bg-orange-50',
    medium: 'text-yellow-600 bg-yellow-50', low: 'text-blue-500 bg-blue-50',
    none: 'text-gray-400 bg-gray-50',
  };

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize cursor-pointer', colors[issue.priority])}
    >
      {issue.priority === 'none' ? '–' : issue.priority}
    </span>
  );
}

function StateCell({ issue, states, onUpdate }: CellProps) {
  const [editing, setEditing] = useState(false);
  const state = states.find((s) => s.id === issue.stateId);

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={issue.stateId || ''}
        onBlur={() => setEditing(false)}
        onChange={async (e) => { await onUpdate(issue.id, 'stateId', e.target.value || null); setEditing(false); }}
        className="text-xs border rounded px-1 py-0.5 focus:outline-none bg-white"
      >
        <option value="">No state</option>
        {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 cursor-pointer group"
    >
      {state ? (
        <>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: state.color }} />
          <span className="text-xs text-gray-700">{state.name}</span>
        </>
      ) : (
        <span className="text-xs text-gray-400">No state</span>
      )}
    </div>
  );
}

function DateCell({ value, field, issueId, onUpdate }: { value: string | null; field: string; issueId: string; onUpdate: (id: string, f: string, v: unknown) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={async () => { await onUpdate(issueId, field, val || null); setEditing(false); }}
        className="text-xs border rounded px-1 py-0.5 focus:outline-none"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="text-xs text-gray-500 cursor-pointer hover:text-gray-800"
    >
      {value || '–'}
    </span>
  );
}

const columnHelper = createColumnHelper<Issue>();

type Props = {
  issues: Issue[];
  states: State[];
  projectId: string;
  workspaceSlug: string;
};

export function SpreadsheetView({ issues: initialIssues, states, projectId, workspaceSlug }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initialIssues);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const updateIssue = useCallback(async (id: string, field: string, value: unknown) => {
    setData((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } as Issue : i));
    await fetch(`/api/v1/projects/${projectId}/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }, [projectId]);

  const columns = [
    columnHelper.accessor('sequenceId', {
      header: '#',
      size: 48,
      cell: (info) => <span className="text-xs text-gray-400">{info.getValue()}</span>,
    }),
    columnHelper.accessor('title', {
      header: 'Title',
      size: 320,
      cell: (info) => (
        <TitleCell
          issue={info.row.original}
          projectId={projectId}
          states={states}
          onUpdate={updateIssue}
        />
      ),
    }),
    columnHelper.accessor('stateId', {
      header: 'Status',
      size: 140,
      cell: (info) => (
        <StateCell
          issue={info.row.original}
          projectId={projectId}
          states={states}
          onUpdate={updateIssue}
        />
      ),
      sortingFn: (a, b) => {
        const sa = states.findIndex((s) => s.id === a.original.stateId);
        const sb = states.findIndex((s) => s.id === b.original.stateId);
        return sa - sb;
      },
    }),
    columnHelper.accessor('priority', {
      header: 'Priority',
      size: 110,
      cell: (info) => (
        <PriorityCell
          issue={info.row.original}
          projectId={projectId}
          states={states}
          onUpdate={updateIssue}
        />
      ),
      sortingFn: (a, b) =>
        (PRIORITY_ORDER[a.original.priority] ?? 99) - (PRIORITY_ORDER[b.original.priority] ?? 99),
    }),
    columnHelper.accessor('startDate', {
      header: 'Start date',
      size: 110,
      cell: (info) => (
        <DateCell
          value={info.getValue()}
          field="startDate"
          issueId={info.row.original.id}
          onUpdate={updateIssue}
        />
      ),
    }),
    columnHelper.accessor('dueDate', {
      header: 'Due date',
      size: 110,
      cell: (info) => (
        <DateCell
          value={info.getValue()}
          field="dueDate"
          issueId={info.row.original.id}
          onUpdate={updateIssue}
        />
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      size: 110,
      cell: (info) => (
        <span className="text-xs text-gray-400">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 py-3 border-b bg-white">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search issues..."
          className="w-72 text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 select-none"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn('flex items-center gap-1', header.column.getCanSort() && 'cursor-pointer hover:text-gray-800')}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          header.column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> :
                          header.column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> :
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2.5"
                    style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400 text-sm">
                  No issues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
