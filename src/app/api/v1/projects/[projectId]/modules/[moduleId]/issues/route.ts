import { auth } from '../../../../../../../../../auth';
import { db } from '@/db';
import { moduleIssues, issues } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const rows = await db
    .select({ issue: issues })
    .from(moduleIssues)
    .innerJoin(issues, eq(moduleIssues.issueId, issues.id))
    .where(eq(moduleIssues.moduleId, moduleId));

  return apiResponse(rows.map((r) => r.issue));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { issueId } = await req.json();
  if (!issueId) return apiError('issueId required', 422);

  const [existing] = await db
    .select()
    .from(moduleIssues)
    .where(and(eq(moduleIssues.moduleId, moduleId), eq(moduleIssues.issueId, issueId)))
    .limit(1);

  if (!existing) {
    await db.insert(moduleIssues).values({ moduleId, issueId });
  }

  return apiResponse({ added: true }, 201);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { issueId } = await req.json();
  await db
    .delete(moduleIssues)
    .where(and(eq(moduleIssues.moduleId, moduleId), eq(moduleIssues.issueId, issueId)));

  return apiResponse({ removed: true });
}
