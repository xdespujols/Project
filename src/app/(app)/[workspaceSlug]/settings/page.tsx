import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { workspaces, workspaceMembers, apiKeys, webhooks } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { WorkspaceSettingsClient } from './workspace-settings-client';

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceSettingsPage({ params }: Props) {
  const { workspaceSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (!ws) redirect('/workspaces');

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);
  if (!member) redirect(`/${workspaceSlug}`);

  const isAdmin = ['owner', 'admin'].includes(member.role);

  const existingKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, ws.id))
    .orderBy(desc(apiKeys.createdAt));

  const existingWebhooks = await db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      projectId: webhooks.projectId,
      isActive: webhooks.isActive,
      createdAt: webhooks.createdAt,
    })
    .from(webhooks)
    .where(eq(webhooks.workspaceId, ws.id))
    .orderBy(desc(webhooks.createdAt));

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Workspace Settings</h1>
      <p className="text-sm text-gray-500 mb-8">{ws.name}</p>
      <WorkspaceSettingsClient
        workspaceSlug={workspaceSlug}
        isAdmin={isAdmin}
        initialApiKeys={existingKeys}
        initialWebhooks={existingWebhooks as any}
      />
    </div>
  );
}
