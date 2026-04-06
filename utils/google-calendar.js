import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const GOOGLE_CALENDAR_SCOPE = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

export const GOOGLE_CALENDAR_CONNECT_PATH = '/api/google-calendar/connect';
export const GOOGLE_CALENDAR_CALLBACK_PATH = '/api/google-calendar/callback';
export const GOOGLE_CALENDAR_OAUTH_COOKIE = 'google_calendar_oauth_state';

function trimValue(value) {
  const normalized = String(value || '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(value) {
  const normalized = trimValue(value);
  return normalized ? normalized.toLowerCase() : null;
}

function mapAccountRecord(account) {
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    userId: account.user_id,
    googleUserId: account.google_user_id,
    email: account.email,
    displayName: account.display_name || account.email,
    scope: account.scope || '',
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    lastSyncedAt: account.last_synced_at,
    encryptedRefreshToken: account.encrypted_refresh_token,
    encryptedAccessToken: account.encrypted_access_token,
    accessTokenExpiresAt: account.access_token_expires_at,
  };
}

function mapSourceRecord(source) {
  if (!source) {
    return null;
  }

  return {
    id: source.id,
    accountId: source.account_id,
    googleCalendarId: source.google_calendar_id,
    summary: source.summary,
    description: source.description,
    backgroundColor: source.background_color || '#4285F4',
    foregroundColor: source.foreground_color || '#FFFFFF',
    accessRole: source.access_role || 'reader',
    primaryCalendar: source.primary_calendar === true,
    isHidden: source.is_hidden === true,
    isSelected: source.is_selected !== false,
    timeZone: source.time_zone,
    createdAt: source.created_at,
    updatedAt: source.updated_at,
  };
}

function getGoogleCalendarEnv() {
  const clientId = trimValue(process.env.GOOGLE_CALENDAR_CLIENT_ID);
  const clientSecret = trimValue(process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
  const tokenSecret = trimValue(process.env.GOOGLE_CALENDAR_TOKEN_SECRET);

  if (!clientId || !clientSecret || !tokenSecret) {
    throw new Error(
      'Faltan GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET o GOOGLE_CALENDAR_TOKEN_SECRET.'
    );
  }

  return {
    clientId,
    clientSecret,
    tokenSecret,
  };
}

function getGoogleCalendarEncryptionKey() {
  return createHash('sha256').update(getGoogleCalendarEnv().tokenSecret).digest();
}

function encryptGoogleToken(value) {
  const normalized = trimValue(value);

  if (!normalized) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getGoogleCalendarEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

function decryptGoogleToken(value) {
  const normalized = trimValue(value);

  if (!normalized) {
    return null;
  }

  const [ivPart, authTagPart, encryptedPart] = normalized.split('.');

  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('El token de Google guardado tiene un formato invalido.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getGoogleCalendarEncryptionKey(),
    Buffer.from(ivPart, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function buildGoogleError(label, payload, response) {
  const responseError = payload?.error_description || payload?.error?.message || payload?.error;
  const message = responseError || `Google devolvio ${response.status} al intentar ${label}.`;

  return new Error(message);
}

async function fetchGoogleJson(url, options = {}, label = 'consultar Google Calendar') {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const responseText = await response.text();
  let payload = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { raw: responseText };
    }
  }

  if (!response.ok) {
    throw buildGoogleError(label, payload, response);
  }

  return payload;
}

function buildGoogleCalendarRedirectUri(origin) {
  return new URL(GOOGLE_CALENDAR_CALLBACK_PATH, origin).toString();
}

function buildGoogleCalendarStatusRedirect(origin, status) {
  const url = new URL('/calendar', origin);
  url.searchParams.set('google', status);
  return url;
}

async function fetchGoogleCalendarList(accessToken) {
  const items = [];
  let pageToken = null;

  do {
    const url = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList');
    url.searchParams.set('maxResults', '250');

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const payload = await fetchGoogleJson(
      url.toString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      'listar los calendarios conectados'
    );

    items.push(...(payload.items || []));
    pageToken = payload.nextPageToken || null;
  } while (pageToken);

  return items;
}

async function fetchGoogleCalendarEvents(accessToken, calendarId, range) {
  const items = [];
  let pageToken = null;

  do {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    );

    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('showDeleted', 'false');
    url.searchParams.set('maxResults', '2500');
    url.searchParams.set('timeMin', range.timeMin);
    url.searchParams.set('timeMax', range.timeMax);

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const payload = await fetchGoogleJson(
      url.toString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      'traer los eventos de Google Calendar'
    );

    items.push(...(payload.items || []));
    pageToken = payload.nextPageToken || null;
  } while (pageToken);

  return items;
}

function buildGoogleCalendarEvent(event, account, source) {
  const start = event?.start?.dateTime || event?.start?.date;
  const end = event?.end?.dateTime || event?.end?.date || null;

  if (!start) {
    return null;
  }

  const backgroundColor = source.backgroundColor || '#4285F4';

  return {
    id: `google_${account.id}_${source.googleCalendarId}_${event.id}`,
    title: trimValue(event.summary) || 'Evento de Google',
    start,
    end,
    allDay: Boolean(event?.start?.date && !event?.start?.dateTime),
    backgroundColor,
    borderColor: backgroundColor,
    textColor: source.foregroundColor || '#FFFFFF',
    extendedProps: {
      isGoogleEvent: true,
      googleHtmlLink: event.htmlLink || null,
      googleEventId: event.id,
      googleAccountEmail: account.email,
      googleAccountName: account.displayName,
      googleCalendarId: source.googleCalendarId,
      googleCalendarSummary: source.summary,
      sourceLabel: source.summary,
    },
  };
}

function shouldRefreshGoogleToken(account) {
  if (!account?.encryptedAccessToken || !account?.accessTokenExpiresAt) {
    return true;
  }

  const expiresAt = new Date(account.accessTokenExpiresAt).getTime();

  if (Number.isNaN(expiresAt)) {
    return true;
  }

  return expiresAt - Date.now() <= 60 * 1000;
}

async function updateGoogleCalendarAccountTokens(supabase, accountId, tokens = {}) {
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (tokens.accessToken) {
    payload.encrypted_access_token = encryptGoogleToken(tokens.accessToken);
  }

  if (tokens.refreshToken) {
    payload.encrypted_refresh_token = encryptGoogleToken(tokens.refreshToken);
  }

  if (tokens.expiresAt) {
    payload.access_token_expires_at = tokens.expiresAt;
  }

  if (tokens.scope) {
    payload.scope = tokens.scope;
  }

  const { error } = await supabase
    .from('google_calendar_accounts')
    .update(payload)
    .eq('id', accountId);

  if (error) {
    throw new Error(error.message);
  }
}

async function getGoogleCalendarSourcesByAccountIds(supabase, accountIds = [], onlySelected = false) {
  if (!Array.isArray(accountIds) || accountIds.length === 0) {
    return [];
  }

  let query = supabase
    .from('google_calendar_sources')
    .select('*')
    .in('account_id', accountIds)
    .order('primary_calendar', { ascending: false })
    .order('summary', { ascending: true });

  if (onlySelected) {
    query = query.eq('is_selected', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapSourceRecord).filter(Boolean);
}

export function isGoogleCalendarConfigured() {
  try {
    getGoogleCalendarEnv();
    return true;
  } catch {
    return false;
  }
}

export function canManageGoogleCalendar(session) {
  return Boolean(session?.userId) && !String(session.userId).startsWith('legacy-');
}

export function buildGoogleCalendarAuthorizationUrl(origin, state) {
  const { clientId } = getGoogleCalendarEnv();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', buildGoogleCalendarRedirectUri(origin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set('state', state);

  return url.toString();
}

export function buildGoogleCalendarRedirectResponse(origin, status) {
  return buildGoogleCalendarStatusRedirect(origin, status);
}

export function encodeGoogleCalendarOauthState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeGoogleCalendarOauthState(value) {
  const normalized = trimValue(value);

  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(normalized, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function createGoogleCalendarOauthState(session) {
  return {
    state: randomBytes(24).toString('hex'),
    userId: session.userId,
    issuedAt: Date.now(),
  };
}

export function isValidGoogleCalendarOauthState(savedState, incomingState, session) {
  if (!savedState || !incomingState || !session?.userId) {
    return false;
  }

  const maxAgeMs = 10 * 60 * 1000;

  return (
    savedState.state === incomingState &&
    savedState.userId === session.userId &&
    Number.isFinite(savedState.issuedAt) &&
    Date.now() - savedState.issuedAt <= maxAgeMs
  );
}

export async function exchangeGoogleCalendarCode(code, origin) {
  const { clientId, clientSecret } = getGoogleCalendarEnv();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: buildGoogleCalendarRedirectUri(origin),
    grant_type: 'authorization_code',
  });

  const payload = await fetchGoogleJson(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
    'intercambiar el codigo OAuth'
  );

  return {
    accessToken: payload.access_token || null,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString()
      : null,
    scope: payload.scope || GOOGLE_CALENDAR_SCOPE,
  };
}

export async function refreshGoogleCalendarAccessToken(refreshToken) {
  const normalizedRefreshToken = trimValue(refreshToken);

  if (!normalizedRefreshToken) {
    throw new Error('La cuenta de Google no tiene refresh token disponible.');
  }

  const { clientId, clientSecret } = getGoogleCalendarEnv();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: normalizedRefreshToken,
    grant_type: 'refresh_token',
  });

  const payload = await fetchGoogleJson(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
    'renovar el access token de Google'
  );

  return {
    accessToken: payload.access_token || null,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString()
      : null,
    scope: payload.scope || GOOGLE_CALENDAR_SCOPE,
  };
}

export async function fetchGoogleCalendarProfile(accessToken) {
  return fetchGoogleJson(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    'leer el perfil de Google'
  );
}

export async function getGoogleCalendarAccountRecord(supabase, userId, accountId) {
  const normalizedUserId = trimValue(userId);
  const normalizedAccountId = trimValue(accountId);

  if (!normalizedUserId || !normalizedAccountId) {
    return null;
  }

  const { data, error } = await supabase
    .from('google_calendar_accounts')
    .select('*')
    .eq('id', normalizedAccountId)
    .eq('user_id', normalizedUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return mapAccountRecord(data);
}

export async function getGoogleCalendarSourceRecord(supabase, userId, sourceId) {
  const normalizedSourceId = trimValue(sourceId);

  if (!normalizedSourceId) {
    return null;
  }

  const { data: sourceRow, error: sourceError } = await supabase
    .from('google_calendar_sources')
    .select('*')
    .eq('id', normalizedSourceId)
    .maybeSingle();

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  if (!sourceRow) {
    return null;
  }

  const account = await getGoogleCalendarAccountRecord(supabase, userId, sourceRow.account_id);

  if (!account) {
    return null;
  }

  return {
    account,
    source: mapSourceRecord(sourceRow),
  };
}

export async function getGoogleCalendarConnections(supabase, userId) {
  const normalizedUserId = trimValue(userId);

  if (!normalizedUserId) {
    return [];
  }

  const { data: accountsData, error: accountsError } = await supabase
    .from('google_calendar_accounts')
    .select('*')
    .eq('user_id', normalizedUserId)
    .order('created_at', { ascending: true });

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  const accounts = (accountsData || []).map(mapAccountRecord).filter(Boolean);
  const sources = await getGoogleCalendarSourcesByAccountIds(
    supabase,
    accounts.map((account) => account.id)
  );

  const sourcesByAccount = sources.reduce((accumulator, source) => {
    if (!accumulator[source.accountId]) {
      accumulator[source.accountId] = [];
    }

    accumulator[source.accountId].push(source);
    return accumulator;
  }, {});

  return accounts.map((account) => ({
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
    lastSyncedAt: account.lastSyncedAt,
    sources: sourcesByAccount[account.id] || [],
  }));
}

export async function getGoogleCalendarAccessToken(supabase, account) {
  if (!account?.id) {
    throw new Error('La cuenta de Google solicitada no existe.');
  }

  if (!shouldRefreshGoogleToken(account)) {
    const existingToken = decryptGoogleToken(account.encryptedAccessToken);

    if (existingToken) {
      return existingToken;
    }
  }

  const refreshToken = decryptGoogleToken(account.encryptedRefreshToken);
  const refreshedToken = await refreshGoogleCalendarAccessToken(refreshToken);

  if (!refreshedToken.accessToken) {
    throw new Error('Google no devolvio un access token valido.');
  }

  await updateGoogleCalendarAccountTokens(supabase, account.id, refreshedToken);

  return refreshedToken.accessToken;
}

export async function syncGoogleCalendarSourcesForAccount(supabase, account) {
  const accessToken = await getGoogleCalendarAccessToken(supabase, account);
  const calendars = await fetchGoogleCalendarList(accessToken);
  const existingSources = await getGoogleCalendarSourcesByAccountIds(supabase, [account.id]);
  const existingSourceMap = Object.fromEntries(
    existingSources.map((source) => [source.googleCalendarId, source])
  );
  const now = new Date().toISOString();

  const upsertPayload = calendars.map((calendar) => {
    const existingSource = existingSourceMap[calendar.id];
    const suggestedSelection =
      existingSource?.isSelected ??
      (calendar.selected !== false && calendar.hidden !== true);

    return {
      account_id: account.id,
      google_calendar_id: calendar.id,
      summary: trimValue(calendar.summary) || 'Calendario sin nombre',
      description: trimValue(calendar.description),
      background_color: trimValue(calendar.backgroundColor) || '#4285F4',
      foreground_color: trimValue(calendar.foregroundColor) || '#FFFFFF',
      access_role: trimValue(calendar.accessRole) || 'reader',
      primary_calendar: calendar.primary === true,
      is_hidden: calendar.hidden === true,
      is_selected: suggestedSelection,
      time_zone: trimValue(calendar.timeZone),
      created_at: existingSource?.createdAt || now,
      updated_at: now,
    };
  });

  if (upsertPayload.length > 0) {
    const { error: upsertError } = await supabase
      .from('google_calendar_sources')
      .upsert(upsertPayload, {
        onConflict: 'account_id,google_calendar_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  const currentCalendarIds = new Set(calendars.map((calendar) => calendar.id));
  const staleSourceIds = existingSources
    .filter((source) => !currentCalendarIds.has(source.googleCalendarId))
    .map((source) => source.id);

  if (staleSourceIds.length > 0) {
    const { error: cleanupError } = await supabase
      .from('google_calendar_sources')
      .delete()
      .in('id', staleSourceIds);

    if (cleanupError) {
      throw new Error(cleanupError.message);
    }
  }

  const { error: accountError } = await supabase
    .from('google_calendar_accounts')
    .update({
      last_synced_at: now,
      updated_at: now,
    })
    .eq('id', account.id);

  if (accountError) {
    throw new Error(accountError.message);
  }

  return {
    calendars: upsertPayload.length,
  };
}

export async function saveGoogleCalendarAccountFromCode(supabase, session, code, origin) {
  if (!canManageGoogleCalendar(session)) {
    throw new Error('Este usuario necesita una cuenta interna vigente para conectar Google Calendar.');
  }

  const tokens = await exchangeGoogleCalendarCode(code, origin);

  if (!tokens.accessToken) {
    throw new Error('Google no devolvio un access token utilizable.');
  }

  const profile = await fetchGoogleCalendarProfile(tokens.accessToken);
  const googleUserId = trimValue(profile.sub);
  const email = normalizeEmail(profile.email);

  if (!googleUserId || !email) {
    throw new Error('Google no devolvio el email o identificador de la cuenta.');
  }

  let existingAccount = null;

  const { data: byGoogleId, error: byGoogleIdError } = await supabase
    .from('google_calendar_accounts')
    .select('*')
    .eq('user_id', session.userId)
    .eq('google_user_id', googleUserId)
    .maybeSingle();

  if (byGoogleIdError) {
    throw new Error(byGoogleIdError.message);
  }

  existingAccount = mapAccountRecord(byGoogleId);

  if (!existingAccount) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from('google_calendar_accounts')
      .select('*')
      .eq('user_id', session.userId)
      .eq('email', email)
      .maybeSingle();

    if (byEmailError) {
      throw new Error(byEmailError.message);
    }

    existingAccount = mapAccountRecord(byEmail);
  }

  const encryptedRefreshToken =
    tokens.refreshToken ? encryptGoogleToken(tokens.refreshToken) : existingAccount?.encryptedRefreshToken;

  if (!encryptedRefreshToken) {
    throw new Error(
      'Google no devolvio refresh token. Vuelve a conectar la cuenta aceptando el permiso offline.'
    );
  }

  const payload = {
    user_id: session.userId,
    google_user_id: googleUserId,
    email,
    display_name: trimValue(profile.name) || email,
    encrypted_refresh_token: encryptedRefreshToken,
    encrypted_access_token: encryptGoogleToken(tokens.accessToken),
    access_token_expires_at: tokens.expiresAt,
    scope: tokens.scope || GOOGLE_CALENDAR_SCOPE,
    updated_at: new Date().toISOString(),
  };

  let savedAccount = null;

  if (existingAccount) {
    const { data, error } = await supabase
      .from('google_calendar_accounts')
      .update(payload)
      .eq('id', existingAccount.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    savedAccount = mapAccountRecord(data);
  } else {
    const { data, error } = await supabase
      .from('google_calendar_accounts')
      .insert([
        {
          ...payload,
          created_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    savedAccount = mapAccountRecord(data);
  }

  await syncGoogleCalendarSourcesForAccount(supabase, savedAccount);

  return savedAccount;
}

export async function getGoogleCalendarEvents(supabase, session, range) {
  if (!isGoogleCalendarConfigured() || !canManageGoogleCalendar(session)) {
    return [];
  }

  const { data: accountsData, error: accountsError } = await supabase
    .from('google_calendar_accounts')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: true });

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  const accounts = (accountsData || []).map(mapAccountRecord).filter(Boolean);

  if (accounts.length === 0) {
    return [];
  }

  const selectedSources = await getGoogleCalendarSourcesByAccountIds(
    supabase,
    accounts.map((account) => account.id),
    true
  );

  const sourcesByAccount = selectedSources.reduce((accumulator, source) => {
    if (!accumulator[source.accountId]) {
      accumulator[source.accountId] = [];
    }

    accumulator[source.accountId].push(source);
    return accumulator;
  }, {});

  const allEvents = [];

  await Promise.all(
    accounts.map(async (account) => {
      const accountSources = sourcesByAccount[account.id] || [];

      if (accountSources.length === 0) {
        return;
      }

      try {
        const accessToken = await getGoogleCalendarAccessToken(supabase, account);
        const rangePayload = {
          timeMin: range.start.toISOString(),
          timeMax: range.end.toISOString(),
        };

        const accountEvents = await Promise.all(
          accountSources.map(async (source) => {
            try {
              const events = await fetchGoogleCalendarEvents(
                accessToken,
                source.googleCalendarId,
                rangePayload
              );

              return events
                .filter((event) => event.status !== 'cancelled')
                .map((event) => buildGoogleCalendarEvent(event, account, source))
                .filter(Boolean);
            } catch (error) {
              console.error(
                `No se pudieron leer eventos de Google para ${account.email} / ${source.summary}:`,
                error
              );
              return [];
            }
          })
        );

        allEvents.push(...accountEvents.flat());
      } catch (error) {
        console.error(`No se pudo autenticar la cuenta de Google ${account.email}:`, error);
      }
    })
  );

  return allEvents.sort((left, right) => {
    const leftTime = new Date(left.start).getTime();
    const rightTime = new Date(right.start).getTime();

    return leftTime - rightTime;
  });
}
