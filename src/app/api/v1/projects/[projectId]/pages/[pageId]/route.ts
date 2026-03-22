import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.any().optional(),
  contentText: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> },
) {
  const { projectId, pageId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.projectId, projectId)))
    .limit(1);

  if (!page) return apiError('Not found', 404);
  return apiResponse(page);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> },
) {
  const { projectId, pageId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [updated] = await db
    .update(pages)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(pages.id, pageId), eq(pages.projectId, projectId)))
    .returning();

  if (!updated) return apiError('Not found', 404);
  return apiResponse(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; pageId: string }> },
) {
  const { projectId, pageId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  await db.delete(pages).where(and(eq(pages.id, pageId), eq(pages.projectId, projectId)));
  return apiResponse({ deleted: true });
}
