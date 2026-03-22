import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { labels } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { apiResponse, apiError } from '@/lib/utils';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; labelId: string }> },
) {
  const { projectId, labelId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  await db
    .delete(labels)
    .where(and(eq(labels.id, labelId), eq(labels.projectId, projectId)));

  return apiResponse({ deleted: true });
}
