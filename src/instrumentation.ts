export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { migrate } = await import('drizzle-orm/postgres-js/migrator');
      const { db } = await import('@/db');
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('[db] migrations applied');
    } catch (err) {
      console.error('[db] migration failed:', err);
      // Let the process crash so CapRover restarts it — safer than serving with a stale schema
      process.exit(1);
    }
  }
}
