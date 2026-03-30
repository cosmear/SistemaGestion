'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/utils/auth/admin'
import { hashPassword } from '@/utils/auth/token'
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

function actorNameFromSession(session) {
  return session.fullName || session.username || 'Admin'
}

function normalizeTicketPriority(priority) {
  if (priority === 'critical') return 'high'
  if (['high', 'medium', 'low'].includes(priority)) return priority
  return 'medium'
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
  revalidatePath('/tickets')
  revalidatePath('/billing')
  revalidatePath('/audit')
}

export async function logAudit(actionDesc, userName = 'Sistema') {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert([{ action: actionDesc, user_name: userName }])
}

export async function addTransaction(formData) {
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()

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
  const session = await requireAdminSession()
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
  const session = await requireAdminSession()
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
  await requireAdminSession()
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
  const payload = {
    column_id: columnId,
    title,
    priority,
    deadline,
    linked_ticket_id: options.linkedTicketId || null,
  }

  const { error } = await supabase.from('kanban_tasks').insert([payload])

  if (!error) {
    await logAudit(`Agrego la tarea "${title}"`, actorName)
  }

  revalidatePath('/tasks')
  revalidatePath('/calendar')

  return { success: !error, error: error?.message }
}

export async function updateTaskColumn(taskId, title, newColumnId) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('kanban_tasks').update({ column_id: newColumnId }).eq('id', taskId)

  if (!error) {
    await logAudit(`Movio la tarea "${title}"`, actorName)
  }

  revalidatePath('/tasks')

  return { success: !error, error: error?.message }
}

export async function deleteKanbanTask(taskId, title) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('kanban_tasks').delete().eq('id', taskId)

  if (!error) {
    await logAudit(`Elimino la tarea "${title}"`, actorName)
  }

  revalidatePath('/tasks')
  revalidatePath('/calendar')

  return { success: !error, error: error?.message }
}

export async function addCalendarEvent(title, dateStr, type = 'meeting') {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('calendar_events').insert([
    {
      title,
      date: dateStr,
      type,
    },
  ])

  if (!error) {
    await logAudit(`Agenda el evento "${title}"`, actorName)
  }

  revalidatePath('/calendar')
  revalidatePath('/')

  return { success: !error, error: error?.message }
}

export async function deleteCalendarEvent(id, title) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)

  if (!error) {
    await logAudit(`Cancelo el evento "${title}"`, actorName)
  }

  revalidatePath('/calendar')
  revalidatePath('/')

  return { success: !error, error: error?.message }
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
