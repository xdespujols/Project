'use client';

import { useState, useEffect } from 'react';
import { Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Member = { id: string; name: string | null; email: string | null };

type Props = {
  projectId: string;
  issueId: string;
  workspaceSlug: string;
  initialAssignees?: Member[];
};

export function AssigneeSelector({ projectId, issueId, workspaceSlug, initialAssignees = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialAssignees.map((a) => a.id)),
  );
  const [saving, setSaving] = useState(false);

  async function loadMembers() {
    const res = await fetch(`/api/v1/workspaces/${workspaceSlug}/members`);
    if (res.ok) {
      const { data } = await res.json();
      setMembers(data);
    }
  }

  async function toggleMember(userId: string) {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelected(next);

    setSaving(true);
    await fetch(`/api/v1/projects/${projectId}/issues/${issueId}/assignees`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: Array.from(next) }),
    });
    setSaving(false);
  }

  useEffect(() => {
    if (open) loadMembers();
  }, [open]);

  const assignedMembers = members.filter((m) => selected.has(m.id));
  const displayNames = assignedMembers.map((m) => m.name || m.email).join(', ');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-indigo-600 w-full text-left"
      >
        <User className="h-3.5 w-3.5 text-gray-400" />
        <span className="truncate">
          {displayNames || <span className="text-gray-400">Unassigned</span>}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-50 w-56 bg-white border rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b">
              <p className="text-xs font-semibold text-gray-500">Assign members</p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {members.length === 0 && (
                <p className="p-3 text-xs text-gray-400 text-center">Loading…</p>
              )}
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                    {(m.name || m.email || '?')[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{m.name || m.email}</span>
                  {selected.has(m.id) && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
