import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const RESERVED_WORDS = new Set([
  'auth',
  'dashboard',
  'register',
  'messages',
  'privacy-policy',
  'developer',
  '404',
  'api',
  '_next',
  'assets',
  'icons',
  'public',
  'sw.js',
  'favicon.ico',
  'manifest.json',
  'robots.txt',
  'en',
  'ur'
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  let academyName = '';
  let targetPathname = pathname;

  // 1. Check if first path segment is an academy slug
  if (firstSegment && !RESERVED_WORDS.has(firstSegment)) {
    academyName = firstSegment;
    targetPathname = '/' + segments.slice(1).join('/');
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as string;

  // 2. Enforce Authentication on dashboard/messages routes
  if (targetPathname.startsWith('/dashboard/') || targetPathname === '/dashboard' || targetPathname === '/messages') {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = academyName ? `/${academyName}/auth/signin` : '/auth/signin';
      url.search = '';
      return NextResponse.redirect(url);
    }

    const pathRole = targetPathname.split('/')[2];
    
    // Validate role-based route access
    if (pathRole) {
      const validRoles = ['admin', 'teacher', 'student', 'parent', 'developer'];
      if (validRoles.includes(pathRole) && role.toLowerCase() !== pathRole) {
        const url = req.nextUrl.clone();
        const baseDashboardPath = `/dashboard/${role.toLowerCase()}`;
        url.pathname = academyName ? `/${academyName}${baseDashboardPath}` : baseDashboardPath;
        return NextResponse.redirect(url);
      }
    }
  }

  // 3. Redirect un-prefixed requests to their prefixed counterparts if logged in
  if (!academyName && token && token.academySlug && role !== 'DEVELOPER') {
    const url = req.nextUrl.clone();
    url.pathname = `/${token.academySlug}${pathname}`;
    return NextResponse.redirect(url);
  }

  // 4. Perform virtual rewrite for academy-specific URLs
  if (academyName) {
    const url = req.nextUrl.clone();
    url.pathname = targetPathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|icons|sw.js|manifest.json).*)',
  ],
};
