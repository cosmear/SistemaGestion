import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/utils/auth/admin';

export async function POST(request) {
  await destroyAdminSession();

  return NextResponse.redirect(new URL('/login', request.url), {
    status: 303,
  });
}
