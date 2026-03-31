import { NextResponse } from 'next/server';
import { authenticateClientUser, createClientSession } from '@/utils/auth/client';

export async function POST(request) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const user = await authenticateClientUser(email, password);

  if (!user) {
    return NextResponse.redirect(new URL('/portal-login?error=invalid', request.url), {
      status: 303,
    });
  }

  await createClientSession(user);

  return NextResponse.redirect(new URL('/portal', request.url), {
    status: 303,
  });
}
