import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { initiatives, workspaces, workspaceMembers } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.unknown().optional(),
  descriptionText: z.string().optional(),
  color: z.string().optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

async function getWorkspaceAndAssertMember(slug: string, userId: string) {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (!ws) return null;
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!member) return null;
  return ws;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { workspaceSlug } = await params;
  const ws = await getWorkspaceAndAssertMember(workspaceSlug, session.user.id);
  if (!ws) return apiError('Forbidden', 403);

  const rows = await db.select().from(initiatives)
    .where(eq(initiatives.workspaceId, ws.id))
    .orderBy(initiatives.sequenceId);
  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { workspaceSlug } = await params;
  const ws = await getWorkspaceAndAssertMember(workspaceSlug, session.user.id);
  if (!ws) return apiError('Forbidden', 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(initiatives)
    .where(eq(initiatives.workspaceId, ws.id));
  const sequenceId = Number(count) + 1;

  const [initiative] = await db.insert(initiatives).values({
    workspaceId: ws.id,
    sequenceId,
    title: parsed.data.title,
    description: parsed.data.description as object ?? null,
    descriptionText: parsed.data.descriptionText,
    color: parsed.data.color ?? '#8b5cf6',
    startDate: parsed.data.startDate ?? null,
    dueDate: parsed.data.dueDate ?? null,
    createdBy: session.user.id,
  }).returning();

  return apiResponse(initiative, 201);
}
