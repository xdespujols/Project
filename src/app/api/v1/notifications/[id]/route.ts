import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { apiResponse, apiError } from '@/lib/utils';

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { id } = await params;

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.receiverId, session.user.id),
      ),
    );

  return apiResponse({ updated: true });
}
