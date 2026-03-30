import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { clearSessionCookie, getSessionFromCookie, persistSessionCookie, SESSION_COOKIE_NAMES } from './session';
import { verifyPasswordHash } from './token';

const ADMIN_COOKIE = SESSION_COOKIE_NAMES.admin;
const DEFAULT_ROLES = ['admin', 'manager', 'operator'];

const LEGACY_ADMIN_USERS = {
  cosme: {
    id: 'legacy-cosme',
    username: 'Cosme',
    fullName: 'Cosme',
    role: 'admin',
    passwordHash:
      'scrypt:6fdeb36a5f51fb33c0f665f1425bb9c1:f300f7fb63eb03d97b872f40c591995b5beeab8fee515f5ff1e4b803dcb862cd361d00dc67a3d88ce6850409ef40c2da6c95c074b3e69cb30c11db069008a390',
  },
  nacho: {
    id: 'legacy-nacho',
    username: 'Nacho',
    fullName: 'Nacho',
    role: 'admin',
    passwordHash:
      'scrypt:9eea393b18483edec84f3a27eb6d0f7d:069f52884d17f2b260a45fdc278f310ff898002f4dbbc8126fba7b8ed626e954d6f0209195d04d8f4d63b3b9605a65326a5a8038f8962d3c4560761a138a58e2',
  },
};

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function buildAdminSessionPayload(user) {
  return {
    kind: 'admin',
    userId: user.id,
    username: user.username,
    fullName: user.fullName || user.username,
    role: user.role || 'admin',
  };
}

async function findInternalAdmin(username) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('internal_users')
    .select('id, username, full_name, role, password_hash, is_active')
    .ilike('username', username)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (data.is_active === false) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name || data.username,
    role: data.role || 'admin',
    passwordHash: data.password_hash,
  };
}

export async function authenticateAdminUser(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || '').trim();

  if (!normalizedUsername || !normalizedPassword) {
    return null;
  }

  const internalUser = await findInternalAdmin(normalizedUsername);

  if (internalUser && verifyPasswordHash(normalizedPassword, internalUser.passwordHash)) {
    return buildAdminSessionPayload(internalUser);
  }

  const legacyUser = LEGACY_ADMIN_USERS[normalizedUsername];

  if (legacyUser && verifyPasswordHash(normalizedPassword, legacyUser.passwordHash)) {
    return buildAdminSessionPayload(legacyUser);
  }

  return null;
}

export async function createAdminSession(user) {
  return persistSessionCookie(ADMIN_COOKIE, buildAdminSessionPayload(user), {
    maxAge: 60 * 60 * 12,
  });
}

export async function destroyAdminSession() {
  await clearSessionCookie(ADMIN_COOKIE);
}

export async function getAdminSession() {
  const session = await getSessionFromCookie(ADMIN_COOKIE);

  if (!session || session.kind !== 'admin') {
    return null;
  }

  return session;
}

export async function requireAdminSession(roles = DEFAULT_ROLES) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/login');
  }

  if (roles?.length && !roles.includes(session.role)) {
    redirect('/');
  }

  return session;
}
