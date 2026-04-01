import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { clearSessionCookie, getSessionFromCookie, persistSessionCookie, SESSION_COOKIE_NAMES } from './session';
import { verifyPasswordHash } from './token';
import { getDefaultInternalRoute, INTERNAL_ROLES, normalizeInternalRole } from './permissions';

const ADMIN_COOKIE = SESSION_COOKIE_NAMES.admin;
const DEFAULT_ROLES = INTERNAL_ROLES;

const LEGACY_ADMIN_USERS = {
  cosme: {
    id: 'legacy-cosme',
    username: 'Cosme',
    fullName: 'Cosme',
    role: 'admin',
    passwordHash:
      'scrypt:16eebd5f478986db75653f1d71cf6cc5:79813cd8195a5195cfe614096265d098c1cad7f51c5d8e2273da992b5bde49fcf7b6b06e05b5181d138303d5d1ae3c5c83df46eb9e3a7445838a06e09f68ae0b',
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
    role: normalizeInternalRole(user.role),
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
    role: normalizeInternalRole(data.role),
    passwordHash: data.password_hash,
  };
}

async function hydrateAdminSession(session) {
  if (!session || session.kind !== 'admin') {
    return null;
  }

  const normalizedRole = normalizeInternalRole(session.role);
  const supabase = await createClient();
  let lookupQuery = supabase
    .from('internal_users')
    .select('id, username, full_name, role, is_active');

  if (session.userId && !String(session.userId).startsWith('legacy-')) {
    lookupQuery = lookupQuery.eq('id', session.userId);
  } else if (session.username) {
    lookupQuery = lookupQuery.ilike('username', session.username).limit(1);
  } else {
    return {
      ...session,
      role: normalizedRole,
      assignedClientIds: [],
    };
  }

  const { data: internalUser, error } = await lookupQuery.maybeSingle();

  if (error || !internalUser || internalUser.is_active === false) {
    if (session.userId && !String(session.userId).startsWith('legacy-')) {
      await clearSessionCookie(ADMIN_COOKIE);
      return null;
    }

    return {
      ...session,
      role: normalizedRole,
      assignedClientIds: [],
    };
  }

  let assignedClientIds = [];
  const hydratedRole = normalizeInternalRole(internalUser.role);

  if (hydratedRole === 'employee' || hydratedRole === 'operator') {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('internal_user_clients')
      .select('client_id')
      .eq('user_id', internalUser.id);

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    assignedClientIds = (assignments || []).map((assignment) => assignment.client_id).filter(Boolean);
  }

  return {
    ...session,
    userId: internalUser.id,
    username: internalUser.username,
    fullName: internalUser.full_name || internalUser.username,
    role: hydratedRole,
    assignedClientIds,
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
  const payload = user?.kind === 'admin' ? user : buildAdminSessionPayload(user);

  return persistSessionCookie(ADMIN_COOKIE, payload, {
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

  return hydrateAdminSession(session);
}

export async function requireAdminSession(roles = DEFAULT_ROLES) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/login');
  }

  if (roles?.length && !roles.includes(session.role)) {
    redirect(getDefaultInternalRoute(session));
  }

  return session;
}
