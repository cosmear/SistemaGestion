import { NextResponse } from 'next/server';
import { authenticateAdminUser, createAdminSession } from '@/utils/auth/admin';

export async function POST(request) {
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');
  const user = await authenticateAdminUser(username, password);

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url), {
      status: 303,
    });
  }

  await createAdminSession(user);

  return NextResponse.redirect(new URL('/', request.url), {
    status: 303,
  });
}
