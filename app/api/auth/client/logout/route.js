import { NextResponse } from 'next/server';
import { destroyClientSession } from '@/utils/auth/client';
import { buildRedirectUrl } from '@/utils/http/redirect';

export async function POST(request) {
  await destroyClientSession();

  return NextResponse.redirect(buildRedirectUrl(request, '/portal-login'), {
    status: 303,
  });
}
