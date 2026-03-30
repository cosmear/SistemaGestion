'use server'

import { createClient as createSupabase } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function loginClientPortal(formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  const supabase = await createSupabase()

  // Buscar en client_users si coincide el email y pass
  const { data: user, error } = await supabase
     .from('client_users')
     .select('id, client_id, clients(name)')
     .eq('email', email)
     .eq('password', password)
     .single()

  if (user && !error) {
    // Esconder cookie de Auth Cliente (diferente a session_user del admin)
    const cookieStore = await cookies()
    cookieStore.set('client_session', JSON.stringify({
       userId: user.id,
       clientId: user.client_id,
       clientName: user.clients.name
    }), { 
       httpOnly: true, 
       path: '/', 
       maxAge: 60 * 60 * 24 * 7 
    })
    return { success: true }
  }

  return { success: false, error: 'Credenciales inválidas o no autorizadas.' }
}

export async function logoutClientPortal() {
  const cookieStore = await cookies()
  cookieStore.delete('client_session')
  redirect('/portal-login')
}

export async function submitClientTicket(title, description) {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('client_session')?.value
  
  if(!sessionStr) return { success: false, error: 'Unauthenticated' };
  
  const session = JSON.parse(sessionStr);
  const supabase = await createSupabase();

  const { error } = await supabase.from('tickets').insert([{
     client_id: session.clientId,
     title,
     description,
     status: 'open'
  }]);

  revalidatePath('/portal')
  // We also revalidate tickets for admin inbox implicitly?
  // Revalidating entire '/tickets' helps when admins look.
  revalidatePath('/tickets')
  
  return { success: !error }
}
