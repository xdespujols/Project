import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { epics } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.unknown().optional(),
  descriptionText: z.string().optional(),
  color: z.string().optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const rows = await db.select().from(epics).where(eq(epics.projectId, projectId))
    .orderBy(epics.sequenceId);
  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  // Get next sequenceId
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(epics)
    .where(eq(epics.projectId, projectId));
  const sequenceId = Number(count) + 1;

  const [epic] = await db.insert(epics).values({
    projectId,
    sequenceId,
    title: parsed.data.title,
    description: parsed.data.description as object ?? null,
    descriptionText: parsed.data.descriptionText,
    color: parsed.data.color ?? '#6366f1',
    startDate: parsed.data.startDate ?? null,
    dueDate: parsed.data.dueDate ?? null,
    createdBy: session.user.id,
  }).returning();

  return apiResponse(epic, 201);
}
