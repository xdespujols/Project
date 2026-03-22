'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import Link from 'next/link';

type SearchResult = {
  id: string;
  title: string;
  sequenceId: number;
  priority: string;
  stateColor?: string | null;
  stateName?: string | null;
};

export function IssueSearch({
  projectId,
  workspaceSlug,
}: {
  projectId: string;
  workspaceSlug: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) { setResults([]); return; }
      setLoading(true);
      const res = await fetch(
        `/api/v1/projects/${projectId}/search?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      setResults(data.data ?? []);
      setLoading(false);
    },
    [projectId],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  }

  function clear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search issues…"
          className="pl-9 pr-8 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 w-64"
        />
        {query && (
          <button onClick={clear} className="absolute right-2 text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 w-96 bg-white border rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No results for "{query}"</div>
          )}
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/${workspaceSlug}/projects/${projectId}/issues/${r.id}`}
              onClick={clear}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm"
            >
              {r.stateColor ? (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.stateColor }} />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
              )}
              <span className="text-gray-400 text-xs">#{r.sequenceId}</span>
              <span className="flex-1 truncate">{r.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
