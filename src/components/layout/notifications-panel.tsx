'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function loadNotifications() {
    setLoading(true);
    const res = await fetch('/api/v1/notifications');
    if (res.ok) {
      const { data } = await res.json();
      setNotifications(data);
    }
    setLoading(false);
  }

  async function markAllRead() {
    await fetch('/api/v1/notifications?all=true', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  useEffect(() => {
    if (open) loadNotifications();
  }, [open]);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-10 z-50 w-80 bg-white border rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <div className="p-4 text-sm text-gray-400 text-center">Loading…</div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="p-6 text-sm text-gray-400 text-center">
                  No notifications yet.
                </div>
              )}

              {!loading &&
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-4 py-3 border-b last:border-0 text-sm',
                      !n.isRead && 'bg-indigo-50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
                      )}
                      <div className={cn(!n.isRead ? '' : 'pl-4')}>
                        <p className="font-medium text-gray-900">{n.title}</p>
                        {n.message && (
                          <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
