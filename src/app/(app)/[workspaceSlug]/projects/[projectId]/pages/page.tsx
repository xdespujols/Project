import { auth } from '../../../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { pages, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { CreatePageButton } from './create-page-button';
import { FileText } from 'lucide-react';

type Props = { params: Promise<{ workspaceSlug: string; projectId: string }> };

export default async function PagesListPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  const pageList = await db
    .select()
    .from(pages)
    .where(eq(pages.projectId, projectId))
    .orderBy(pages.updatedAt);

  const topLevel = pageList.filter((p) => !p.parentId);
  const children = (parentId: string) => pageList.filter((p) => p.parentId === parentId);

  function renderTree(page: typeof pageList[0], depth = 0): React.ReactNode {
    return (
      <div key={page.id} style={{ paddingLeft: depth * 16 }}>
        <Link
          href={`/${workspaceSlug}/projects/${projectId}/pages/${page.id}`}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-sm group"
        >
          <FileText className="h-3.5 w-3.5 text-gray-400" />
          <span className="flex-1">{page.title}</span>
          <span className="text-xs text-gray-400">
            {new Date(page.updatedAt).toLocaleDateString()}
          </span>
        </Link>
        {children(page.id).map((child) => renderTree(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">{project?.name} / Pages</h1>
        <CreatePageButton projectId={projectId} workspaceSlug={workspaceSlug} />
      </div>

      {pageList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No pages yet</p>
          <p className="text-sm">Create collaborative docs and wikis for your project.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white">
          {topLevel.map((page) => renderTree(page))}
        </div>
      )}
    </div>
  );
}
