import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/utils/supabase/server';
import { clearSessionCookie, getSessionFromCookie, persistSessionCookie, SESSION_COOKIE_NAMES } from './session';
import { hashPassword, verifyPasswordHash } from './token';

const CLIENT_COOKIE = SESSION_COOKIE_NAMES.client;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function buildClientSessionPayload(user) {
  return {
    kind: 'client',
    userId: user.id,
    clientId: user.clientId,
    clientName: user.clientName,
    email: user.email,
    role: 'client',
  };
}

async function upgradeLegacyClientPassword(userId, password) {
  const supabase = await createSupabaseClient();

  await supabase
    .from('client_users')
    .update({
      password_hash: hashPassword(password),
      password: null,
    })
    .eq('id', userId);
}

export async function authenticateClientUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '').trim();

  if (!normalizedEmail || !normalizedPassword) {
    return null;
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from('client_users')
    .select('id, client_id, email, password, password_hash, is_active, clients(name)')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error || !data || data.is_active === false) {
    return null;
  }

  const hasHashMatch = verifyPasswordHash(normalizedPassword, data.password_hash);
  const hasLegacyMatch = Boolean(data.password) && data.password === normalizedPassword;

  if (!hasHashMatch && !hasLegacyMatch) {
    return null;
  }

  if (hasLegacyMatch && !hasHashMatch) {
    await upgradeLegacyClientPassword(data.id, normalizedPassword);
  }

  return buildClientSessionPayload({
    id: data.id,
    clientId: data.client_id,
    clientName: data.clients?.name || 'Cliente',
    email: data.email,
  });
}

export async function createClientSession(user) {
  return persistSessionCookie(CLIENT_COOKIE, buildClientSessionPayload(user), {
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroyClientSession() {
  await clearSessionCookie(CLIENT_COOKIE);
}

export async function getClientSession() {
  const session = await getSessionFromCookie(CLIENT_COOKIE);

  if (!session || session.kind !== 'client') {
    return null;
  }

  return session;
}

export async function requireClientSession() {
  const session = await getClientSession();

  if (!session) {
    redirect('/portal-login');
  }

  return session;
}
