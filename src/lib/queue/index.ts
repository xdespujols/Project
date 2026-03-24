import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(redisUrl);

const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
};

export const notificationsQueue = new Queue('notifications', { connection });
export const automationsQueue = new Queue('automations', { connection });
export const emailQueue = new Queue('email', { connection });
export const webhooksQueue = new Queue('webhooks', { connection });
