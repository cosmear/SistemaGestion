import { NextResponse } from 'next/server';

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Public paths unauthenticated ok
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/portal-login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  // --- CLIENT PORTAL ACCESS ---
  if (pathname.startsWith('/portal')) {
    const clientCookie = request.cookies.get('client_session');
    if(!clientCookie) {
       return NextResponse.redirect(new URL('/portal-login', request.url));
    }
    return NextResponse.next();
  }

  // --- ADMIN DASHBOARD ACCESS (default everything else) ---
  const userCookie = request.cookies.get('session_user');
  if (!userCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authorized Admin
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
