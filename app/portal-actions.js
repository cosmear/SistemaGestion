'use server'

import { createClient as createSupabase } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  authenticateClientUser,
  createClientSession,
  destroyClientSession,
  requireClientSession,
} from '@/utils/auth/client'

function trimValue(value) {
  const normalized = String(value || '').trim()
  return normalized.length > 0 ? normalized : null
}

export async function loginClientPortal(_previousState, formData) {
  const email = formData.get('email')
  const password = formData.get('password')
  const user = await authenticateClientUser(email, password)

  if (user) {
    await createClientSession(user)
    redirect('/portal')
  }

  return { error: 'Credenciales invalidas o usuario sin acceso.' }
}

export async function logoutClientPortal() {
  await destroyClientSession()
  redirect('/portal-login')
}

export async function submitClientTicket(title, description) {
  const session = await requireClientSession()
  const supabase = await createSupabase()
  const normalizedTitle = trimValue(title)
  const normalizedDescription = trimValue(description)

  if (!normalizedTitle || !normalizedDescription) {
    return { success: false, error: 'Completa el asunto y la descripcion del pedido.' }
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert([
      {
        client_id: session.clientId,
        title: normalizedTitle,
        description: normalizedDescription,
        status: 'new',
        priority: 'medium',
        source: 'portal',
      },
    ])
    .select('id, title, description, status, priority, created_at')
    .single()

  revalidatePath('/portal')
  revalidatePath('/tickets')

  return {
    success: !error,
    error: error?.message,
    ticket: ticket
      ? {
          ...ticket,
          ticket_comments: [],
        }
      : null,
  }
}

export async function submitClientTicketComment(ticketId, message) {
  const session = await requireClientSession()
  const supabase = await createSupabase()
  const normalizedMessage = String(message || '').trim()

  if (!normalizedMessage) {
    return { success: false, error: 'Escribe un mensaje antes de enviarlo.' }
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id')
    .eq('id', ticketId)
    .eq('client_id', session.clientId)
    .maybeSingle()

  if (ticketError || !ticket) {
    return { success: false, error: ticketError?.message || 'Ticket no encontrado.' }
  }

  const { data: comment, error } = await supabase
    .from('ticket_comments')
    .insert([
      {
        ticket_id: ticket.id,
        author_name: session.clientName,
        author_role: 'client',
        visibility: 'public',
        message: normalizedMessage,
      },
    ])
    .select('id, message, visibility, author_name, author_role, created_at')
    .single()

  revalidatePath('/portal')
  revalidatePath('/tickets')

  return { success: !error, error: error?.message, comment: comment || null }
}
