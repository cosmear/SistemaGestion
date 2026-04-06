import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/utils/auth/admin';
import { buildRedirectUrl } from '@/utils/http/redirect';

export async function POST(request) {
  await destroyAdminSession();

  return NextResponse.redirect(buildRedirectUrl(request, '/login'), {
    status: 303,
  });
}
