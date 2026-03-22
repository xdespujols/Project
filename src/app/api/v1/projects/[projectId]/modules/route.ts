import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { modules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['backlog', 'in-progress', 'paused', 'completed', 'cancelled']).optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db.select().from(modules).where(eq(modules.projectId, projectId));
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

  const [mod] = await db
    .insert(modules)
    .values({
      projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status || 'backlog',
      startDate: parsed.data.startDate || null,
      targetDate: parsed.data.targetDate || null,
      createdBy: session.user.id,
    })
    .returning();

  return apiResponse(mod, 201);
}
