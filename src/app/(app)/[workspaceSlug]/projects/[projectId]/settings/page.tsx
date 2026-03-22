import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { states, labels, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { StatesManager } from './states-manager';
import { LabelsManager } from './labels-manager';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string }> };

export default async function ProjectSettingsPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const projectStates = await db
    .select()
    .from(states)
    .where(eq(states.projectId, projectId))
    .orderBy(states.sequence);

  const projectLabels = await db
    .select()
    .from(labels)
    .where(eq(labels.projectId, projectId));

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">{project?.name} Settings</h1>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">States</h2>
        <StatesManager states={projectStates} projectId={projectId} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Labels</h2>
        <LabelsManager labels={projectLabels} projectId={projectId} />
      </section>
    </div>
  );
}
