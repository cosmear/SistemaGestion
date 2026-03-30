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
