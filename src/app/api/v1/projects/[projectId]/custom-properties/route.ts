import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { customProperties } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';
import { assertProjectMember } from '@/lib/permissions/guards';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['text', 'number', 'checkbox', 'date', 'select', 'multi_select', 'url', 'email', 'member']),
  options: z.array(z.object({ id: z.string(), name: z.string(), color: z.string().optional() })).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId } = await params;
  await assertProjectMember(session.user.id, projectId);

  const rows = await db.select().from(customProperties)
    .where(eq(customProperties.projectId, projectId))
    .orderBy(customProperties.sortOrder);
  return apiResponse(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);
  const { projectId } = await params;
  await assertProjectMember(session.user.id, projectId, 'member');

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [prop] = await db.insert(customProperties).values({
    projectId,
    name: parsed.data.name,
    type: parsed.data.type,
    options: parsed.data.options ?? null,
    isRequired: parsed.data.isRequired ?? false,
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning();

  return apiResponse(prop, 201);
}
