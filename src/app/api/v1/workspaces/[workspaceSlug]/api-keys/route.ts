import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { apiKeys, workspaces, workspaceMembers } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { workspaceSlug } = await params;

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (!ws) return apiError('Not found', 404);

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member) return apiError('Forbidden', 403);

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, ws.id))
    .orderBy(desc(apiKeys.createdAt));

  return apiResponse(keys);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { workspaceSlug } = await params;

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (!ws) return apiError('Not found', 404);

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member || !['owner', 'admin'].includes(member.role)) return apiError('Forbidden', 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  // Generate a plain text key: plane_<32 random chars>
  const rawKey = `plane_${nanoid(32)}`;
  const keyPrefix = rawKey.slice(0, 12); // e.g. "plane_ABCDEF"
  const keyHash = await bcrypt.hash(rawKey, 10);

  const [created] = await db
    .insert(apiKeys)
    .values({
      workspaceId: ws.id,
      userId: session.user.id,
      name: parsed.data.name,
      keyPrefix,
      keyHash,
    })
    .returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix, createdAt: apiKeys.createdAt });

  // Return the raw key ONCE — it is never stored in plaintext
  return apiResponse({ ...created, key: rawKey }, 201);
}
