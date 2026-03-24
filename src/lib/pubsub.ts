import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let _publisher: Redis | null = null;

export function getPublisher(): Redis {
  if (!_publisher) {
    _publisher = new Redis(redisUrl, { lazyConnect: false });
  }
  return _publisher;
}

/** Each SSE connection needs its own subscriber instance. */
export function createSubscriber(): Redis {
  return new Redis(redisUrl);
}

export function projectChannel(projectId: string) {
  return `project:${projectId}`;
}

export async function publishProjectEvent(
  projectId: string,
  event: { type: string; [key: string]: unknown },
) {
  try {
    await getPublisher().publish(projectChannel(projectId), JSON.stringify(event));
  } catch {
    // Non-fatal: SSE is best-effort
  }
}
