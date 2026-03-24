'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Bell, CheckCheck, Circle } from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: Date;
  issueId: string | null;
};

type Props = {
  initialNotifications: Notification[];
  workspaceSlug: string;
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsClient({ initialNotifications, workspaceSlug }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markAllRead() {
    await fetch('/api/v1/notifications?all=true', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function markOneRead(id: string) {
    await fetch(`/api/v1/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => startTransition(() => { markAllRead(); })}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border transition-colors',
              n.isRead
                ? 'bg-white border-gray-100'
                : 'bg-indigo-50 border-indigo-100',
            )}
          >
            <div className="mt-0.5 flex-shrink-0">
              {n.isRead ? (
                <Circle className="h-3 w-3 text-gray-300" />
              ) : (
                <Circle className="h-3 w-3 text-indigo-500 fill-indigo-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn('text-sm', !n.isRead && 'font-medium')}>{n.title}</p>
              {n.message && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
            </div>

            {!n.isRead && (
              <button
                onClick={() => markOneRead(n.id)}
                className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
                title="Mark as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
