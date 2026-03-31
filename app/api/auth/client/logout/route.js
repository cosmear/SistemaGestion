import { NextResponse } from 'next/server';
import { destroyClientSession } from '@/utils/auth/client';

export async function POST(request) {
  await destroyClientSession();

  return NextResponse.redirect(new URL('/portal-login', request.url), {
    status: 303,
  });
}
