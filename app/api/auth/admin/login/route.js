import { NextResponse } from 'next/server';
import { authenticateAdminUser, createAdminSession } from '@/utils/auth/admin';
import { buildRedirectUrl } from '@/utils/http/redirect';

export async function POST(request) {
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');
  const user = await authenticateAdminUser(username, password);

  if (!user) {
    return NextResponse.redirect(buildRedirectUrl(request, '/login?error=invalid'), {
      status: 303,
    });
  }

  await createAdminSession(user);

  return NextResponse.redirect(buildRedirectUrl(request, '/'), {
    status: 303,
  });
}
