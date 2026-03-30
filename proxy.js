import { NextResponse } from 'next/server';

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const userCookie = request.cookies.get('session_user');
  if (!userCookie) {
    // Need to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authorized, proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
