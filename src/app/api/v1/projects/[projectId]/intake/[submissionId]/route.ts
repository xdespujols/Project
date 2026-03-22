import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { intakeSubmissions, issues, issueActivities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { sql } from 'drizzle-orm';

const patchSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'duplicate', 'snoozed']).optional(),
  triageNote: z.string().optional(),
  convertToIssue: z.boolean().optional(),
  stateId: z.string().uuid().nullable().optional(),
  priority: z.enum(['none', 'urgent', 'high', 'medium', 'low']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; submissionId: string }> },
) {
  const { projectId, submissionId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const [submission] = await db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.id, submissionId))
    .limit(1);

  if (!submission) return apiError('Not found', 404);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  let convertedIssueId = submission.convertedIssueId;

  if (parsed.data.convertToIssue && !convertedIssueId) {
    // Count existing issues for sequence
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.projectId, projectId));

    const [issue] = await db
      .insert(issues)
      .values({
        projectId,
        title: submission.title,
        descriptionText: submission.description,
        priority: parsed.data.priority || 'none',
        stateId: parsed.data.stateId || null,
        sequenceId: Number(count) + 1,
        createdBy: session.user.id,
      })
      .returning();

    convertedIssueId = issue.id;

    await db.insert(issueActivities).values({
      issueId: issue.id,
      actorId: session.user.id,
      field: 'intake',
      newValue: 'converted from intake',
    });
  }

  const [updated] = await db
    .update(intakeSubmissions)
    .set({
      status: parsed.data.status || (parsed.data.convertToIssue ? 'accepted' : undefined),
      triageNote: parsed.data.triageNote,
      convertedIssueId,
      updatedAt: new Date(),
    })
    .where(eq(intakeSubmissions.id, submissionId))
    .returning();

  return apiResponse(updated);
}
