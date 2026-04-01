'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/utils/auth/admin'
import { hashPassword } from '@/utils/auth/token'
import { canAccessBoard, isClientAssigned, normalizeInternalRole } from '@/utils/auth/permissions'
import {
  getActiveInternalUsers,
  getInternalUserById,
  getInternalUserDisplayName,
} from '@/utils/internal-users'
import { createClient } from '@/utils/supabase/server'
import { ensureBoardColumns, getClientBoardId } from '@/utils/boards'
import { buildInvoiceTitle, getCurrentPeriodKey } from '@/utils/billing'

function trimValue(value) {
  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeIdValue(value) {
  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeIdList(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return Array.from(
    new Set(
      values
        .map((value) => normalizeIdValue(value))
        .filter(Boolean)
    )
  )
}

function actorNameFromSession(session) {
  return session.fullName || session.username || 'Admin'
}

function normalizeTicketPriority(priority) {
  if (priority === 'critical') return 'high'
  if (['high', 'medium', 'low'].includes(priority)) return priority
  return 'medium'
}

function normalizeTaskPriority(priority) {
  if (['high', 'medium', 'low'].includes(priority)) {
    return priority
  }

  return 'low'
}

function normalizeTaskSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) {
    return []
  }

  return subtasks
    .map((subtask) => ({
      text: String(subtask?.text || '').trim(),
      done: Boolean(subtask?.done),
    }))
    .filter((subtask) => subtask.text.length > 0)
}

function normalizeClientPayload(data) {
  return {
    name: String(data.name || '').trim(),
    pack_type: data.pack_type || '1',
    pack_dev_fee: numberValue(data.pack_dev_fee, 0),
    pack_monthly_fee: numberValue(data.pack_monthly_fee, 0),
    website_url: trimValue(data.website_url),
    phone_whatsapp: trimValue(data.phone_whatsapp),
    contact_name: trimValue(data.contact_name),
    contact_email: trimValue(data.contact_email)?.toLowerCase() || null,
    notes: trimValue(data.notes),
    onboarding_status: data.onboarding_status || 'pending',
    renewal_date: trimValue(data.renewal_date),
    status: data.status || 'active',
  }
}

function normalizeCalendarVisibility(value) {
  return value === 'global' ? 'global' : 'personal'
}

function normalizeNoteScope(value) {
  return value === 'client' ? 'client' : 'personal'
}

function canAccessClientResource(session, clientId) {
  if (!clientId) {
    return true
  }

  return isClientAssigned(session, clientId)
}

async function getColumnWithBoard(supabase, columnId) {
  const { data, error } = await supabase
    .from('kanban_columns')
    .select('id, title, board_id')
    .eq('id', columnId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function getTaskWithBoard(supabase, taskId) {
  const { data, error } = await supabase
    .from('kanban_tasks')
    .select(`
      id,
      title,
      column_id,
      kanban_columns!inner(
        id,
        title,
        board_id
      )
    `)
    .eq('id', taskId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function getValidatedAssignedUser(supabase, assignedUserId) {
  const normalizedUserId = normalizeIdValue(assignedUserId)

  if (!normalizedUserId) {
    return { assignedUserId: null, assignedUserName: null }
  }

  const user = await getInternalUserById(supabase, normalizedUserId)

  if (!user || user.is_active === false) {
    return { error: 'El usuario asignado no existe o esta inactivo.' }
  }

  return {
    assignedUserId: user.id,
    assignedUserName: getInternalUserDisplayName(user),
  }
}

async function syncInternalUserClients(supabase, userId, clientIds = []) {
  const normalizedClientIds = normalizeIdList(clientIds)

  const { error: deleteError } = await supabase
    .from('internal_user_clients')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (normalizedClientIds.length === 0) {
    return
  }

  const { error: insertError } = await supabase.from('internal_user_clients').insert(
    normalizedClientIds.map((clientId) => ({
      user_id: userId,
      client_id: clientId,
    }))
  )

  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function syncCalendarEventAttendees(supabase, eventId, sharedUserIds = []) {
  const normalizedUserIds = normalizeIdList(sharedUserIds)

  const { error: deleteError } = await supabase
    .from('calendar_event_attendees')
    .delete()
    .eq('event_id', eventId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (normalizedUserIds.length === 0) {
    return
  }

  const activeUsers = await getActiveInternalUsers(supabase)
  const validUserIds = new Set(activeUsers.map((user) => user.id))
  const payload = normalizedUserIds
    .filter((userId) => validUserIds.has(userId))
    .map((userId) => ({
      event_id: eventId,
      user_id: userId,
    }))

  if (payload.length === 0) {
    return
  }

  const { error: insertError } = await supabase.from('calendar_event_attendees').insert(payload)

  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function getNoteById(supabase, noteId) {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, scope, client_id, created_by_user_id')
    .eq('id', noteId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

function canAccessNote(session, note) {
  if (!note) {
    return false
  }

  if (note.scope === 'personal') {
    return note.created_by_user_id === session.userId
  }

  return canAccessClientResource(session, note.client_id)
}

function getTicketAuditSummary(updates) {
  const labels = []

  if (updates.status) labels.push(`estado ${updates.status}`)
  if (updates.classification !== undefined) labels.push(`clasificacion ${updates.classification || 'sin clasificar'}`)
  if (updates.priority) labels.push(`prioridad ${updates.priority}`)
  if (updates.assigned_to !== undefined) labels.push(`responsable ${updates.assigned_to || 'sin asignar'}`)
  if (updates.due_at !== undefined) labels.push(`vencimiento ${updates.due_at || 'sin fecha'}`)

  return labels.join(', ')
}

function revalidateAdminShell() {
  revalidatePath('/')
  revalidatePath('/clients')
  revalidatePath('/tasks')
  revalidatePath('/calendar')
  revalidatePath('/notes')
  revalidatePath('/tickets')
  revalidatePath('/billing')
  revalidatePath('/audit')
  revalidatePath('/users')
}

export async function logAudit(actionDesc, userName = 'Sistema') {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert([{ action: actionDesc, user_name: userName }])
}

export async function saveInternalUser(userId, data = {}) {
  const session = await requireAdminSession(['admin'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedUserId = normalizeIdValue(userId)
  const normalizedUsername = String(data.username || '').trim()
  const normalizedFullName = trimValue(data.fullName || data.full_name)
  const normalizedRole = normalizeInternalRole(data.role)
  const normalizedPassword = String(data.password || '').trim()
  const clientIds = normalizeIdList(data.clientIds || data.client_ids)

  if (!normalizedUsername) {
    return { success: false, error: 'El usuario interno necesita un nombre de acceso.' }
  }

  if (!normalizedUserId && !normalizedPassword) {
    return { success: false, error: 'La contrasena es obligatoria para nuevos usuarios.' }
  }

  let duplicateQuery = supabase
    .from('internal_users')
    .select('id')
    .ilike('username', normalizedUsername)
    .limit(1)

  if (normalizedUserId) {
    duplicateQuery = duplicateQuery.neq('id', normalizedUserId)
  }

  const { data: duplicateUser, error: duplicateError } = await duplicateQuery.maybeSingle()

  if (duplicateError) {
    return { success: false, error: duplicateError.message }
  }

  if (duplicateUser) {
    return { success: false, error: 'Ya existe otro usuario interno con ese nombre.' }
  }

  const payload = {
    username: normalizedUsername,
    full_name: normalizedFullName,
    role: normalizedRole,
  }

  if (typeof data.isActive === 'boolean' || !normalizedUserId) {
    payload.is_active = data.isActive !== false
  }

  if (normalizedPassword) {
    payload.password_hash = hashPassword(normalizedPassword)
  }

  let savedUser = null
  let error = null

  if (normalizedUserId) {
    const response = await supabase
      .from('internal_users')
      .update(payload)
      .eq('id', normalizedUserId)
      .select('id, username, full_name, role, is_active')
      .single()

    savedUser = response.data
    error = response.error
  } else {
    const response = await supabase
      .from('internal_users')
      .insert([payload])
      .select('id, username, full_name, role, is_active')
      .single()

    savedUser = response.data
    error = response.error
  }

  if (error || !savedUser) {
    return { success: false, error: error?.message || 'No se pudo guardar el usuario.' }
  }

  try {
    await syncInternalUserClients(
      supabase,
      savedUser.id,
      normalizedRole === 'employee' || normalizedRole === 'operator' ? clientIds : []
    )
  } catch (assignmentError) {
    return { success: false, error: assignmentError.message }
  }

  const actionLabel = normalizedUserId ? 'Actualizo' : 'Creo'
  await logAudit(`${actionLabel} el usuario interno "${savedUser.username}" (${normalizedRole})`, actorName)
  revalidateAdminShell()

  return {
    success: true,
    user: {
      ...savedUser,
      full_name: savedUser.full_name || savedUser.username,
      role: normalizedRole,
    },
  }
}

export async function setInternalUserStatus(userId, isActive) {
  const session = await requireAdminSession(['admin'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedUserId = normalizeIdValue(userId)

  if (!normalizedUserId) {
    return { success: false, error: 'Usuario no encontrado.' }
  }

  if (normalizedUserId === session.userId && !isActive) {
    return { success: false, error: 'No puedes desactivar tu propia cuenta desde este panel.' }
  }

  const { data: updatedUser, error } = await supabase
    .from('internal_users')
    .update({ is_active: Boolean(isActive) })
    .eq('id', normalizedUserId)
    .select('id, username, full_name')
    .single()

  if (error || !updatedUser) {
    return { success: false, error: error?.message || 'No se pudo actualizar el usuario.' }
  }

  await logAudit(
    `${Boolean(isActive) ? 'Activo' : 'Desactivo'} el usuario interno "${updatedUser.username}"`,
    actorName
  )
  revalidateAdminShell()

  return { success: true }
}

export async function addTransaction(formData) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()

  const type = formData.get('type')
  const amount = numberValue(formData.get('amount'))
  const description = trimValue(formData.get('description'))
  const entity_name = trimValue(formData.get('entity_name'))

  const { error } = await supabase.from('cashflow').insert([
    {
      type,
      amount,
      description,
      entity_name,
    },
  ])

  if (!error) {
    const typeLabel = type === 'income' ? 'Ingreso' : 'Egreso'
    await logAudit(`Registro un ${typeLabel} de $${amount} (${description})`, actorName)
  }

  revalidatePath('/cashflow')
  revalidatePath('/')

  return { success: !error, error: error?.message }
}

export async function deleteTransaction(id, description) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()

  const { error } = await supabase.from('cashflow').delete().eq('id', id)

  if (!error) {
    await logAudit(`Elimino transaccion: ${description}`, actorName)
  }

  revalidatePath('/cashflow')
  revalidatePath('/')

  return { success: !error, error: error?.message }
}

export async function insertClient(data) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const payload = normalizeClientPayload(data)

  const { data: newClient, error } = await supabase
    .from('clients')
    .insert([payload])
    .select()
    .single()

  if (!error && newClient) {
    await logAudit(`Agrego el cliente "${newClient.name}" con pack ${newClient.pack_type}`, actorName)

    if (newClient.pack_type === 'custom') {
      const devFee = Number(newClient.pack_dev_fee || 0)
      const monthlyFee = Number(newClient.pack_monthly_fee || 0)
      const currentMonth = new Date().getMonth()

      if (devFee > 0) {
        const devItem = { type: 'income', name: `Desarrollo - ${newClient.name}` }
        for (let index = 0; index < 12; index += 1) {
          devItem[`m${index}`] = index === currentMonth ? devFee : 0
        }
        await supabase.from('budget_items').insert([devItem])
      }

      if (monthlyFee > 0) {
        const monthlyItem = { type: 'income', name: `Mensual - ${newClient.name}` }
        for (let index = 0; index < 12; index += 1) {
          monthlyItem[`m${index}`] = index >= currentMonth ? monthlyFee : 0
        }
        await supabase.from('budget_items').insert([monthlyItem])
      }
    }
  }

  revalidateAdminShell()
  revalidatePath('/budget')
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}

export async function updateClient(clientId, data) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const payload = normalizeClientPayload(data)

  const { error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', clientId)

  if (!error) {
    await logAudit(`Actualizo la ficha del cliente "${payload.name}"`, actorName)
  }

  revalidateAdminShell()
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}

export async function updateClientStatus(id, newStatus, clientName) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', id)

  if (!error) {
    const verb = newStatus === 'inactive' ? 'Desactivo' : 'Reactivo'
    await logAudit(`${verb} al cliente "${clientName}"`, actorName)
  }

  revalidateAdminShell()

  return { success: !error, error: error?.message }
}

export async function setClientCredentials(clientId, email, password) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedPassword = String(password || '').trim()

  if (!normalizedEmail || !normalizedPassword) {
    return { success: false, error: 'Email y contrasena son obligatorios.' }
  }

  const { data: existingCredential } = await supabase
    .from('client_users')
    .select('id, client_id')
    .eq('email', normalizedEmail)
    .neq('client_id', clientId)
    .maybeSingle()

  if (existingCredential) {
    return { success: false, error: 'Ese email ya esta asignado a otro cliente.' }
  }

  await supabase.from('client_users').delete().eq('client_id', clientId)

  const { error } = await supabase.from('client_users').insert([
    {
      client_id: clientId,
      email: normalizedEmail,
      password_hash: hashPassword(normalizedPassword),
      is_active: true,
    },
  ])

  if (!error) {
    await logAudit(`Actualizo credenciales del portal para cliente ID ${clientId}`, actorName)
  }

  revalidatePath('/clients')

  return { success: !error, error: error?.message }
}

export async function deleteClientCredential(clientId) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('client_users').delete().eq('client_id', clientId)

  if (!error) {
    await logAudit(`Revoco acceso B2B al cliente ID ${clientId}`, actorName)
  }

  revalidatePath('/clients')

  return { success: !error, error: error?.message }
}

export async function deleteClient(clientId, clientName) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const boardId = getClientBoardId(clientId)

  const { data: boardColumns, error: boardColumnsError } = await supabase
    .from('kanban_columns')
    .select('id')
    .eq('board_id', boardId)

  if (boardColumnsError) {
    return { success: false, error: boardColumnsError.message }
  }

  const columnIds = (boardColumns || []).map((column) => column.id)

  if (columnIds.length > 0) {
    const { error: boardTasksError } = await supabase
      .from('kanban_tasks')
      .delete()
      .in('column_id', columnIds)

    if (boardTasksError) {
      return { success: false, error: boardTasksError.message }
    }
  }

  const { error: boardCleanupError } = await supabase
    .from('kanban_columns')
    .delete()
    .eq('board_id', boardId)

  if (boardCleanupError) {
    return { success: false, error: boardCleanupError.message }
  }

  const { data: ticketRows } = await supabase
    .from('tickets')
    .select('id')
    .eq('client_id', clientId)

  const ticketIds = (ticketRows || []).map((ticket) => ticket.id)

  if (ticketIds.length > 0) {
    const { error: commentsError } = await supabase
      .from('ticket_comments')
      .delete()
      .in('ticket_id', ticketIds)

    if (commentsError) {
      return { success: false, error: commentsError.message }
    }
  }

  const cleanupTargets = [
    supabase.from('client_users').delete().eq('client_id', clientId),
    supabase.from('tickets').delete().eq('client_id', clientId),
    supabase.from('invoices').delete().eq('client_id', clientId),
  ]

  for (const request of cleanupTargets) {
    const { error } = await request
    if (error) {
      return { success: false, error: error.message }
    }
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (!error) {
    await logAudit(`Elimino el cliente "${clientName}" y limpio sus accesos/tableros`, actorName)
  }

  revalidateAdminShell()
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}

export async function updateTicketDetails(ticketId, updates) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const payload = {}

  if ('status' in updates) {
    payload.status = updates.status
    payload.closed_at = updates.status === 'resolved' ? new Date().toISOString() : null
  }

  if ('classification' in updates) {
    payload.classification = updates.classification || null
  }

  if ('priority' in updates) {
    payload.priority = updates.priority || 'medium'
  }

  if ('assigned_to' in updates) {
    payload.assigned_to = updates.assigned_to || null
  }

  if ('due_at' in updates) {
    payload.due_at = updates.due_at || null
  }

  const { error } = await supabase
    .from('tickets')
    .update(payload)
    .eq('id', ticketId)

  if (!error) {
    const summary = getTicketAuditSummary(updates)
    await logAudit(`Actualizo ticket ${ticketId}: ${summary}`, actorName)
  }

  revalidateAdminShell()
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}

export async function updateTicketStatus(ticketId, newStatus) {
  return updateTicketDetails(ticketId, { status: newStatus })
}

export async function updateTicketClassification(ticketId, classificationStr) {
  return updateTicketDetails(ticketId, { classification: classificationStr })
}

export async function updateTicketPriority(ticketId, priority) {
  return updateTicketDetails(ticketId, { priority })
}

export async function updateTicketAssignee(ticketId, assignedTo) {
  return updateTicketDetails(ticketId, { assigned_to: assignedTo })
}

export async function updateTicketDueDate(ticketId, dueAt) {
  return updateTicketDetails(ticketId, { due_at: dueAt })
}

export async function addTicketComment(ticketId, message, visibility = 'internal') {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedMessage = String(message || '').trim()

  if (!normalizedMessage) {
    return { success: false, error: 'Escribe un comentario antes de guardarlo.' }
  }

  const { error } = await supabase.from('ticket_comments').insert([
    {
      ticket_id: ticketId,
      author_name: actorName,
      author_role: session.role || 'admin',
      message: normalizedMessage,
      visibility,
    },
  ])

  if (!error) {
    await logAudit(`Agrego comentario ${visibility} al ticket ${ticketId}`, actorName)
  }

  revalidatePath('/tickets')
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}

export async function convertTicketToTask(ticketId) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const assignedUserId =
    session.userId && !String(session.userId).startsWith('legacy-') ? session.userId : null

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, title, client_id, priority, status, clients(name)')
    .eq('id', ticketId)
    .maybeSingle()

  if (ticketError || !ticket) {
    return { success: false, error: ticketError?.message || 'Ticket no encontrado.' }
  }

  const boardId = ticket.client_id ? getClientBoardId(ticket.client_id) : 'team'

  try {
    const columns = await ensureBoardColumns(supabase, boardId)
    const todoColumn = columns[0]

    const { error: taskError } = await supabase.from('kanban_tasks').insert([
      {
        column_id: todoColumn.id,
        title: `[Ticket] ${ticket.title}`,
        priority: normalizeTicketPriority(ticket.priority),
        linked_ticket_id: ticket.id,
        assigned_user_id: assignedUserId,
      },
    ])

    if (taskError) {
      return { success: false, error: taskError.message }
    }

    await supabase
      .from('tickets')
      .update({
        status: ticket.status === 'new' ? 'in_progress' : ticket.status,
        assigned_to: actorName,
      })
      .eq('id', ticket.id)

    await logAudit(`Convirtio el ticket "${ticket.title}" en tarea operativa`, actorName)
    revalidateAdminShell()

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function addBudgetItem(type, name) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('budget_items').insert([{ type, name }])

  if (!error) {
    await logAudit(`Agrego fila de presupuesto: ${name} (${type})`, actorName)
  }

  revalidatePath('/budget')

  return { success: !error, error: error?.message }
}

export async function removeBudgetItem(id, name) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('budget_items').delete().eq('id', id)

  if (!error) {
    await logAudit(`Elimino fila de presupuesto: ${name}`, actorName)
  }

  revalidatePath('/budget')

  return { success: !error, error: error?.message }
}

export async function updateBudgetCell(id, monthIndex, value) {
  await requireAdminSession(['admin', 'manager'])
  const supabase = await createClient()
  const valToSave = parseFloat(value) || 0
  const colName = `m${monthIndex}`

  const { error } = await supabase.from('budget_items').update({ [colName]: valToSave }).eq('id', id)

  revalidatePath('/budget')

  return { success: !error, error: error?.message }
}

export async function addKanbanTask(columnId, title, priority = 'low', deadline = null, options = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedTitle = String(title || '').trim()

  if (!normalizedTitle) {
    return { success: false, error: 'El titulo es obligatorio.' }
  }

  const column = await getColumnWithBoard(supabase, columnId)

  if (!column) {
    return { success: false, error: 'La columna seleccionada no existe.' }
  }

  if (!canAccessBoard(session, column.board_id)) {
    return { success: false, error: 'No tienes permiso para crear tareas en ese tablero.' }
  }

  const assignedUser = await getValidatedAssignedUser(supabase, options.assignedUserId)

  if (assignedUser.error) {
    return { success: false, error: assignedUser.error }
  }

  const payload = {
    column_id: columnId,
    title: normalizedTitle,
    priority: normalizeTaskPriority(priority),
    deadline: trimValue(deadline),
    linked_ticket_id: options.linkedTicketId || null,
    subtasks: normalizeTaskSubtasks(options.subtasks),
    assigned_user_id: assignedUser.assignedUserId,
  }

  const { data: createdTask, error } = await supabase
    .from('kanban_tasks')
    .insert([payload])
    .select('*')
    .single()

  if (!error) {
    await logAudit(`Agrego la tarea "${normalizedTitle}"`, actorName)
  }

  revalidateAdminShell()

  return { success: !error, error: error?.message, task: createdTask || null }
}

export async function updateTaskColumn(taskId, title, newColumnId) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const task = await getTaskWithBoard(supabase, taskId)

  if (!task) {
    return { success: false, error: 'La tarea ya no existe.' }
  }

  if (!canAccessBoard(session, task.kanban_columns?.board_id)) {
    return { success: false, error: 'No tienes permiso para mover esta tarea.' }
  }

  const targetColumn = await getColumnWithBoard(supabase, newColumnId)

  if (!targetColumn) {
    return { success: false, error: 'La columna de destino no existe.' }
  }

  if (!canAccessBoard(session, targetColumn.board_id)) {
    return { success: false, error: 'No tienes permiso para mover tareas a ese tablero.' }
  }

  const { error } = await supabase.from('kanban_tasks').update({ column_id: newColumnId }).eq('id', taskId)

  if (!error) {
    await logAudit(`Movio la tarea "${title}"`, actorName)
  }

  revalidateAdminShell()

  return { success: !error, error: error?.message }
}

export async function updateKanbanTask(taskId, updates = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const task = await getTaskWithBoard(supabase, taskId)
  const payload = {}

  if (!task) {
    return { success: false, error: 'La tarea ya no existe.' }
  }

  if (!canAccessBoard(session, task.kanban_columns?.board_id)) {
    return { success: false, error: 'No tienes permiso para editar esta tarea.' }
  }

  if ('title' in updates) {
    const normalizedTitle = String(updates.title || '').trim()

    if (!normalizedTitle) {
      return { success: false, error: 'El titulo es obligatorio.' }
    }

    payload.title = normalizedTitle
  }

  if ('priority' in updates) {
    payload.priority = normalizeTaskPriority(updates.priority)
  }

  if ('deadline' in updates) {
    payload.deadline = trimValue(updates.deadline)
  }

  if ('subtasks' in updates) {
    payload.subtasks = normalizeTaskSubtasks(updates.subtasks)
  }

  if ('assignedUserId' in updates || 'assigned_user_id' in updates) {
    const assignedUser = await getValidatedAssignedUser(
      supabase,
      updates.assignedUserId ?? updates.assigned_user_id
    )

    if (assignedUser.error) {
      return { success: false, error: assignedUser.error }
    }

    payload.assigned_user_id = assignedUser.assignedUserId
  }

  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'No hay cambios para guardar.' }
  }

  const { data: updatedTask, error } = await supabase
    .from('kanban_tasks')
    .update(payload)
    .eq('id', taskId)
    .select('*')
    .single()

  if (!error && updatedTask) {
    await logAudit(`Actualizo la tarea "${updatedTask.title}"`, actorName)
  }

  revalidateAdminShell()

  return { success: !error, error: error?.message, task: updatedTask || null }
}

export async function deleteKanbanTask(taskId, title) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const task = await getTaskWithBoard(supabase, taskId)

  if (!task) {
    return { success: false, error: 'La tarea ya no existe.' }
  }

  if (!canAccessBoard(session, task.kanban_columns?.board_id)) {
    return { success: false, error: 'No tienes permiso para eliminar esta tarea.' }
  }

  const { error } = await supabase.from('kanban_tasks').delete().eq('id', taskId)

  if (!error) {
    await logAudit(`Elimino la tarea "${title}"`, actorName)
  }

  revalidateAdminShell()

  return { success: !error, error: error?.message }
}

export async function addCalendarEvent(input, legacyDateStr, legacyType = 'meeting') {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const payload =
    typeof input === 'object' && input !== null
      ? input
      : {
          title: input,
          dateStr: legacyDateStr,
          type: legacyType,
        }
  const title = String(payload.title || '').trim()
  const dateStr = trimValue(payload.dateStr || payload.date)
  const type = trimValue(payload.type) || 'meeting'
  const visibility = normalizeCalendarVisibility(payload.visibility)
  const sharedUserIds = normalizeIdList(payload.sharedUserIds || payload.shared_user_ids).filter(
    (userId) => userId !== session.userId
  )

  if (!title || !dateStr) {
    return { success: false, error: 'El titulo y la fecha del evento son obligatorios.' }
  }

  const createdByUserId =
    session.userId && !String(session.userId).startsWith('legacy-') ? session.userId : null

  const { data: createdEvent, error } = await supabase
    .from('calendar_events')
    .insert([
      {
        title,
        date: dateStr,
        type,
        visibility,
        created_by_user_id: createdByUserId,
      },
    ])
    .select('*')
    .single()

  if (error || !createdEvent) {
    return { success: false, error: error?.message || 'No se pudo guardar el evento.' }
  }

  try {
    await syncCalendarEventAttendees(supabase, createdEvent.id, sharedUserIds)
  } catch (attendeeError) {
    await supabase.from('calendar_events').delete().eq('id', createdEvent.id)
    return { success: false, error: attendeeError.message }
  }

  await logAudit(`Agenda el evento "${title}"`, actorName)

  revalidatePath('/calendar')
  revalidatePath('/')

  return { success: true, event: createdEvent }
}

export async function deleteCalendarEvent(id, title) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedId = normalizeIdValue(id)

  if (!normalizedId) {
    return { success: false, error: 'Evento no encontrado.' }
  }

  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .select('id, title, created_by_user_id')
    .eq('id', normalizedId)
    .maybeSingle()

  if (eventError || !event) {
    return { success: false, error: eventError?.message || 'Evento no encontrado.' }
  }

  const isOwner = event.created_by_user_id && event.created_by_user_id === session.userId
  const canDelete = session.role === 'admin' || session.role === 'manager' || isOwner

  if (!canDelete) {
    return { success: false, error: 'Solo el creador o un administrador pueden borrar este evento.' }
  }

  await supabase.from('calendar_event_attendees').delete().eq('event_id', normalizedId)
  const { error } = await supabase.from('calendar_events').delete().eq('id', normalizedId)

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit(`Cancelo el evento "${title || event.title}"`, actorName)

  revalidatePath('/calendar')
  revalidatePath('/')

  return { success: true }
}

export async function saveNote(noteId, data = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedNoteId = normalizeIdValue(noteId)
  const scope = normalizeNoteScope(data.scope)
  const title = trimValue(data.title)
  const content = String(data.content || '').trim()
  const clientId = scope === 'client' ? normalizeIdValue(data.clientId || data.client_id) : null

  if (!content) {
    return { success: false, error: 'La nota no puede quedar vacia.' }
  }

  if (!session.userId || String(session.userId).startsWith('legacy-')) {
    return { success: false, error: 'Este usuario necesita una cuenta interna vigente para usar notas.' }
  }

  if (scope === 'client') {
    if (!clientId) {
      return { success: false, error: 'Selecciona un cliente para guardar una nota de cliente.' }
    }

    if (!canAccessClientResource(session, clientId)) {
      return { success: false, error: 'No tienes acceso para escribir notas sobre ese cliente.' }
    }
  }

  const payload = {
    title,
    content,
    scope,
    client_id: clientId,
    updated_at: new Date().toISOString(),
  }

  if (normalizedNoteId) {
    const existingNote = await getNoteById(supabase, normalizedNoteId)

    if (!existingNote || !canAccessNote(session, existingNote)) {
      return { success: false, error: 'No tienes permiso para editar esta nota.' }
    }

    if (scope === 'personal' && existingNote.created_by_user_id !== session.userId) {
      return { success: false, error: 'Solo el autor puede convertir o mantener una nota personal.' }
    }

    const { data: updatedNote, error } = await supabase
      .from('notes')
      .update(payload)
      .eq('id', normalizedNoteId)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit(`Actualizo una nota ${scope === 'client' ? 'de cliente' : 'personal'}`, actorName)
    revalidateAdminShell()
    return { success: true, note: updatedNote }
  }

  const { data: createdNote, error } = await supabase
    .from('notes')
    .insert([
      {
        ...payload,
        created_by_user_id: session.userId,
        created_at: new Date().toISOString(),
      },
    ])
    .select('*')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit(`Creo una nota ${scope === 'client' ? 'de cliente' : 'personal'}`, actorName)
  revalidateAdminShell()
  return { success: true, note: createdNote }
}

export async function deleteNote(noteId) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedNoteId = normalizeIdValue(noteId)

  if (!normalizedNoteId) {
    return { success: false, error: 'Nota no encontrada.' }
  }

  const note = await getNoteById(supabase, normalizedNoteId)

  if (!note || !canAccessNote(session, note)) {
    return { success: false, error: 'No tienes permiso para borrar esta nota.' }
  }

  const { error } = await supabase.from('notes').delete().eq('id', normalizedNoteId)

  if (error) {
    return { success: false, error: error.message }
  }

  await logAudit(`Elimino una nota ${note.scope === 'client' ? 'de cliente' : 'personal'}`, actorName)
  revalidateAdminShell()
  return { success: true }
}

export async function createInvoice(data) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const clientId = data.clientId || data.client_id
  const periodKey = String(data.periodKey || data.period_key || getCurrentPeriodKey()).slice(0, 7)
  const dueDate = trimValue(data.dueDate || data.due_date)
  const notes = trimValue(data.notes)
  const amount = numberValue(data.amount, 0)

  if (!clientId || amount <= 0) {
    return { success: false, error: 'Cliente y monto son obligatorios.' }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: clientError?.message || 'Cliente no encontrado.' }
  }

  const payload = {
    client_id: clientId,
    period_key: periodKey,
    title: buildInvoiceTitle(client.name, periodKey),
    amount,
    due_date: dueDate,
    status: data.status || 'pending',
    notes,
    created_by: actorName,
  }

  const { error } = await supabase.from('invoices').insert([payload])

  if (!error) {
    await logAudit(`Creo una factura para "${client.name}" (${periodKey}) por $${amount}`, actorName)
  }

  revalidateAdminShell()
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}

export async function generateMonthlyInvoices(periodKey, dueDate) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const targetPeriod = String(periodKey || getCurrentPeriodKey()).slice(0, 7)
  const normalizedDueDate = trimValue(dueDate)

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, pack_monthly_fee')
    .eq('status', 'active')

  if (clientsError) {
    return { success: false, error: clientsError.message }
  }

  const invoicePayload = (clients || [])
    .filter((client) => Number(client.pack_monthly_fee || 0) > 0)
    .map((client) => ({
      client_id: client.id,
      period_key: targetPeriod,
      title: buildInvoiceTitle(client.name, targetPeriod),
      amount: Number(client.pack_monthly_fee || 0),
      due_date: normalizedDueDate,
      status: 'pending',
      created_by: actorName,
    }))

  if (invoicePayload.length === 0) {
    return { success: true, created: 0 }
  }

  const { error } = await supabase.from('invoices').upsert(invoicePayload, {
    onConflict: 'client_id,period_key',
    ignoreDuplicates: true,
  })

  if (!error) {
    await logAudit(`Genero facturas masivas para ${targetPeriod} (${invoicePayload.length} clientes)`, actorName)
  }

  revalidateAdminShell()
  revalidatePath('/portal')

  return { success: !error, created: invoicePayload.length, error: error?.message }
}

export async function updateInvoiceStatus(invoiceId, nextStatus) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, title, amount, status, paid_at, cashflow_transaction_id, clients(name)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (invoiceError || !invoice) {
    return { success: false, error: invoiceError?.message || 'Factura no encontrada.' }
  }

  if (invoice.cashflow_transaction_id && invoice.status === 'paid' && nextStatus !== 'paid') {
    return {
      success: false,
      error: 'Las facturas ya conciliadas no pueden volver a pendiente automaticamente.',
    }
  }

  let cashflowTransactionId = invoice.cashflow_transaction_id

  if (nextStatus === 'paid' && !cashflowTransactionId) {
    const { data: cashflowRow, error: cashflowError } = await supabase
      .from('cashflow')
      .insert([
        {
          type: 'income',
          amount: invoice.amount,
          description: invoice.title,
          entity_name: invoice.clients?.name || 'Cliente',
          source_type: 'invoice',
          source_id: invoice.id,
        },
      ])
      .select('id')
      .single()

    if (cashflowError) {
      return { success: false, error: cashflowError.message }
    }

    cashflowTransactionId = cashflowRow.id
  }

  const payload = {
    status: nextStatus,
    paid_at: nextStatus === 'paid' ? (invoice.paid_at || new Date().toISOString()) : invoice.paid_at,
  }

  if (cashflowTransactionId) {
    payload.cashflow_transaction_id = cashflowTransactionId
  }

  const { error } = await supabase.from('invoices').update(payload).eq('id', invoiceId)

  if (!error) {
    await logAudit(`Actualizo factura "${invoice.title}" a ${nextStatus}`, actorName)
  }

  revalidateAdminShell()
  revalidatePath('/cashflow')
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}

export async function deleteInvoice(invoiceId) {
  const session = await requireAdminSession(['admin', 'manager'])
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, title, cashflow_transaction_id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (invoiceError || !invoice) {
    return { success: false, error: invoiceError?.message || 'Factura no encontrada.' }
  }

  if (invoice.cashflow_transaction_id || invoice.status === 'paid') {
    return {
      success: false,
      error: 'No se puede eliminar una factura ya cobrada o conciliada.',
    }
  }

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)

  if (!error) {
    await logAudit(`Elimino la factura "${invoice.title}"`, actorName)
  }

  revalidateAdminShell()
  revalidatePath('/portal')

  return { success: !error, error: error?.message }
}
