import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_PREFIX = 'scrypt';
const DEFAULT_SECRET_FALLBACK = 'loop-smith-session-fallback';

function getSecretSeed() {
  return [
    process.env.SESSION_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    DEFAULT_SECRET_FALLBACK,
  ]
    .filter(Boolean)
    .join('::');
}

function getSecretKey() {
  return createHash('sha256').update(getSecretSeed()).digest();
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function buildSessionPayload(payload, maxAge = 60 * 60 * 24 * 7) {
  const issuedAt = Math.floor(Date.now() / 1000);

  return {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + maxAge,
  };
}

export function signSessionToken(payload) {
  const body = encodePayload(payload);
  const signature = createHmac('sha256', getSecretKey()).update(body).digest('base64url');

  return `${body}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [body, rawSignature] = token.split('.');

  if (!body || !rawSignature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', getSecretKey()).update(body).digest();
  const providedSignature = Buffer.from(rawSignature, 'base64url');

  if (expectedSignature.length !== providedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  try {
    const payload = decodePayload(body);

    if (payload?.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  const normalizedPassword = String(password || '').trim();
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(normalizedPassword, salt, 64).toString('hex');

  return `${PASSWORD_PREFIX}:${salt}:${derivedKey}`;
}

export function verifyPasswordHash(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const [algorithm, salt, hash] = storedHash.split(':');

  if (algorithm !== PASSWORD_PREFIX || !salt || !hash) {
    return false;
  }

  const candidate = scryptSync(String(password || '').trim(), salt, 64).toString('hex');
  const expectedBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = Buffer.from(candidate, 'hex');

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, candidateBuffer);
}
