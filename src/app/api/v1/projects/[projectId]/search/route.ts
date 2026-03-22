import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { issues, states } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) return apiResponse([]);

  // Use pg_trgm similarity search on title + description_text
  // Falls back to ILIKE if trgm extension not available
  const rows = await db
    .select({
      id: issues.id,
      title: issues.title,
      sequenceId: issues.sequenceId,
      priority: issues.priority,
      stateId: issues.stateId,
      stateName: states.name,
      stateColor: states.color,
      descriptionText: issues.descriptionText,
    })
    .from(issues)
    .leftJoin(states, eq(issues.stateId, states.id))
    .where(
      and(
        eq(issues.projectId, projectId),
        sql`(
          ${issues.title} ILIKE ${'%' + query + '%'}
          OR ${issues.descriptionText} ILIKE ${'%' + query + '%'}
        )`,
      ),
    )
    .limit(20);

  return apiResponse(rows);
}
