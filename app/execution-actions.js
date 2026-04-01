'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/utils/auth/admin'
import { canAccessBoard } from '@/utils/auth/permissions'
import { ensureBoardColumns } from '@/utils/boards'
import { createClient } from '@/utils/supabase/server'
import {
  calculateGoalProgress,
  COMMUNICATION_MEETING_STATUS_OPTIONS,
  DAILY_MEETING_STATUS_OPTIONS,
  GOAL_PROGRESS_MODE_OPTIONS,
  normalizeStringList,
  ANNUAL_GOAL_STATUS_OPTIONS,
  MONTHLY_GOAL_STATUS_OPTIONS,
} from '@/utils/execution'

const DAILY_STATUS_VALUES = new Set(DAILY_MEETING_STATUS_OPTIONS.map((option) => option.value))
const COMMUNICATION_STATUS_VALUES = new Set(COMMUNICATION_MEETING_STATUS_OPTIONS.map((option) => option.value))
const ANNUAL_STATUS_VALUES = new Set(ANNUAL_GOAL_STATUS_OPTIONS.map((option) => option.value))
const MONTHLY_STATUS_VALUES = new Set(MONTHLY_GOAL_STATUS_OPTIONS.map((option) => option.value))
const PROGRESS_MODE_VALUES = new Set(GOAL_PROGRESS_MODE_OPTIONS.map((option) => option.value))

const TASK_RELATION_MAP = {
  daily: {
    entityTable: 'daily_meetings',
    relationTable: 'daily_meeting_tasks',
    entityColumn: 'daily_meeting_id',
    path: '/daily-meetings',
    label: 'reunion diaria',
  },
  communication: {
    entityTable: 'communication_meetings',
    relationTable: 'communication_meeting_tasks',
    entityColumn: 'communication_meeting_id',
    path: '/communication',
    label: 'reunion mensual de comunicacion',
  },
  monthlyGoal: {
    entityTable: 'monthly_goals',
    relationTable: 'monthly_goal_tasks',
    entityColumn: 'monthly_goal_id',
    path: '/monthly-goals',
    label: 'objetivo mensual',
  },
}

function trimValue(value) {
  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : null
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
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

function normalizeEnumValue(value, allowedValues, fallback) {
  const normalized = String(value || fallback).trim()
  return allowedValues.has(normalized) ? normalized : fallback
}

function revalidateExecutionShell(extraPaths = []) {
  const uniquePaths = Array.from(
    new Set([
      '/',
      '/tasks',
      '/daily-meetings',
      '/communication',
      '/annual-goals',
      '/monthly-goals',
      ...extraPaths,
    ])
  )

  uniquePaths.forEach((path) => revalidatePath(path))
}

async function logExecutionAudit(action, actorName = 'Sistema') {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert([{ action, user_name: actorName }])
}

async function validateInternalUserIds(supabase, userIds = []) {
  const normalizedUserIds = normalizeIdList(userIds)

  if (normalizedUserIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('internal_users')
    .select('id')
    .in('id', normalizedUserIds)
    .eq('is_active', true)

  if (error) {
    throw new Error(error.message)
  }

  const validIds = new Set((data || []).map((item) => item.id))
  return normalizedUserIds.filter((userId) => validIds.has(userId))
}

async function validateMonthlyGoalIds(supabase, goalIds = []) {
  const normalizedGoalIds = normalizeIdList(goalIds)

  if (normalizedGoalIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('monthly_goals')
    .select('id')
    .in('id', normalizedGoalIds)

  if (error) {
    throw new Error(error.message)
  }

  const validIds = new Set((data || []).map((item) => item.id))
  return normalizedGoalIds.filter((goalId) => validIds.has(goalId))
}

async function validateAnnualGoalId(supabase, goalId) {
  const normalizedGoalId = normalizeIdValue(goalId)

  if (!normalizedGoalId) {
    return null
  }

  const { data, error } = await supabase
    .from('annual_goals')
    .select('id')
    .eq('id', normalizedGoalId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.id || null
}

async function syncRelationTable(supabase, table, entityColumn, entityId, valueColumn, values) {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq(entityColumn, entityId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (!values.length) {
    return
  }

  const { error: insertError } = await supabase.from(table).insert(
    values.map((value) => ({
      [entityColumn]: entityId,
      [valueColumn]: value,
    }))
  )

  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function ensureEntityExists(supabase, table, entityId) {
  const normalizedId = normalizeIdValue(entityId)

  if (!normalizedId) {
    return null
  }

  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', normalizedId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.id || null
}

async function getTaskRecord(supabase, taskId) {
  const normalizedTaskId = normalizeIdValue(taskId)

  if (!normalizedTaskId) {
    return null
  }

  const { data, error } = await supabase
    .from('kanban_tasks')
    .select(`
      *,
      kanban_columns!inner(
        id,
        title,
        board_id
      )
    `)
    .eq('id', normalizedTaskId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function createTaskOnBoard(supabase, session, data = {}) {
  const boardId = normalizeIdValue(data.boardId) || `personal_${session.username || 'Admin'}`
  const title = String(data.title || '').trim()
  const priority = String(data.priority || 'medium').trim() || 'medium'
  const deadline = trimValue(data.deadline)
  let assignedUserId = normalizeIdValue(data.assignedUserId)

  if (!title) {
    return { error: 'El titulo de la tarea es obligatorio.' }
  }

  if (!canAccessBoard(session, boardId)) {
    return { error: 'No tienes permiso para crear tareas en ese tablero.' }
  }

  if (assignedUserId) {
    const validAssignees = await validateInternalUserIds(supabase, [assignedUserId])
    assignedUserId = validAssignees[0] || null
  }

  const columns = await ensureBoardColumns(supabase, boardId)
  const todoColumn = columns[0]

  if (!todoColumn) {
    return { error: 'No se pudo encontrar una columna inicial para el tablero.' }
  }

  const payload = {
    column_id: todoColumn.id,
    title,
    priority,
    deadline,
    assigned_user_id: assignedUserId,
  }

  const { data: createdTask, error } = await supabase
    .from('kanban_tasks')
    .insert([payload])
    .select(`
      *,
      kanban_columns!inner(
        id,
        title,
        board_id
      )
    `)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { task: createdTask }
}

async function linkTaskToEntityInternal(supabase, entityType, entityId, taskId) {
  const config = TASK_RELATION_MAP[entityType]

  if (!config) {
    return { success: false, error: 'Relacion de tareas no soportada.' }
  }

  const normalizedEntityId = await ensureEntityExists(supabase, config.entityTable, entityId)

  if (!normalizedEntityId) {
    return { success: false, error: `No se encontro la ${config.label}.` }
  }

  const normalizedTaskId = normalizeIdValue(taskId)

  if (!normalizedTaskId) {
    return { success: false, error: 'Selecciona una tarea valida.' }
  }

  const { error } = await supabase
    .from(config.relationTable)
    .upsert(
      [
        {
          [config.entityColumn]: normalizedEntityId,
          task_id: normalizedTaskId,
        },
      ],
      {
        onConflict: `${config.entityColumn},task_id`,
        ignoreDuplicates: true,
      }
    )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

function buildDailyMeetingPayload(session, data = {}) {
  const meetingDate = trimValue(data.meetingDate || data.meeting_date)
  const focusOfDay = trimValue(data.focusOfDay || data.focus_of_day)

  if (!meetingDate) {
    return { error: 'La fecha de la reunion diaria es obligatoria.' }
  }

  if (!focusOfDay) {
    return { error: 'El foco del dia es obligatorio.' }
  }

  return {
    payload: {
      meeting_date: meetingDate,
      focus_of_day: focusOfDay,
      priorities_of_day: normalizeStringList(data.prioritiesOfDay || data.priorities_of_day),
      blockers: normalizeStringList(data.blockers),
      decisions: trimValue(data.decisions),
      observations: trimValue(data.observations),
      status: normalizeEnumValue(data.status, DAILY_STATUS_VALUES, 'open'),
      updated_at: new Date().toISOString(),
      created_by_user_id:
        session.userId && !String(session.userId).startsWith('legacy-') ? session.userId : null,
    },
    participantIds: data.participantIds || data.participant_ids || [],
    monthlyGoalIds: data.monthlyGoalIds || data.monthly_goal_ids || [],
  }
}

function buildCommunicationMeetingPayload(session, data = {}) {
  const month = numberValue(data.month)
  const year = numberValue(data.year)
  const title = trimValue(data.title)
  const objectiveGeneral = trimValue(data.objectiveGeneral || data.objective_general)

  if (!month || month < 1 || month > 12) {
    return { error: 'El mes de la reunion mensual es obligatorio.' }
  }

  if (!year || year < 2000) {
    return { error: 'El anio de la reunion mensual es obligatorio.' }
  }

  if (!title) {
    return { error: 'El titulo de la reunion mensual es obligatorio.' }
  }

  return {
    payload: {
      month,
      year,
      title,
      objective_general: objectiveGeneral,
      key_messages: normalizeStringList(data.keyMessages || data.key_messages),
      campaigns_or_topics: normalizeStringList(data.campaignsOrTopics || data.campaigns_or_topics),
      channels: normalizeStringList(data.channels),
      required_assets: normalizeStringList(data.requiredAssets || data.required_assets),
      observations: trimValue(data.observations),
      status: normalizeEnumValue(data.status, COMMUNICATION_STATUS_VALUES, 'planned'),
      updated_at: new Date().toISOString(),
      created_by_user_id:
        session.userId && !String(session.userId).startsWith('legacy-') ? session.userId : null,
    },
    responsibleIds: data.responsibleIds || data.responsible_ids || [],
    monthlyGoalIds: data.monthlyGoalIds || data.monthly_goal_ids || [],
  }
}

function buildGoalPayload(data = {}, goalType = 'monthly') {
  const title = trimValue(data.title)

  if (!title) {
    return { error: 'El titulo es obligatorio.' }
  }

  const year = numberValue(data.year)

  if (!year || year < 2000) {
    return { error: 'El anio es obligatorio.' }
  }

  const month = goalType === 'monthly' ? numberValue(data.month) : null

  if (goalType === 'monthly' && (!month || month < 1 || month > 12)) {
    return { error: 'El mes es obligatorio.' }
  }

  const progressMode = normalizeEnumValue(
    data.progressMode || data.progress_mode,
    PROGRESS_MODE_VALUES,
    'auto'
  )
  const targetValue = numberValue(data.targetValue || data.target_value)
  const currentValue = numberValue(data.currentValue || data.current_value)
  const manualProgress = numberValue(data.progressPercentage || data.progress_percentage)
  const progressPercentage = calculateGoalProgress({
    targetValue,
    currentValue,
    manualProgress,
    progressMode,
  })

  const status = goalType === 'annual'
    ? normalizeEnumValue(data.status, ANNUAL_STATUS_VALUES, 'active')
    : normalizeEnumValue(data.status, MONTHLY_STATUS_VALUES, 'pending')

  return {
    payload: {
      title,
      description: trimValue(data.description),
      category: goalType === 'annual' ? trimValue(data.category) : null,
      metric: trimValue(data.metric || data.kpi),
      target_value: targetValue,
      current_value: currentValue,
      unit: trimValue(data.unit),
      responsible_user_id: normalizeIdValue(data.responsibleUserId || data.responsible_user_id),
      year,
      month,
      annual_goal_id: goalType === 'monthly' ? normalizeIdValue(data.annualGoalId || data.annual_goal_id) : null,
      status,
      progress_mode: progressMode,
      progress_percentage: progressPercentage,
      updated_at: new Date().toISOString(),
    },
  }
}

export async function saveDailyMeeting(meetingId, data = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedMeetingId = normalizeIdValue(meetingId)
  const resolved = buildDailyMeetingPayload(session, data)

  if (resolved.error) {
    return { success: false, error: resolved.error }
  }

  const participantIds = await validateInternalUserIds(supabase, resolved.participantIds)
  const monthlyGoalIds = await validateMonthlyGoalIds(supabase, resolved.monthlyGoalIds)
  const payload = { ...resolved.payload }

  if (normalizedMeetingId) {
    delete payload.created_by_user_id
  }

  const response = normalizedMeetingId
    ? await supabase
        .from('daily_meetings')
        .update(payload)
        .eq('id', normalizedMeetingId)
        .select('*')
        .single()
    : await supabase
        .from('daily_meetings')
        .insert([{ ...payload }])
        .select('*')
        .single()

  if (response.error || !response.data) {
    return { success: false, error: response.error?.message || 'No se pudo guardar la reunion diaria.' }
  }

  try {
    await syncRelationTable(
      supabase,
      'daily_meeting_participants',
      'daily_meeting_id',
      response.data.id,
      'user_id',
      participantIds
    )
    await syncRelationTable(
      supabase,
      'daily_meeting_monthly_goals',
      'daily_meeting_id',
      response.data.id,
      'monthly_goal_id',
      monthlyGoalIds
    )
  } catch (relationError) {
    return { success: false, error: relationError.message }
  }

  await logExecutionAudit(
    `${normalizedMeetingId ? 'Actualizo' : 'Creo'} la reunion diaria del ${response.data.meeting_date}`,
    actorName
  )
  revalidateExecutionShell()

  return { success: true, meeting: response.data }
}

export async function saveCommunicationMeeting(meetingId, data = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedMeetingId = normalizeIdValue(meetingId)
  const resolved = buildCommunicationMeetingPayload(session, data)

  if (resolved.error) {
    return { success: false, error: resolved.error }
  }

  const responsibleIds = await validateInternalUserIds(supabase, resolved.responsibleIds)
  const monthlyGoalIds = await validateMonthlyGoalIds(supabase, resolved.monthlyGoalIds)
  const payload = { ...resolved.payload }

  if (normalizedMeetingId) {
    delete payload.created_by_user_id
  }

  const response = normalizedMeetingId
    ? await supabase
        .from('communication_meetings')
        .update(payload)
        .eq('id', normalizedMeetingId)
        .select('*')
        .single()
    : await supabase
        .from('communication_meetings')
        .insert([{ ...payload }])
        .select('*')
        .single()

  if (response.error || !response.data) {
    return {
      success: false,
      error: response.error?.message || 'No se pudo guardar la reunion mensual de comunicacion.',
    }
  }

  try {
    await syncRelationTable(
      supabase,
      'communication_meeting_responsibles',
      'communication_meeting_id',
      response.data.id,
      'user_id',
      responsibleIds
    )
    await syncRelationTable(
      supabase,
      'communication_meeting_monthly_goals',
      'communication_meeting_id',
      response.data.id,
      'monthly_goal_id',
      monthlyGoalIds
    )
  } catch (relationError) {
    return { success: false, error: relationError.message }
  }

  await logExecutionAudit(
    `${normalizedMeetingId ? 'Actualizo' : 'Creo'} la reunion mensual de comunicacion ${response.data.month}/${response.data.year}`,
    actorName
  )
  revalidateExecutionShell()

  return { success: true, meeting: response.data }
}

export async function saveAnnualGoal(goalId, data = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedGoalId = normalizeIdValue(goalId)
  const resolved = buildGoalPayload(data, 'annual')

  if (resolved.error) {
    return { success: false, error: resolved.error }
  }

  if (resolved.payload.responsible_user_id) {
    const responsibleIds = await validateInternalUserIds(supabase, [resolved.payload.responsible_user_id])
    resolved.payload.responsible_user_id = responsibleIds[0] || null
  }

  const response = normalizedGoalId
    ? await supabase
        .from('annual_goals')
        .update(resolved.payload)
        .eq('id', normalizedGoalId)
        .select('*')
        .single()
    : await supabase
        .from('annual_goals')
        .insert([resolved.payload])
        .select('*')
        .single()

  if (response.error || !response.data) {
    return { success: false, error: response.error?.message || 'No se pudo guardar el objetivo anual.' }
  }

  await logExecutionAudit(
    `${normalizedGoalId ? 'Actualizo' : 'Creo'} el objetivo anual "${response.data.title}"`,
    actorName
  )
  revalidateExecutionShell()

  return { success: true, goal: response.data }
}

export async function saveMonthlyGoal(goalId, data = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const normalizedGoalId = normalizeIdValue(goalId)
  const resolved = buildGoalPayload(data, 'monthly')

  if (resolved.error) {
    return { success: false, error: resolved.error }
  }

  if (resolved.payload.responsible_user_id) {
    const responsibleIds = await validateInternalUserIds(supabase, [resolved.payload.responsible_user_id])
    resolved.payload.responsible_user_id = responsibleIds[0] || null
  }

  resolved.payload.annual_goal_id = await validateAnnualGoalId(supabase, resolved.payload.annual_goal_id)

  const response = normalizedGoalId
    ? await supabase
        .from('monthly_goals')
        .update(resolved.payload)
        .eq('id', normalizedGoalId)
        .select('*')
        .single()
    : await supabase
        .from('monthly_goals')
        .insert([resolved.payload])
        .select('*')
        .single()

  if (response.error || !response.data) {
    return { success: false, error: response.error?.message || 'No se pudo guardar el objetivo mensual.' }
  }

  await logExecutionAudit(
    `${normalizedGoalId ? 'Actualizo' : 'Creo'} el objetivo mensual "${response.data.title}"`,
    actorName
  )
  revalidateExecutionShell()

  return { success: true, goal: response.data }
}

export async function linkTaskToExecutionEntity(entityType, entityId, taskId) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const config = TASK_RELATION_MAP[entityType]

  if (!config) {
    return { success: false, error: 'Relacion no soportada.' }
  }

  const task = await getTaskRecord(supabase, taskId)

  if (!task) {
    return { success: false, error: 'La tarea seleccionada no existe.' }
  }

  if (!canAccessBoard(session, task.kanban_columns?.board_id)) {
    return { success: false, error: 'No tienes permiso para vincular esa tarea.' }
  }

  const result = await linkTaskToEntityInternal(supabase, entityType, entityId, task.id)

  if (!result.success) {
    return result
  }

  await logExecutionAudit(`Vinculo una tarea a ${config.label}`, actorName)
  revalidateExecutionShell([config.path])

  return { success: true }
}

export async function unlinkTaskFromExecutionEntity(entityType, entityId, taskId) {
  await requireAdminSession()
  const supabase = await createClient()
  const config = TASK_RELATION_MAP[entityType]
  const normalizedEntityId = normalizeIdValue(entityId)
  const normalizedTaskId = normalizeIdValue(taskId)

  if (!config || !normalizedEntityId || !normalizedTaskId) {
    return { success: false, error: 'Relacion invalida.' }
  }

  const { error } = await supabase
    .from(config.relationTable)
    .delete()
    .eq(config.entityColumn, normalizedEntityId)
    .eq('task_id', normalizedTaskId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateExecutionShell([config.path])
  return { success: true }
}

export async function createTaskForExecutionEntity(entityType, entityId, data = {}) {
  const session = await requireAdminSession()
  const actorName = actorNameFromSession(session)
  const supabase = await createClient()
  const config = TASK_RELATION_MAP[entityType]

  if (!config) {
    return { success: false, error: 'Relacion no soportada.' }
  }

  const normalizedEntityId = await ensureEntityExists(supabase, config.entityTable, entityId)

  if (!normalizedEntityId) {
    return { success: false, error: `No se encontro la ${config.label}.` }
  }

  const createdTaskResponse = await createTaskOnBoard(supabase, session, data)

  if (createdTaskResponse.error || !createdTaskResponse.task) {
    return { success: false, error: createdTaskResponse.error || 'No se pudo crear la tarea.' }
  }

  const relationResponse = await linkTaskToEntityInternal(
    supabase,
    entityType,
    normalizedEntityId,
    createdTaskResponse.task.id
  )

  if (!relationResponse.success) {
    return relationResponse
  }

  await logExecutionAudit(`Creo una tarea desde ${config.label}`, actorName)
  revalidateExecutionShell([config.path])

  return { success: true, task: createdTaskResponse.task }
}
