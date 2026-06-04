import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }

  const role = token.role as string;
  const path = req.nextUrl.pathname;

  // Protect /dashboard/[role] routes
  if (path.startsWith('/dashboard/')) {
    const pathRole = path.split('/')[2];
    
    // Ignore the redirector /dashboard
    if (!pathRole) return NextResponse.next();
    
    // Prevent access if role doesn't match
    if (role.toLowerCase() !== pathRole) {
      const url = req.nextUrl.clone();
      url.pathname = `/dashboard/${role.toLowerCase()}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
