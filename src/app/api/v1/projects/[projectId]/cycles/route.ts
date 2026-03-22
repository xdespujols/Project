import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { cycles, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
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
    .from(cycles)
    .where(eq(cycles.projectId, projectId))
    .orderBy(cycles.createdAt);

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

  const [cycle] = await db
    .insert(cycles)
    .values({
      projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      startDate: parsed.data.startDate || null,
      endDate: parsed.data.endDate || null,
      createdBy: session.user.id,
    })
    .returning();

  return apiResponse(cycle, 201);
}
