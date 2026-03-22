'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

type Label = { id: string; name: string; color: string };
type Props = { labels: Label[]; projectId: string };

export function LabelsManager({ labels, projectId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createLabel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch(`/api/v1/projects/${projectId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Failed to create label');
      return;
    }

    setName('');
    startTransition(() => router.refresh());
  }

  async function deleteLabel(id: string) {
    await fetch(`/api/v1/projects/${projectId}/labels/${id}`, { method: 'DELETE' });
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="space-y-2 mb-6">
        {labels.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-3 p-3 bg-white border rounded-lg"
          >
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: l.color }}
            />
            <span className="font-medium text-sm flex-1">{l.name}</span>
            <button
              onClick={() => deleteLabel(l.id)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {labels.length === 0 && (
          <p className="text-sm text-gray-400">No labels yet.</p>
        )}
      </div>

      <form onSubmit={createLabel} className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label name"
            required
          />
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-10 rounded border cursor-pointer"
        />
        <Button type="submit" disabled={loading} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
