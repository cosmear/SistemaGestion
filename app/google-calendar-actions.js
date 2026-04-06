'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/utils/auth/admin';
import {
  canManageGoogleCalendar,
  getGoogleCalendarAccountRecord,
  getGoogleCalendarSourceRecord,
  isGoogleCalendarConfigured,
  syncGoogleCalendarSourcesForAccount,
} from '@/utils/google-calendar';
import { createClient } from '@/utils/supabase/server';

function actorNameFromSession(session) {
  return session.fullName || session.username || 'Admin';
}

async function logGoogleCalendarAudit(supabase, action, session) {
  await supabase.from('audit_logs').insert([
    {
      action,
      user_name: actorNameFromSession(session),
    },
  ]);
}

function revalidateCalendarViews() {
  revalidatePath('/calendar');
  revalidatePath('/');
}

export async function disconnectGoogleCalendarAccount(accountId) {
  const session = await requireAdminSession();

  if (!isGoogleCalendarConfigured()) {
    return { success: false, error: 'La integracion con Google Calendar no esta configurada.' };
  }

  if (!canManageGoogleCalendar(session)) {
    return {
      success: false,
      error: 'Este usuario necesita una cuenta interna vigente para usar Google Calendar.',
    };
  }

  const supabase = await createClient();
  const account = await getGoogleCalendarAccountRecord(supabase, session.userId, accountId);

  if (!account) {
    return { success: false, error: 'La cuenta de Google ya no existe o no te pertenece.' };
  }

  const { error } = await supabase
    .from('google_calendar_accounts')
    .delete()
    .eq('id', account.id)
    .eq('user_id', session.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logGoogleCalendarAudit(
    supabase,
    `Desconecto la cuenta de Google Calendar "${account.email}"`,
    session
  );

  revalidateCalendarViews();

  return { success: true };
}

export async function setGoogleCalendarSourceEnabled(sourceId, isSelected) {
  const session = await requireAdminSession();

  if (!isGoogleCalendarConfigured()) {
    return { success: false, error: 'La integracion con Google Calendar no esta configurada.' };
  }

  if (!canManageGoogleCalendar(session)) {
    return {
      success: false,
      error: 'Este usuario necesita una cuenta interna vigente para usar Google Calendar.',
    };
  }

  const supabase = await createClient();
  const sourceRecord = await getGoogleCalendarSourceRecord(supabase, session.userId, sourceId);

  if (!sourceRecord) {
    return { success: false, error: 'Ese calendario externo no existe o no te pertenece.' };
  }

  const { error } = await supabase
    .from('google_calendar_sources')
    .update({
      is_selected: Boolean(isSelected),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceRecord.source.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logGoogleCalendarAudit(
    supabase,
    `${Boolean(isSelected) ? 'Activo' : 'Oculto'} el calendario externo "${sourceRecord.source.summary}"`,
    session
  );

  revalidateCalendarViews();

  return { success: true };
}

export async function refreshGoogleCalendarAccountSources(accountId) {
  const session = await requireAdminSession();

  if (!isGoogleCalendarConfigured()) {
    return { success: false, error: 'La integracion con Google Calendar no esta configurada.' };
  }

  if (!canManageGoogleCalendar(session)) {
    return {
      success: false,
      error: 'Este usuario necesita una cuenta interna vigente para usar Google Calendar.',
    };
  }

  const supabase = await createClient();
  const account = await getGoogleCalendarAccountRecord(supabase, session.userId, accountId);

  if (!account) {
    return { success: false, error: 'La cuenta de Google ya no existe o no te pertenece.' };
  }

  try {
    const result = await syncGoogleCalendarSourcesForAccount(supabase, account);

    await logGoogleCalendarAudit(
      supabase,
      `Actualizo los calendarios visibles de Google para "${account.email}"`,
      session
    );

    revalidateCalendarViews();

    return {
      success: true,
      calendars: result.calendars,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo actualizar la cuenta de Google.',
    };
  }
}
