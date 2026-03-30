'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- AUDIT ACTIONS ---
export async function logAudit(actionDesc, userName = 'Admin') {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert([{ action: actionDesc, user_name: userName }])
}

// --- CASHFLOW ACTIONS ---
export async function addTransaction(formData) {
  const supabase = await createClient()
  
  const type = formData.get('type') // 'income' or 'expense'
  const amount = parseFloat(formData.get('amount'))
  const description = formData.get('description')
  const entity_name = formData.get('entity_name') // 'De' or 'Hacia'

  const { error } = await supabase.from('cashflow').insert([{ 
    type, 
    amount, 
    description, 
    entity_name 
  }])
  
  if (!error) {
    const typeStr = type === 'income' ? 'Ingreso' : 'Egreso'
    await logAudit(`Registró un ${typeStr} de $${amount} (${description})`)
  }
  
  revalidatePath('/cashflow')
  return { success: !error }
}

export async function deleteTransaction(id, description) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('cashflow').delete().eq('id', id)
  
  if (!error) {
    await logAudit(`Eliminó transacción: ${description}`)
  }
  
  revalidatePath('/cashflow')
  return { success: !error }
}

// --- CLIENTS ACTIONS ---
export async function insertClient(data) {
  const supabase = await createClient()
  const payload = {
    name: data.get('name'),
    pack_type: data.get('pack_type') || '1', // '0', '1', '2' or 'custom'
    pack_dev_fee: parseFloat(data.get('pack_dev_fee') || 0),
    pack_monthly_fee: parseFloat(data.get('pack_monthly_fee') || 0),
    status: data.get('status') || 'active'
  }

  const { data: newClient, error } = await supabase.from('clients').insert([payload]).select().single()
  
  if (!error && newClient) {
    await logAudit(`Agregó el cliente "${newClient.name}" con tipo de pack ${newClient.pack_type}`)

    // ✨ Nueva Funcionalidad: Auto-presupuesto para Packs Personalizados
    if (newClient.pack_type === 'custom') {
      const devFee = newClient.pack_dev_fee;
      const monthlyFee = newClient.pack_monthly_fee;
      const currentMonth = new Date().getMonth(); // 0 = Jan, 11 = Dec

      // 1. Ingreso por Desarrollo (solo ocurre en el mes en el que se inscribió)
      if (devFee > 0) {
        let devItem = { type: 'income', name: `Desarrollo - ${newClient.name}` }
        for (let i = 0; i < 12; i++) devItem[`m${i}`] = (i === currentMonth) ? devFee : 0
        await supabase.from('budget_items').insert([devItem])
      }

      // 2. Mensualidad Fija (se factura desde el mes actual hasta final de año, Diciembre)
      if (monthlyFee > 0) {
        let monthlyItem = { type: 'income', name: `Mensual - ${newClient.name}` }
        for (let i = 0; i < 12; i++) monthlyItem[`m${i}`] = (i >= currentMonth) ? monthlyFee : 0
        await supabase.from('budget_items').insert([monthlyItem])
      }
    }
  }

  revalidatePath('/clients')
  revalidatePath('/budget') // Presupuesto mutado, forzamos re-build
  return { success: !error }
}

export async function updateClientStatus(id, newStatus, clientName) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', id)
  
  if (!error) {
    const verb = newStatus === 'inactive' ? 'Desactivó' : 'Reactivó';
    await logAudit(`${verb} al cliente "${clientName}"`)
  }
  
  revalidatePath('/clients')
  return { success: !error }
}

// --- BUDGET ACTIONS ---
export async function addBudgetItem(type, name) {
  const supabase = await createClient()
  const { error } = await supabase.from('budget_items').insert([{ type, name }])
  if (!error) await logAudit(`Agregó fila de presupuesto: ${name} (${type})`)
  revalidatePath('/budget')
  return { success: !error }
}

export async function removeBudgetItem(id, name) {
  const supabase = await createClient()
  const { error } = await supabase.from('budget_items').delete().eq('id', id)
  if (!error) await logAudit(`Eliminó fila de presupuesto: ${name}`)
  revalidatePath('/budget')
  return { success: !error }
}

export async function updateBudgetCell(id, monthIndex, value) {
  const supabase = await createClient()
  const valToSave = parseFloat(value) || 0
  const colName = `m${monthIndex}`

  const { error } = await supabase.from('budget_items').update({ [colName]: valToSave }).eq('id', id)
  // Nota: no loguearemos cada teclazo individual del budget para no inundar el audit
  revalidatePath('/budget')
  return { success: !error }
}

// --- KANBAN ACTIONS ---
export async function addKanbanTask(columnId, title, priority='low', deadline=null) {
  const supabase = await createClient()
  const payload = { column_id: columnId, title, priority, deadline }
  const { error } = await supabase.from('kanban_tasks').insert([payload])
  if (!error) await logAudit(`Agregó la tarea: "${title}"`)
  revalidatePath('/tasks')
  revalidatePath('/calendar')
  return { success: !error }
}

export async function updateTaskColumn(taskId, title, newColumnId) {
  const supabase = await createClient()
  const { error } = await supabase.from('kanban_tasks').update({ column_id: newColumnId }).eq('id', taskId)
  if (!error) await logAudit(`Movió la tarea "${title}"`)
  revalidatePath('/tasks')
  return { success: !error }
}

export async function deleteKanbanTask(taskId, title) {
  const supabase = await createClient()
  const { error } = await supabase.from('kanban_tasks').delete().eq('id', taskId)
  if (!error) await logAudit(`Eliminó la tarea: "${title}"`)
  revalidatePath('/tasks')
  revalidatePath('/calendar')
  return { success: !error }
}
