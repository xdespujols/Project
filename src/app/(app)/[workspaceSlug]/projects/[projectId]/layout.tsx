import { auth } from '../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { projects, workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Props = {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string; projectId: string }>;
};

export default async function ProjectLayout({ children, params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) notFound();

  return <>{children}</>;
}
