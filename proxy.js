import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/utils/auth/token';

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const adminSession = verifySessionToken(request.cookies.get('admin_session')?.value);
  const clientSession = verifySessionToken(request.cookies.get('client_session')?.value);

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/portal-login') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/portal')) {
    if (!clientSession || clientSession.kind !== 'client') {
      return NextResponse.redirect(new URL('/portal-login', request.url));
    }

    return NextResponse.next();
  }

  if (!adminSession || adminSession.kind !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
