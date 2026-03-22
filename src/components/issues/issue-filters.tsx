'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

type State = { id: string; name: string; color: string };
type Label = { id: string; name: string; color: string };

type Props = {
  states: State[];
  labels: Label[];
};

export function IssueFilters({ states, labels }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const stateFilter = searchParams.get('state') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const labelFilter = searchParams.get('label') || '';

  const hasFilters = stateFilter || priorityFilter || labelFilter;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={stateFilter} onValueChange={(v) => setParam('state', v === '__all' ? null : v)}>
        <SelectTrigger className="h-8 text-xs w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All statuses</SelectItem>
          {states.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priorityFilter} onValueChange={(v) => setParam('priority', v === '__all' ? null : v)}>
        <SelectTrigger className="h-8 text-xs w-32">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All priorities</SelectItem>
          {['urgent', 'high', 'medium', 'low', 'none'].map((p) => (
            <SelectItem key={p} value={p} className="capitalize">{p === 'none' ? 'No priority' : p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {labels.length > 0 && (
        <Select value={labelFilter} onValueChange={(v) => setParam('label', v === '__all' ? null : v)}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue placeholder="Label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All labels</SelectItem>
            {labels.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            const params = new URLSearchParams();
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded border"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );
}
