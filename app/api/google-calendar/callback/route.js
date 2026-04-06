import { NextResponse } from 'next/server';
import { getAdminSession } from '@/utils/auth/admin';
import { createClient } from '@/utils/supabase/server';
import {
  GOOGLE_CALENDAR_OAUTH_COOKIE,
  buildGoogleCalendarRedirectResponse,
  canManageGoogleCalendar,
  decodeGoogleCalendarOauthState,
  isGoogleCalendarConfigured,
  isValidGoogleCalendarOauthState,
  saveGoogleCalendarAccountFromCode,
} from '@/utils/google-calendar';

export const dynamic = 'force-dynamic';

function redirectWithStatus(request, status) {
  return NextResponse.redirect(buildGoogleCalendarRedirectResponse(request.nextUrl.origin, status));
}

function clearOauthCookie(request, response) {
  response.cookies.set(GOOGLE_CALENDAR_OAUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function GET(request) {
  const session = await getAdminSession();
  const code = request.nextUrl.searchParams.get('code');
  const incomingState = request.nextUrl.searchParams.get('state');
  const savedState = decodeGoogleCalendarOauthState(
    request.cookies.get(GOOGLE_CALENDAR_OAUTH_COOKIE)?.value
  );

  if (!session) {
    return clearOauthCookie(request, redirectWithStatus(request, 'auth-error'));
  }

  if (!isGoogleCalendarConfigured()) {
    return clearOauthCookie(request, redirectWithStatus(request, 'missing-config'));
  }

  if (!canManageGoogleCalendar(session)) {
    return clearOauthCookie(request, redirectWithStatus(request, 'legacy-user'));
  }

  if (!code || !isValidGoogleCalendarOauthState(savedState, incomingState, session)) {
    return clearOauthCookie(request, redirectWithStatus(request, 'state-error'));
  }

  try {
    const supabase = await createClient();
    await saveGoogleCalendarAccountFromCode(supabase, session, code, request.nextUrl.origin);

    return clearOauthCookie(request, redirectWithStatus(request, 'connected'));
  } catch (error) {
    console.error('No se pudo completar la conexion con Google Calendar:', error);
    return clearOauthCookie(request, redirectWithStatus(request, 'error'));
  }
}
