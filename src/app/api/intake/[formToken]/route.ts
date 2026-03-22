// Public endpoint — no auth required
import { db } from '@/db';
import { intakeForms, intakeSubmissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/utils';

const submitSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email().optional().or(z.literal('')),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formToken: string }> },
) {
  const { formToken } = await params;

  const [form] = await db
    .select({ id: intakeForms.id, title: intakeForms.title, description: intakeForms.description, isActive: intakeForms.isActive })
    .from(intakeForms)
    .where(eq(intakeForms.formToken, formToken))
    .limit(1);

  if (!form || !form.isActive) return apiError('Form not found', 404);
  return apiResponse(form);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formToken: string }> },
) {
  const { formToken } = await params;

  const [form] = await db
    .select()
    .from(intakeForms)
    .where(eq(intakeForms.formToken, formToken))
    .limit(1);

  if (!form || !form.isActive) return apiError('Form not found or inactive', 404);

  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return apiError('Invalid input', 422);

  const [submission] = await db
    .insert(intakeSubmissions)
    .values({
      intakeFormId: form.id,
      title: parsed.data.title,
      description: parsed.data.description,
      submitterName: parsed.data.submitterName,
      submitterEmail: parsed.data.submitterEmail || null,
    })
    .returning({ id: intakeSubmissions.id });

  return apiResponse({ submitted: true, id: submission.id }, 201);
}
