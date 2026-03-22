/**
 * BullMQ worker process — run separately from Next.js
 * Usage: npm run workers:dev
 */
import { Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(redisUrl);

const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
};

const notificationsWorker = new Worker(
  'notifications',
  async (job) => {
    console.log(`[notifications] Processing job ${job.id}`, job.data);
    // TODO: send in-app notification or email
  },
  { connection },
);

const activityWorker = new Worker(
  'activity',
  async (job) => {
    console.log(`[activity] Processing job ${job.id}`, job.data);
    // TODO: handle post-activity side effects
  },
  { connection },
);

notificationsWorker.on('failed', (job, err) => {
  console.error(`[notifications] Job ${job?.id} failed:`, err);
});

activityWorker.on('failed', (job, err) => {
  console.error(`[activity] Job ${job?.id} failed:`, err);
});

console.log('Workers started');
