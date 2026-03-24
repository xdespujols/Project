'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck, Trash2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SavedView = {
  id: string;
  name: string;
  filters: Record<string, string>;
  isShared: boolean;
  createdBy: string;
};

type ActiveFilters = {
  state?: string;
  priority?: string;
  label?: string;
};

type Props = {
  projectId: string;
  workspaceSlug: string;
  activeFilters: ActiveFilters;
};

function filtersToParams(filters: Record<string, string>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) p.set(k, v);
  }
  return p.toString();
}

function activeFiltersToRecord(filters: ActiveFilters): Record<string, string> {
  const rec: Record<string, string> = {};
  if (filters.state) rec.state = filters.state;
  if (filters.priority) rec.priority = filters.priority;
  if (filters.label) rec.label = filters.label;
  return rec;
}

export function SavedViewsBar({ projectId, workspaceSlug, activeFilters }: Props) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  useEffect(() => {
    fetch(`/api/v1/projects/${projectId}/views`)
      .then((r) => r.json())
      .then((json) => setViews(json.data ?? []));
  }, [projectId]);

  async function saveView() {
    if (!newName.trim()) return;
    const filters = activeFiltersToRecord(activeFilters);
    startTransition(async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, filters }),
      });
      const json = await res.json();
      if (res.ok) {
        setViews((prev) => [json.data, ...prev]);
        setNewName('');
        setShowSaveForm(false);
      }
    });
  }

  async function deleteView(id: string) {
    startTransition(async () => {
      await fetch(`/api/v1/projects/${projectId}/views/${id}`, { method: 'DELETE' });
      setViews((prev) => prev.filter((v) => v.id !== id));
    });
  }

  function applyView(view: SavedView) {
    const qs = filtersToParams(view.filters);
    router.push(`/${workspaceSlug}/projects/${projectId}/issues${qs ? `?${qs}` : ''}`);
  }

  if (views.length === 0 && !hasActiveFilters) return null;

  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b bg-gray-50 flex-wrap">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Views</span>

      {views.map((view) => {
        const qs = filtersToParams(view.filters);
        const currentQs = filtersToParams(activeFiltersToRecord(activeFilters));
        const isActive = qs === currentQs && qs !== '';

        return (
          <div key={view.id} className="flex items-center group">
            <button
              onClick={() => applyView(view)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-l border transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-gray-200 hover:border-indigo-300',
              )}
            >
              {isActive ? (
                <BookmarkCheck className="h-3 w-3" />
              ) : (
                <Bookmark className="h-3 w-3" />
              )}
              {view.name}
              {view.isShared && <Share2 className="h-3 w-3 opacity-60" />}
            </button>
            <button
              onClick={() => deleteView(view.id)}
              disabled={isPending}
              className={cn(
                'px-1.5 py-1 text-xs border border-l-0 rounded-r transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100',
              )}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {hasActiveFilters && (
        <>
          {showSaveForm ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveView()}
                placeholder="View name…"
                autoFocus
                className="border rounded px-2 py-0.5 text-xs w-32"
              />
              <button
                onClick={saveView}
                disabled={isPending || !newName.trim()}
                className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => { setShowSaveForm(false); setNewName(''); }}
                className="px-2 py-0.5 text-xs border rounded hover:bg-gray-100"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs border border-dashed rounded border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
            >
              <Bookmark className="h-3 w-3" />
              Save current filters as view
            </button>
          )}
        </>
      )}
    </div>
  );
}
