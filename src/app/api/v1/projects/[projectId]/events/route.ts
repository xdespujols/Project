import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { projects, workspaceMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { createSubscriber, projectChannel } from '@/lib/pubsub';
import { apiError } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  const { projectId } = await params;

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return apiError('Not found', 404);

  const [member] = await db
    .select({ id: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!member) return apiError('Forbidden', 403);

  const subscriber = createSubscriber();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial ping so the client knows the connection is live
      controller.enqueue(encoder.encode(`event: connected\ndata: {}\n\n`));

      await subscriber.subscribe(projectChannel(projectId));

      subscriber.on('message', (_channel: string, message: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          // Client disconnected
        }
      });

      // Keep-alive ping every 25 s
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 25_000);

      // Attach cleanup to the interval reference so cancel() can reach it
      (subscriber as any)._keepAlive = interval;
    },
    cancel() {
      clearInterval((subscriber as any)._keepAlive);
      subscriber.unsubscribe().catch(() => {});
      subscriber.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
