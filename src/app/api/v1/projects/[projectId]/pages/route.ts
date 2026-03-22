import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const createSchema = z.object({
  title: z.string().min(1).max(255).default('Untitled'),
  parentId: z.string().uuid().nullable().optional(),
  content: z.any().optional(),
  contentText: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db
    .select()
    .from(pages)
    .where(eq(pages.projectId, projectId))
    .orderBy(pages.updatedAt);

  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [page] = await db
    .insert(pages)
    .values({
      projectId,
      title: parsed.data.title,
      parentId: parsed.data.parentId || null,
      content: parsed.data.content,
      contentText: parsed.data.contentText,
      createdBy: session.user.id,
      ownedBy: session.user.id,
    })
    .returning();

  return apiResponse(page, 201);
}
