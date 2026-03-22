'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TRIGGER_LABELS: Record<string, string> = {
  issue_created: 'Issue created',
  issue_state_changed: 'State changed',
  issue_priority_changed: 'Priority changed',
  issue_assignee_changed: 'Assignee changed',
  issue_due_date_passed: 'Due date passed',
  issue_label_added: 'Label added',
};

const ACTION_LABELS: Record<string, string> = {
  set_state: 'Set state',
  set_priority: 'Set priority',
  add_label: 'Add label',
  remove_label: 'Remove label',
  assign_to: 'Assign to',
  send_notification: 'Send notification',
};

type Automation = {
  id: string;
  name: string;
  isEnabled: boolean;
  triggerType: string;
  actionType: string;
};

type Props = {
  automations: Automation[];
  projectId: string;
};

export function AutomationsManager({ automations, projectId }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('issue_state_changed');
  const [actionType, setActionType] = useState('send_notification');
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/v1/projects/${projectId}/automations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, triggerType, actionType }),
    });
    setLoading(false);
    setAdding(false);
    setName('');
    router.refresh();
  }

  async function toggle(automation: Automation) {
    await fetch(`/api/v1/projects/${projectId}/automations/${automation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !automation.isEnabled }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/v1/projects/${projectId}/automations/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {automations.map((a) => (
        <div key={a.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-white">
          <button onClick={() => toggle(a)} className="text-gray-400 hover:text-indigo-600">
            {a.isEnabled
              ? <ToggleRight className="h-5 w-5 text-indigo-600" />
              : <ToggleLeft className="h-5 w-5" />}
          </button>
          <div className="flex-1">
            <span className="font-medium text-sm">{a.name}</span>
            <div className="flex gap-2 mt-0.5 text-xs text-gray-400">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded">{TRIGGER_LABELS[a.triggerType] ?? a.triggerType}</span>
              <span>→</span>
              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{ACTION_LABELS[a.actionType] ?? a.actionType}</span>
            </div>
          </div>
          <button onClick={() => remove(a.id)} className="text-gray-400 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={create} className="border rounded-lg px-4 py-3 bg-gray-50 space-y-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Automation name"
            className="h-8 text-sm"
            required
          />
          <div className="flex gap-2">
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-gray-400 self-center">→</span>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" type="button" variant="outline" onClick={() => { setAdding(false); setName(''); }}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mt-2"
        >
          <Plus className="h-4 w-4" /> Add automation
        </button>
      )}
    </div>
  );
}
