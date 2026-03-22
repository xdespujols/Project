import { auth } from '../../../../../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { PageEditor } from './page-editor';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string; pageId: string }> };

export default async function PageDetailPage({ params }: Props) {
  const { workspaceSlug, projectId, pageId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.projectId, projectId)))
    .limit(1);

  if (!page) notFound();

  return (
    <div className="flex flex-col h-full">
      <PageEditor
        page={page}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
