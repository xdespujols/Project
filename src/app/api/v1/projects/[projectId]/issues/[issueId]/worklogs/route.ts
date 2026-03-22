import { auth } from '../../../../../../../../../auth';
import { db } from '@/db';
import { worklogs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

const createSchema = z.object({
  duration: z.number().int().min(1), // minutes
  description: z.string().optional(),
  loggedAt: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, issueId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const rows = await db
    .select({
      id: worklogs.id,
      duration: worklogs.duration,
      description: worklogs.description,
      loggedAt: worklogs.loggedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(worklogs)
    .leftJoin(users, eq(worklogs.userId, users.id))
    .where(eq(worklogs.issueId, issueId))
    .orderBy(worklogs.loggedAt);

  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, issueId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [log] = await db.insert(worklogs).values({
    issueId,
    userId: session.user.id,
    duration: parsed.data.duration,
    description: parsed.data.description,
    loggedAt: parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : new Date(),
  }).returning();

  return apiResponse(log, 201);
}
