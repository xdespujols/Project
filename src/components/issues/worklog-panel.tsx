'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Worklog = {
  id: string;
  duration: number; // minutes
  description: string | null;
  loggedAt: Date;
  userName: string | null;
  userEmail: string | null;
};

type Props = {
  issueId: string;
  projectId: string;
  worklogs: Worklog[];
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function WorklogPanel({ issueId, projectId, worklogs }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const totalMinutes = worklogs.reduce((sum, w) => sum + w.duration, 0);

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    const duration = (parseInt(hours || '0') * 60) + parseInt(minutes || '0');
    if (duration <= 0) return;
    setLoading(true);
    await fetch(`/api/v1/projects/${projectId}/issues/${issueId}/worklogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration, description: description || undefined }),
    });
    setLoading(false);
    setAdding(false);
    setHours('');
    setMinutes('');
    setDescription('');
    router.refresh();
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Time Tracked
          {totalMinutes > 0 && (
            <span className="text-indigo-600 ml-1">{formatDuration(totalMinutes)}</span>
          )}
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Log time
        </button>
      </div>

      {adding && (
        <form onSubmit={submitLog} className="border rounded-lg p-3 mb-3 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Hours</label>
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Minutes</label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on? (optional)"
            className="h-8 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" type="button" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={loading || (!hours && !minutes)}>
              {loading ? 'Saving…' : 'Log'}
            </Button>
          </div>
        </form>
      )}

      {worklogs.length > 0 && (
        <div className="space-y-1">
          {worklogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 text-sm py-1.5 border-b last:border-0">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                {(log.userName ?? log.userEmail ?? 'U')[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-indigo-600">{formatDuration(log.duration)}</span>
                  <span className="text-xs text-gray-400">
                    {log.userName ?? log.userEmail ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(log.loggedAt).toLocaleDateString()}
                  </span>
                </div>
                {log.description && (
                  <p className="text-gray-500 text-xs mt-0.5">{log.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {worklogs.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No time logged yet.</p>
      )}
    </div>
  );
}
