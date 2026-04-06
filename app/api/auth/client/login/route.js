import { NextResponse } from 'next/server';
import { authenticateClientUser, createClientSession } from '@/utils/auth/client';
import { buildRedirectUrl } from '@/utils/http/redirect';

export async function POST(request) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const user = await authenticateClientUser(email, password);

  if (!user) {
    return NextResponse.redirect(buildRedirectUrl(request, '/portal-login?error=invalid'), {
      status: 303,
    });
  }

  await createClientSession(user);

  return NextResponse.redirect(buildRedirectUrl(request, '/portal'), {
    status: 303,
  });
}
