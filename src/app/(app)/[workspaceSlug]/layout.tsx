import { auth } from '../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { workspaces, workspaceMembers, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { AppSidebar } from '@/components/layout/app-sidebar';

type Props = {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string; projectId?: string }>;
};

export default async function WorkspaceLayout({ children, params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  if (!workspace) notFound();

  // Verify membership
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!member) notFound();

  const projectList = await db
    .select({ id: projects.id, name: projects.name, identifier: projects.identifier })
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id));

  return (
    <div className="flex h-full">
      <AppSidebar
        workspaceSlug={workspaceSlug}
        projects={projectList}
        currentProjectId={projectId}
      />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
