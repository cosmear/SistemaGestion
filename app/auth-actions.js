'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const USERS = {
  Cosme: 'Cosme 2002',
  Nacho: 'Nachoesputo'
}

export async function loginUser(formData) {
  const username = formData.get('username')
  const password = formData.get('password')

  if (USERS[username] && USERS[username] === password) {
    const cookieStore = await cookies()
    cookieStore.set('session_user', username, { 
       httpOnly: true, 
       path: '/', 
       maxAge: 60 * 60 * 24 * 7 // 1 week
    })
    return { success: true }
  }

  return { success: false, error: 'Credenciales incorrectas' }
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('session_user')
  redirect('/login')
}
