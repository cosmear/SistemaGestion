import { canAccessBoard, canAccessTeamBoard } from '@/utils/auth/permissions';

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return {
    value: month,
    label: new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(2024, index, 1)),
  };
});

export const DAILY_MEETING_STATUS_OPTIONS = [
  { value: 'open', label: 'Abierta' },
  { value: 'closed', label: 'Cerrada' },
];

export const COMMUNICATION_MEETING_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planificado' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'closed', label: 'Cerrado' },
];

export const ANNUAL_GOAL_STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Cumplido' },
  { value: 'cancelled', label: 'Cancelado' },
];

export const MONTHLY_GOAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Cumplido' },
  { value: 'blocked', label: 'Trabado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export const GOAL_PROGRESS_MODE_OPTIONS = [
  { value: 'auto', label: 'Automatico' },
  { value: 'manual', label: 'Manual' },
];

export function getCurrentMonthWindow(now = new Date()) {
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function formatMonthLabel(month, year, format = 'long') {
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (!Number.isFinite(monthNumber) || !Number.isFinite(yearNumber)) {
    return '';
  }

  return new Intl.DateTimeFormat('es-AR', {
    month: format,
    year: 'numeric',
  }).format(new Date(yearNumber, monthNumber - 1, 1));
}

export function formatDateLabel(value, options = {}) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString('es-AR', options);
}

export function numberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampPercentage(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, parsed));
}

export function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringListToTextarea(list = []) {
  return Array.isArray(list) ? list.filter(Boolean).join('\n') : '';
}

export function calculateGoalProgress({
  targetValue,
  currentValue,
  manualProgress,
  progressMode = 'auto',
}) {
  if (progressMode === 'manual') {
    return clampPercentage(manualProgress);
  }

  const target = numberOrNull(targetValue);
  const current = numberOrNull(currentValue);

  if (!target || target <= 0 || current === null) {
    return 0;
  }

  return clampPercentage((current / target) * 100);
}

export function getProgressTone(value) {
  const progress = clampPercentage(value);

  if (progress >= 100) {
    return 'bg-emerald-500';
  }

  if (progress >= 70) {
    return 'bg-blue-500';
  }

  if (progress >= 35) {
    return 'bg-amber-500';
  }

  return 'bg-rose-500';
}

export function getGoalStatusMeta(status = 'pending', goalType = 'monthly') {
  const monthlyMap = {
    pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    in_progress: { label: 'En curso', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    completed: { label: 'Cumplido', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    blocked: { label: 'Trabado', className: 'bg-rose-50 text-rose-700 border-rose-200' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  };

  const annualMap = {
    active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    paused: { label: 'Pausado', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    completed: { label: 'Cumplido', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  };

  const map = goalType === 'annual' ? annualMap : monthlyMap;
  return map[status] || Object.values(map)[0];
}

export function getMeetingStatusMeta(status = 'open', meetingType = 'daily') {
  const dailyMap = {
    open: { label: 'Abierta', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    closed: { label: 'Cerrada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  const communicationMap = {
    planned: { label: 'Planificado', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    in_progress: { label: 'En curso', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    closed: { label: 'Cerrado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  const map = meetingType === 'communication' ? communicationMap : dailyMap;
  return map[status] || Object.values(map)[0];
}

export function getTaskStatusFromColumnTitle(title = '') {
  const normalized = String(title || '').toLowerCase();

  if (normalized.includes('termin')) {
    return 'Terminada';
  }

  if (normalized.includes('progreso')) {
    return 'En progreso';
  }

  return 'Pendiente';
}

export function isTaskDone(task) {
  return getTaskStatusFromColumnTitle(task?.kanban_columns?.title || '') === 'Terminada';
}

export function buildAccessibleBoardOptions(session, clients = []) {
  const options = [
    {
      value: `personal_${session.username || 'Admin'}`,
      label: `Personal (${session.fullName || session.username || 'Admin'})`,
    },
  ];

  if (canAccessTeamBoard(session)) {
    options.push({ value: 'team', label: 'Equipo compartido' });
  }

  clients.forEach((client) => {
    const boardId = `client_${client.id}`;

    if (!canAccessBoard(session, boardId)) {
      return;
    }

    options.push({
      value: boardId,
      label: `${client.name}${client.status === 'inactive' ? ' (inactivo)' : ''}`,
    });
  });

  return options;
}

export function getEntityTaskStats(tasks = []) {
  const total = tasks.length;
  const overdue = tasks.filter((task) => task.deadline && !isTaskDone(task) && new Date(task.deadline) < new Date()).length;
  const completed = tasks.filter((task) => isTaskDone(task)).length;

  return {
    total,
    overdue,
    completed,
    pending: total - completed,
  };
}

export function buildOperationalAlerts({
  hasTodayMeeting,
  hasCurrentCommunicationMeeting,
  monthlyGoals = [],
  annualGoals = [],
  relatedTasks = [],
}) {
  const alerts = [];

  if (!hasTodayMeeting) {
    alerts.push({
      key: 'missing-daily-meeting',
      title: 'Falta cargar la reunion diaria de hoy',
      href: '/daily-meetings',
      tone: 'amber',
    });
  }

  if (!hasCurrentCommunicationMeeting) {
    alerts.push({
      key: 'missing-communication-meeting',
      title: 'Todavia no existe la reunion mensual de comunicacion del mes actual',
      href: '/communication',
      tone: 'amber',
    });
  }

  monthlyGoals
    .filter((goal) => (goal.progress_percentage || 0) <= 0 && ['pending', 'in_progress'].includes(goal.status))
    .forEach((goal) => {
      alerts.push({
        key: `monthly-goal-without-progress-${goal.id}`,
        title: `El objetivo mensual "${goal.title}" no tiene avance`,
        href: '/monthly-goals',
        tone: 'blue',
      });
    });

  monthlyGoals
    .filter((goal) => goal.status === 'blocked')
    .forEach((goal) => {
      alerts.push({
        key: `monthly-goal-blocked-${goal.id}`,
        title: `El objetivo mensual "${goal.title}" esta trabado`,
        href: '/monthly-goals',
        tone: 'rose',
      });
    });

  annualGoals
    .filter((goal) => goal.status === 'active' && !goal.monthly_goals?.length)
    .forEach((goal) => {
      alerts.push({
        key: `annual-goal-without-monthlies-${goal.id}`,
        title: `El objetivo anual "${goal.title}" no tiene objetivos mensuales asociados`,
        href: '/annual-goals',
        tone: 'amber',
      });
    });

  relatedTasks
    .filter((task) => task.deadline && !isTaskDone(task) && new Date(task.deadline) < new Date())
    .forEach((task) => {
      alerts.push({
        key: `linked-task-overdue-${task.id}`,
        title: `La tarea vinculada "${task.title}" esta vencida`,
        href: '/tasks',
        tone: 'rose',
      });
    });

  return alerts.slice(0, 8);
}
