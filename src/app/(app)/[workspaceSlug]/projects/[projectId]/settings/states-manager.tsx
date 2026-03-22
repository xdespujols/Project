'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

type State = {
  id: string;
  name: string;
  color: string;
  group: string;
  sequence: number;
};

const STATE_GROUPS = ['backlog', 'unstarted', 'started', 'completed', 'cancelled'] as const;
const GROUP_COLORS: Record<string, string> = {
  backlog: 'text-gray-500',
  unstarted: 'text-indigo-500',
  started: 'text-amber-500',
  completed: 'text-green-500',
  cancelled: 'text-red-500',
};

type Props = { states: State[]; projectId: string };

export function StatesManager({ states, projectId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [group, setGroup] = useState<string>('unstarted');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createState(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch(`/api/v1/projects/${projectId}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, group, sequence: states.length }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Failed to create state');
      return;
    }

    setName('');
    startTransition(() => router.refresh());
  }

  async function deleteState(id: string) {
    await fetch(`/api/v1/projects/${projectId}/states/${id}`, { method: 'DELETE' });
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="space-y-2 mb-6">
        {states.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 p-3 bg-white border rounded-lg"
          >
            <input
              type="color"
              value={s.color}
              className="w-6 h-6 rounded cursor-pointer border-0"
              onChange={async (e) => {
                await fetch(`/api/v1/projects/${projectId}/states/${s.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ color: e.target.value }),
                });
                startTransition(() => router.refresh());
              }}
            />
            <span className="font-medium text-sm flex-1">{s.name}</span>
            <span className={`text-xs capitalize ${GROUP_COLORS[s.group]}`}>{s.group}</span>
            <button
              onClick={() => deleteState(s.id)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={createState} className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New state name"
            required
          />
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-10 rounded border cursor-pointer"
        />
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATE_GROUPS.map((g) => (
              <SelectItem key={g} value={g} className="capitalize">
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={loading} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
