import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { webhooks, workspaces, workspaceMembers } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { nanoid } from 'nanoid';

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  projectId: z.string().uuid().optional(),
});

async function getWorkspaceAndMember(slug: string, userId: string) {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!ws) return null;

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, userId)))
    .limit(1);

  return member ? ws : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { workspaceSlug } = await params;
  const ws = await getWorkspaceAndMember(workspaceSlug, session.user.id);
  if (!ws) return apiError('Forbidden', 403);

  const rows = await db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      projectId: webhooks.projectId,
      isActive: webhooks.isActive,
      createdAt: webhooks.createdAt,
    })
    .from(webhooks)
    .where(eq(webhooks.workspaceId, ws.id))
    .orderBy(desc(webhooks.createdAt));

  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { workspaceSlug } = await params;
  const ws = await getWorkspaceAndMember(workspaceSlug, session.user.id);
  if (!ws) return apiError('Forbidden', 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const secret = nanoid(32);

  const [created] = await db
    .insert(webhooks)
    .values({
      workspaceId: ws.id,
      projectId: parsed.data.projectId ?? null,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
    })
    .returning();

  return apiResponse({ ...created, secret }, 201);
}
