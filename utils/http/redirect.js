const WILDCARD_HOSTS = ['0.0.0.0', '[::]'];

function normalizeHost(host) {
  if (!host) {
    return null;
  }

  const normalizedHost = host.trim();
  const wildcardHost = WILDCARD_HOSTS.find(
    (value) => normalizedHost === value || normalizedHost.startsWith(`${value}:`)
  );

  if (!wildcardHost) {
    return normalizedHost;
  }

  return normalizedHost.replace(wildcardHost, 'localhost');
}

function getRequestHost(request) {
  return (
    normalizeHost(request.headers.get('x-forwarded-host')) ||
    normalizeHost(request.headers.get('host')) ||
    normalizeHost(request.nextUrl.host) ||
    'localhost:3000'
  );
}

function getRequestProtocol(request, host) {
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

  if (forwardedProtocol) {
    return forwardedProtocol;
  }

  if (
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0') ||
    host.startsWith('[::]')
  ) {
    return 'http';
  }

  return request.nextUrl.protocol.replace(':', '') || 'https';
}

export function buildRedirectUrl(request, target) {
  const host = getRequestHost(request);
  const protocol = getRequestProtocol(request, host);

  return new URL(target, `${protocol}://${host}`);
}
