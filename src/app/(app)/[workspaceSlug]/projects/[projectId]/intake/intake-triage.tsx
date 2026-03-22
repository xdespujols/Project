'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Copy } from 'lucide-react';

type Submission = {
  id: string;
  title: string;
  description: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  status: string;
  convertedIssueId: string | null;
  createdAt: Date;
};
type State = { id: string; name: string; color: string };

type Props = {
  submissions: Submission[];
  projectId: string;
  states: State[];
  workspaceSlug: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
  duplicate: 'bg-orange-100 text-orange-600',
  snoozed: 'bg-blue-100 text-blue-500',
};

export function IntakeTriage({ submissions, projectId, states, workspaceSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [priority, setPriority] = useState('none');
  const [stateId, setStateId] = useState(states[0]?.id || '');

  async function triage(submissionId: string, action: object) {
    setLoading(submissionId);
    await fetch(`/api/v1/projects/${projectId}/intake/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    setLoading(null);
    router.refresh();
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg mb-2">No submissions yet</p>
        <p className="text-sm">Share the public intake URL with users to start receiving requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => (
        <div
          key={sub.id}
          className={cn(
            'border rounded-xl p-4 bg-white',
            selected === sub.id && 'ring-2 ring-indigo-400',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[sub.status])}>
                  {sub.status}
                </span>
                {sub.convertedIssueId && (
                  <span className="text-xs text-green-600">→ Issue created</span>
                )}
              </div>
              <h3
                className="font-medium cursor-pointer hover:text-indigo-600"
                onClick={() => setSelected(selected === sub.id ? null : sub.id)}
              >
                {sub.title}
              </h3>
              {sub.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sub.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                {sub.submitterName && <span>{sub.submitterName}</span>}
                {sub.submitterEmail && <span>{sub.submitterEmail}</span>}
                <span>{new Date(sub.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {sub.status === 'pending' && (
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  title="Accept"
                  onClick={() => triage(sub.id, { status: 'accepted' })}
                  disabled={loading === sub.id}
                  className="text-green-500 hover:text-green-700"
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
                <button
                  title="Decline"
                  onClick={() => triage(sub.id, { status: 'declined' })}
                  disabled={loading === sub.id}
                  className="text-red-400 hover:text-red-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
                <button
                  title="Snooze"
                  onClick={() => triage(sub.id, { status: 'snoozed' })}
                  disabled={loading === sub.id}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <Clock className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {selected === sub.id && sub.status !== 'declined' && !sub.convertedIssueId && (
            <div className="mt-4 pt-4 border-t flex items-end gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Convert to issue</p>
                <div className="flex gap-2">
                  <Select value={stateId} onValueChange={setStateId}>
                    <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['none', 'urgent', 'high', 'medium', 'low'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={loading === sub.id}
                    onClick={() => triage(sub.id, { convertToIssue: true, stateId, priority })}
                  >
                    {loading === sub.id ? 'Converting…' : 'Convert'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
