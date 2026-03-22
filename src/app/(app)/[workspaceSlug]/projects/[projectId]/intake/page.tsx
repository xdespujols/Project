import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { intakeForms, intakeSubmissions, projects, states } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { IntakeTriage } from './intake-triage';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string }> };

export default async function IntakePage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  // Get or create intake form
  let [form] = await db
    .select()
    .from(intakeForms)
    .where(eq(intakeForms.projectId, projectId))
    .limit(1);

  if (!form) {
    // Auto-create
    const { nanoid } = await import('nanoid');
    const [created] = await db.insert(intakeForms).values({
      projectId,
      formToken: nanoid(16),
      title: 'Submit a request',
    }).returning();
    form = created;
  }

  const submissions = await db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.intakeFormId, form.id))
    .orderBy(intakeSubmissions.createdAt);

  const projectStates = await db
    .select()
    .from(states)
    .where(eq(states.projectId, projectId))
    .orderBy(states.sequence);

  const publicUrl = `/api/intake/${form.formToken}`;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">{project?.name} / Intake</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Public form:</span>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">/intake/{form.formToken}</code>
        </div>
      </div>

      <IntakeTriage
        submissions={submissions}
        projectId={projectId}
        states={projectStates}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
