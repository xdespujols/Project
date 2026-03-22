'use client';

import { useState, useCallback, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

type Issue = {
  id: string;
  title: string;
  priority: string;
  stateId: string | null;
  sequenceId: number;
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
  none: 'bg-gray-100 text-gray-500',
};

function IssueCard({
  issue,
  workspaceSlug,
  projectId,
  isDragging,
}: {
  issue: Issue;
  workspaceSlug: string;
  projectId: string;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: issue.id,
    data: { type: 'issue', issue },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white border rounded-lg p-3 cursor-grab shadow-sm select-none',
        'hover:shadow-md transition-shadow',
        isDragging && 'opacity-50',
      )}
    >
      <Link
        href={`/${workspaceSlug}/projects/${projectId}/issues/${issue.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block text-sm font-medium text-gray-900 hover:text-indigo-600 mb-2"
      >
        {issue.title}
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">#{issue.sequenceId}</span>
        {issue.priority !== 'none' && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium capitalize',
              PRIORITY_COLORS[issue.priority],
            )}
          >
            {issue.priority}
          </span>
        )}
        {issue.dueDate && (
          <span className="text-xs text-gray-400 ml-auto">{issue.dueDate}</span>
        )}
      </div>
    </div>
  );
}

function StateColumn({
  state,
  issues,
  workspaceSlug,
  projectId,
}: {
  state: State;
  issues: Issue[];
  workspaceSlug: string;
  projectId: string;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: `col-${state.id}`,
    data: { type: 'column', stateId: state.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 flex-shrink-0 bg-gray-50 rounded-xl',
        isOver && 'bg-indigo-50',
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: state.color }}
        />
        <span className="text-sm font-semibold text-gray-700">{state.name}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
          {issues.length}
        </span>
      </div>

      {/* Issue cards */}
      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-3 pb-3 min-h-[100px]">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              workspaceSlug={workspaceSlug}
              projectId={projectId}
            />
          ))}
          {issues.length === 0 && (
            <div className="flex-1 min-h-[80px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function BoardView({ issues, states, workspaceSlug, projectId }: Props) {
  const router = useRouter();
  const [issueStates, setIssueStates] = useState<Record<string, string | null>>(
    Object.fromEntries(issues.map((i) => [i.id, i.stateId])),
  );
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const issuesByState = (stateId: string) =>
    issues
      .filter((i) => (issueStates[i.id] ?? null) === stateId)
      .sort((a, b) => a.sequenceId - b.sequenceId);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === 'issue') setActiveIssue(data.issue);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const issueId = active.id as string;
    const overId = over.id as string;

    // Determine target stateId
    let targetStateId: string | null = null;

    if (overId.startsWith('col-')) {
      targetStateId = overId.replace('col-', '');
    } else {
      // Dropped on another issue — get its stateId
      const targetIssue = issues.find((i) => i.id === overId);
      if (targetIssue) {
        targetStateId = issueStates[targetIssue.id] ?? null;
      }
    }

    if (targetStateId === null) return;
    if (issueStates[issueId] === targetStateId) return;

    // Optimistic update
    setIssueStates((prev) => ({ ...prev, [issueId]: targetStateId }));

    // Persist
    const res = await fetch(`/api/v1/projects/${projectId}/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stateId: targetStateId }),
    });

    if (!res.ok) {
      // Roll back
      setIssueStates((prev) => ({ ...prev, [issueId]: issues.find((i) => i.id === issueId)?.stateId ?? null }));
    }
  }

  const columns = states.map((s) => ({ ...s, colId: `col-${s.id}` }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columns.map((c) => c.colId)} strategy={verticalListSortingStrategy}>
        <div className="flex gap-4 p-6 overflow-x-auto h-full items-start">
          {columns.map((state) => (
            <StateColumn
              key={state.id}
              state={state}
              issues={issuesByState(state.id)}
              workspaceSlug={workspaceSlug}
              projectId={projectId}
            />
          ))}

          {states.length === 0 && (
            <div className="text-gray-400 text-sm">No states configured for this project.</div>
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeIssue && (
          <IssueCard
            issue={activeIssue}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
