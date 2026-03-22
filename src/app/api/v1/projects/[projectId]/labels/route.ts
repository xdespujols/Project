import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { labels } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db.select().from(labels).where(eq(labels.projectId, projectId));
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

  const [label] = await db
    .insert(labels)
    .values({ ...parsed.data, projectId, createdBy: session.user.id })
    .returning();

  return apiResponse(label, 201);
}
