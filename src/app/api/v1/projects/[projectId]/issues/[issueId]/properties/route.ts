import { auth } from '../../../../../../../../../auth';
import { db } from '@/db';
import { issuePropertyValues } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, issueId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const rows = await db.select().from(issuePropertyValues)
    .where(eq(issuePropertyValues.issueId, issueId));
  return apiResponse(rows);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string; issueId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId, issueId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const { propertyId, value } = z.object({
    propertyId: z.string().uuid(),
    value: z.unknown(),
  }).parse(await req.json());

  // Upsert: delete existing then insert
  await db.delete(issuePropertyValues).where(
    and(
      eq(issuePropertyValues.issueId, issueId),
      eq(issuePropertyValues.propertyId, propertyId),
    ),
  );

  if (value !== null && value !== undefined) {
    await db.insert(issuePropertyValues).values({
      issueId,
      propertyId,
      value: value as object,
    });
  }

  return apiResponse({ updated: true });
}
