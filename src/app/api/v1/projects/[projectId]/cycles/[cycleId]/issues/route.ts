import { auth } from '../../../../../../../../../auth';
import { db } from '@/db';
import { cycleIssues, issues, states } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ cycleId: string }> },
) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db
    .select({ issue: issues })
    .from(cycleIssues)
    .innerJoin(issues, eq(cycleIssues.issueId, issues.id))
    .where(eq(cycleIssues.cycleId, cycleId));

  return apiResponse(rows.map((r) => r.issue));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ cycleId: string }> },
) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { issueId } = await req.json();
  if (!issueId) return apiError('issueId required', 422);

  const [existing] = await db
    .select()
    .from(cycleIssues)
    .where(and(eq(cycleIssues.cycleId, cycleId), eq(cycleIssues.issueId, issueId)))
    .limit(1);

  if (!existing) {
    await db.insert(cycleIssues).values({ cycleId, issueId });
  }

  return apiResponse({ added: true }, 201);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ cycleId: string }> },
) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { issueId } = await req.json();
  await db
    .delete(cycleIssues)
    .where(and(eq(cycleIssues.cycleId, cycleId), eq(cycleIssues.issueId, issueId)));

  return apiResponse({ removed: true });
}
