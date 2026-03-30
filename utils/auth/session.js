import { cookies } from 'next/headers';
import { buildSessionPayload, signSessionToken, verifySessionToken } from './token';

export const SESSION_COOKIE_NAMES = {
  admin: 'admin_session',
  client: 'client_session',
};

function getCookieOptions(maxAge, path = '/') {
  return {
    httpOnly: true,
    path,
    maxAge,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    priority: 'high',
  };
}

export async function persistSessionCookie(name, payload, options = {}) {
  const {
    maxAge = 60 * 60 * 24 * 7,
    path = '/',
  } = options;
  const cookieStore = await cookies();
  const token = signSessionToken(buildSessionPayload(payload, maxAge));

  cookieStore.set(name, token, getCookieOptions(maxAge, path));

  return token;
}

export async function clearSessionCookie(name, path = '/') {
  const cookieStore = await cookies();

  cookieStore.set(name, '', getCookieOptions(0, path));
}

export async function getSessionFromCookie(name) {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(name)?.value;

  return verifySessionToken(rawValue);
}
