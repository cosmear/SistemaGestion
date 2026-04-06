import { NextResponse } from 'next/server';
import {
  GOOGLE_CALENDAR_OAUTH_COOKIE,
  buildGoogleCalendarAuthorizationUrl,
  buildGoogleCalendarRedirectResponse,
  canManageGoogleCalendar,
  createGoogleCalendarOauthState,
  encodeGoogleCalendarOauthState,
  isGoogleCalendarConfigured,
} from '@/utils/google-calendar';
import { getAdminSession } from '@/utils/auth/admin';

export const dynamic = 'force-dynamic';

function buildRedirect(origin, status) {
  return buildGoogleCalendarRedirectResponse(origin, status);
}

export async function GET(request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(buildRedirect(request.nextUrl.origin, 'missing-config'));
  }

  if (!canManageGoogleCalendar(session)) {
    return NextResponse.redirect(buildRedirect(request.nextUrl.origin, 'legacy-user'));
  }

  const oauthState = createGoogleCalendarOauthState(session);
  const response = NextResponse.redirect(
    buildGoogleCalendarAuthorizationUrl(request.nextUrl.origin, oauthState.state)
  );

  response.cookies.set(GOOGLE_CALENDAR_OAUTH_COOKIE, encodeGoogleCalendarOauthState(oauthState), {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 60 * 10,
  });

  return response;
}
