'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authenticateAdminUser, createAdminSession, destroyAdminSession } from '@/utils/auth/admin'

export async function loginUser(_previousState, formData) {
  const username = formData.get('username')
  const password = formData.get('password')
  const user = await authenticateAdminUser(username, password)

  if (user) {
    await createAdminSession(user)
    redirect('/')
  }

  return { error: 'Credenciales incorrectas o usuario inactivo.' }
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('session_user')
  await destroyAdminSession()
  redirect('/login')
}
