import { auth } from '../auth';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function validateBearerToken(token: string): Promise<boolean> {
  // API keys start with "plane_"
  if (!token.startsWith('plane_')) return false;
  const prefix = token.slice(0, 12);

  const rows = await db
    .select({ id: apiKeys.id, keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(eq(apiKeys.keyPrefix, prefix));

  for (const row of rows) {
    if (await bcrypt.compare(token, row.keyHash)) {
      // Update lastUsedAt asynchronously (fire-and-forget)
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, row.id))
        .catch(() => {});
      return true;
    }
  }
  return false;
}

export default auth(async (req: NextRequest & { auth?: unknown }) => {
  const isLoggedIn = !!(req as any).auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPublicApi = pathname.startsWith('/api/auth') || pathname.startsWith('/api/intake');
  const isApiRoute = pathname.startsWith('/api/v1/');

  if (isPublicApi) return NextResponse.next();

  // API routes: accept session cookie OR Bearer token
  if (isApiRoute) {
    if (isLoggedIn) return NextResponse.next();

    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const valid = await validateBearerToken(token);
      if (valid) return NextResponse.next();
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/workspaces', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
