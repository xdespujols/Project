'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Copy, Check, Plus, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

type Webhook = {
  id: string;
  url: string;
  events: string[];
  projectId: string | null;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  workspaceSlug: string;
  isAdmin: boolean;
  initialApiKeys: ApiKey[];
  initialWebhooks: Webhook[];
};

const ALL_WEBHOOK_EVENTS = [
  'issue.created',
  'issue.updated',
  'issue.deleted',
  'comment.created',
  'cycle.created',
  'module.created',
];

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function WorkspaceSettingsClient({ workspaceSlug, isAdmin, initialApiKeys, initialWebhooks }: Props) {
  const [apiKeysList, setApiKeysList] = useState(initialApiKeys);
  const [webhooksList, setWebhooksList] = useState(initialWebhooks);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['issue.created', 'issue.updated']);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function createApiKey() {
    if (!newKeyName.trim()) return;
    startTransition(async () => {
      const res = await fetch(`/api/v1/workspaces/${workspaceSlug}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      const json = await res.json();
      if (res.ok) {
        setApiKeysList((prev) => [json.data, ...prev]);
        setNewKeyValue(json.data.key);
        setNewKeyName('');
      }
    });
  }

  async function deleteApiKey(id: string) {
    startTransition(async () => {
      await fetch(`/api/v1/workspaces/${workspaceSlug}/api-keys/${id}`, { method: 'DELETE' });
      setApiKeysList((prev) => prev.filter((k) => k.id !== id));
    });
  }

  async function createWebhook() {
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0) return;
    startTransition(async () => {
      const res = await fetch(`/api/v1/workspaces/${workspaceSlug}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newWebhookUrl, events: newWebhookEvents }),
      });
      const json = await res.json();
      if (res.ok) {
        setWebhooksList((prev) => [json.data, ...prev]);
        setNewWebhookUrl('');
      }
    });
  }

  async function toggleWebhook(id: string, isActive: boolean) {
    startTransition(async () => {
      await fetch(`/api/v1/workspaces/${workspaceSlug}/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setWebhooksList((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: !isActive } : w)));
    });
  }

  async function deleteWebhook(id: string) {
    startTransition(async () => {
      await fetch(`/api/v1/workspaces/${workspaceSlug}/webhooks/${id}`, { method: 'DELETE' });
      setWebhooksList((prev) => prev.filter((w) => w.id !== id));
    });
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-10">
      {/* API Keys */}
      <section>
        <h2 className="text-lg font-semibold mb-1">API Keys</h2>
        <p className="text-sm text-gray-500 mb-4">
          Use Bearer tokens to authenticate API requests from external tools.
        </p>

        {newKeyValue && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-2">
              Key created — copy it now, it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded px-3 py-2 font-mono truncate">
                {newKeyValue}
              </code>
              <button
                onClick={() => copyKey(newKeyValue)}
                className="p-2 border rounded hover:bg-gray-50"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => setNewKeyValue(null)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Key name (e.g. CI pipeline)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
              className="flex-1 border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={createApiKey}
              disabled={isPending || !newKeyName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
        )}

        {apiKeysList.length === 0 ? (
          <p className="text-sm text-gray-400">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {apiKeysList.map((k) => (
              <div key={k.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-gray-400">
                    <code className="font-mono">{k.keyPrefix}…</code>
                    {k.lastUsedAt && <> · Last used {timeAgo(k.lastUsedAt)}</>}
                    {' · '}Created {timeAgo(k.createdAt)}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteApiKey(k.id)}
                    disabled={isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhooks */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Webhooks</h2>
        <p className="text-sm text-gray-500 mb-4">
          Receive HTTP POST notifications when events occur in this workspace.
        </p>

        {isAdmin && (
          <div className="border rounded-lg p-4 mb-4 space-y-3">
            <input
              type="url"
              placeholder="https://example.com/hooks/plane"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <div>
              <p className="text-xs text-gray-500 mb-2">Events to subscribe to:</p>
              <div className="flex flex-wrap gap-2">
                {ALL_WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    onClick={() =>
                      setNewWebhookEvents((prev) =>
                        prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
                      )
                    }
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full border transition-colors',
                      newWebhookEvents.includes(ev)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 hover:border-indigo-400',
                    )}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={createWebhook}
              disabled={isPending || !newWebhookUrl.trim() || newWebhookEvents.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add webhook
            </button>
          </div>
        )}

        {webhooksList.length === 0 ? (
          <p className="text-sm text-gray-400">No webhooks configured.</p>
        ) : (
          <div className="space-y-2">
            {webhooksList.map((w) => (
              <div key={w.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-mono truncate">{w.url}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleWebhook(w.id, w.isActive)}
                      disabled={isPending}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border',
                        w.isActive
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200',
                      )}
                    >
                      {w.isActive ? 'Active' : 'Paused'}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => deleteWebhook(w.id)}
                        disabled={isPending}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(w.events as string[]).map((ev) => (
                    <span key={ev} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
