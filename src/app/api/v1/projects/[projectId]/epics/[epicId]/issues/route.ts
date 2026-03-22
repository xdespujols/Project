import { auth } from '../../../../../../../../../auth';
import { db } from '@/db';
import { epicIssues, issues, states } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, epicId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const rows = await db
    .select({
      id: issues.id,
      title: issues.title,
      sequenceId: issues.sequenceId,
      priority: issues.priority,
      stateId: issues.stateId,
      stateName: states.name,
      stateColor: states.color,
    })
    .from(epicIssues)
    .innerJoin(issues, eq(epicIssues.issueId, issues.id))
    .leftJoin(states, eq(issues.stateId, states.id))
    .where(eq(epicIssues.epicId, epicId));

  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, epicId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const { issueId } = z.object({ issueId: z.string().uuid() }).parse(await req.json());

  await db.insert(epicIssues).values({ epicId, issueId }).onConflictDoNothing();
  return apiResponse({ added: true }, 201);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, epicId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const { issueId } = z.object({ issueId: z.string().uuid() }).parse(await req.json());

  await db.delete(epicIssues).where(
    and(eq(epicIssues.epicId, epicId), eq(epicIssues.issueId, issueId)),
  );
  return apiResponse({ removed: true });
}
