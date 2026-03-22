import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { intakeForms, intakeSubmissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { nanoid } from 'nanoid';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const forms = await db
    .select()
    .from(intakeForms)
    .where(eq(intakeForms.projectId, projectId));

  const formIds = forms.map((f) => f.id);
  const submissions = formIds.length > 0
    ? await db
        .select()
        .from(intakeSubmissions)
        .where(eq(intakeSubmissions.intakeFormId, formIds[0]))
        .orderBy(intakeSubmissions.createdAt)
    : [];

  return apiResponse({ forms, submissions });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  // Create or return existing form
  const [existing] = await db
    .select()
    .from(intakeForms)
    .where(eq(intakeForms.projectId, projectId))
    .limit(1);

  if (existing) return apiResponse(existing);

  const [form] = await db
    .insert(intakeForms)
    .values({
      projectId,
      formToken: nanoid(16),
      title: 'Submit a request',
    })
    .returning();

  return apiResponse(form, 201);
}
