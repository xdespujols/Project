/**
 * BullMQ worker process — run separately from Next.js
 * Usage: npm run workers:dev
 */
import { Worker } from 'bullmq';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(redisUrl);

const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
};

// DB for worker process
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// --- Notifications worker ---
const notificationsWorker = new Worker(
  'notifications',
  async (job) => {
    console.log(`[notifications] Processing job ${job.id}`, job.data);
    const { userId, issueId, message } = job.data as {
      userId: string;
      issueId?: string;
      message: string;
    };
    await db.insert(schema.notifications).values({
      receiverId: userId,
      issueId: issueId ?? null,
      title: message,
    });
  },
  { connection },
);

// --- Automations worker ---
const automationsWorker = new Worker(
  'automations',
  async (job) => {
    const { projectId, issueId, triggerType, triggerData } = job.data as {
      projectId: string;
      issueId: string;
      triggerType: string;
      triggerData: Record<string, unknown>;
    };

    console.log(`[automations] trigger=${triggerType} issue=${issueId}`);

    // Find matching enabled automations for this project + trigger
    const matching = await db.select().from(schema.automations).where(
      and(
        eq(schema.automations.projectId, projectId),
        eq(schema.automations.isEnabled, true),
        eq(schema.automations.triggerType, triggerType as typeof schema.automations.$inferSelect.triggerType),
      ),
    );

    for (const automation of matching) {
      try {
        const payload = automation.actionPayload as Record<string, unknown> | null;

        switch (automation.actionType) {
          case 'set_state':
            if (payload?.stateId) {
              await db.update(schema.issues)
                .set({ stateId: payload.stateId as string, updatedAt: new Date() })
                .where(eq(schema.issues.id, issueId));
            }
            break;

          case 'set_priority':
            if (payload?.priority) {
              await db.update(schema.issues)
                .set({ priority: payload.priority as typeof schema.issues.$inferSelect.priority, updatedAt: new Date() })
                .where(eq(schema.issues.id, issueId));
            }
            break;

          case 'add_label':
            if (payload?.labelId) {
              await db.insert(schema.issueLabels)
                .values({ issueId, labelId: payload.labelId as string })
                .onConflictDoNothing();
            }
            break;

          case 'send_notification': {
            // Find all project members to notify
            const members = await db.select({ userId: schema.projectMembers.userId })
              .from(schema.projectMembers)
              .where(eq(schema.projectMembers.projectId, projectId));
            for (const m of members) {
              await db.insert(schema.notifications).values({
                receiverId: m.userId,
                issueId,
                title: `Automation: ${automation.name}`,
              });
            }
            break;
          }

          default:
            console.log(`[automations] Unhandled action: ${automation.actionType}`);
        }

        // Log run
        await db.insert(schema.automationRuns).values({
          automationId: automation.id,
          issueId,
          status: 'success',
        });
      } catch (err) {
        console.error(`[automations] Action failed for automation ${automation.id}:`, err);
        await db.insert(schema.automationRuns).values({
          automationId: automation.id,
          issueId,
          status: 'failed',
          error: String(err),
        });
      }
    }
  },
  { connection },
);

// --- Email worker ---
const emailWorker = new Worker(
  'email',
  async (job) => {
    console.log(`[email] Sending email job ${job.id}`, job.data);
    // TODO: integrate with nodemailer / Resend / SES
    // const { to, subject, html } = job.data;
  },
  { connection },
);

notificationsWorker.on('failed', (job, err) => {
  console.error(`[notifications] Job ${job?.id} failed:`, err);
});

automationsWorker.on('failed', (job, err) => {
  console.error(`[automations] Job ${job?.id} failed:`, err);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[email] Job ${job?.id} failed:`, err);
});

// --- Webhooks worker ---
const webhooksWorker = new Worker(
  'webhooks',
  async (job) => {
    const { workspaceId, projectId, event, payload } = job.data as {
      workspaceId: string;
      projectId?: string;
      event: string;
      payload: Record<string, unknown>;
    };

    console.log(`[webhooks] Delivering event=${event} workspace=${workspaceId}`);

    // Find matching active webhooks
    const matching = await db
      .select()
      .from(schema.webhooks)
      .where(
        and(
          eq(schema.webhooks.workspaceId, workspaceId),
          eq(schema.webhooks.isActive, true),
        ),
      );

    for (const webhook of matching) {
      // Filter by project if set
      if (webhook.projectId && webhook.projectId !== projectId) continue;

      // Filter by subscribed events
      const events = webhook.events as string[];
      if (!events.includes(event) && !events.includes('*')) continue;

      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

      // HMAC-SHA256 signature
      const { createHmac } = await import('node:crypto');
      const sig = createHmac('sha256', webhook.secret).update(body).digest('hex');

      let statusCode = '';
      let responseBody = '';
      let success = false;

      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Plane-Signature': `sha256=${sig}`,
            'X-Plane-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        statusCode = String(res.status);
        responseBody = await res.text().catch(() => '');
        success = res.ok;
      } catch (err) {
        statusCode = 'timeout';
        responseBody = String(err);
      }

      await db.insert(schema.webhookDeliveries).values({
        webhookId: webhook.id,
        event,
        payload,
        statusCode,
        responseBody: responseBody.slice(0, 1000),
        success,
      });
    }
  },
  { connection },
);

webhooksWorker.on('failed', (job, err) => {
  console.error(`[webhooks] Job ${job?.id} failed:`, err);
});

console.log('Workers started: notifications, automations, email, webhooks');
