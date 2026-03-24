import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { NotificationsClient } from './notifications-client';

type Props = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function NotificationsPage({ params }: Props) {
  const { workspaceSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.receiverId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unreadCount = rows.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
          )}
        </div>
      </div>
      <NotificationsClient
        initialNotifications={rows}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
