import { auth } from '../../../../../auth';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.receiverId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return apiResponse(rows);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const url = new URL(req.url);
  const markAll = url.searchParams.get('all') === 'true';

  if (markAll) {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.receiverId, session.user.id),
          eq(notifications.isRead, false),
        ),
      );
  }

  return apiResponse({ updated: true });
}
