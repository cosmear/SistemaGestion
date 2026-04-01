import { createClient } from '@/utils/supabase/server';
import DashboardClient from './DashboardClient';
import { requireAdminSession } from '@/utils/auth/admin';
import {
  canAccessBoard,
  canAccessSection,
  canViewClientPricing,
  isLimitedStaff,
} from '@/utils/auth/permissions';
import { buildOperationalAlerts, getCurrentMonthWindow } from '@/utils/execution';

const URGENT_CLASSIFICATIONS = new Set(['Urgente', 'Bug']);

function isDoneTask(task) {
  const title = String(task.kanban_columns?.title || '').toLowerCase();
  return title.includes('termin');
}

function getBoardBucket(boardId = '') {
  if (boardId === 'team') return 'team';
  if (boardId.startsWith('client_')) return 'client';
  return 'personal';
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(date) {
  return new Intl.DateTimeFormat('es-AR', { month: 'short' })
    .format(date)
    .replace('.', '')
    .slice(0, 3);
}

function mapIdsByEntity(rows = [], entityKey, valueKey) {
  return rows.reduce((accumulator, row) => {
    const entityId = row?.[entityKey];
    const valueId = row?.[valueKey];

    if (!entityId || !valueId) {
      return accumulator;
    }

    if (!accumulator[entityId]) {
      accumulator[entityId] = [];
    }

    accumulator[entityId].push(valueId);
    return accumulator;
  }, {});
}

function buildCashflowTrend(transactions, now) {
  const months = [];

  for (let index = 5; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);

    months.push({
      key: getMonthKey(monthDate),
      label: getMonthLabel(monthDate),
      income: 0,
      expense: 0,
      balance: 0,
    });
  }

  const bucketMap = new Map(months.map((month) => [month.key, month]));

  transactions.forEach((transaction) => {
    const txnDate = new Date(transaction.date);

    if (Number.isNaN(txnDate.getTime())) return;

    const bucket = bucketMap.get(getMonthKey(txnDate));

    if (!bucket) return;

    const amount = Number(transaction.amount || 0);

    if (transaction.type === 'income') bucket.income += amount;
    if (transaction.type === 'expense') bucket.expense += amount;

    bucket.balance = bucket.income - bucket.expense;
  });

  return months;
}

function buildSupportAnalytics(tickets) {
  const classifications = new Map();
  let open = 0;
  let closed = 0;

  tickets.forEach((ticket) => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      closed += 1;
    } else {
      open += 1;
    }

    const label = ticket.classification || 'Sin clasificar';
    classifications.set(label, (classifications.get(label) || 0) + 1);
  });

  const total = open + closed;

  return {
    open,
    closed,
    resolutionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
    classifications: Array.from(classifications.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 4),
  };
}

function buildTaskAnalytics(tasks, now) {
  const boardCounts = { personal: 0, team: 0, client: 0 };
  const priorityCounts = { high: 0, medium: 0, low: 0 };
  let overdue = 0;
  let pending = 0;

  tasks.forEach((task) => {
    boardCounts[getBoardBucket(task.kanban_columns?.board_id || '')] += 1;

    const priority = task.priority || 'low';

    if (priorityCounts[priority] !== undefined) {
      priorityCounts[priority] += 1;
    }

    if (!isDoneTask(task)) pending += 1;

    if (task.deadline && !isDoneTask(task)) {
      const deadline = new Date(task.deadline);

      if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < now.getTime()) {
        overdue += 1;
      }
    }
  });

  return {
    overdue,
    pending,
    boardLoad: [
      { key: 'personal', label: 'Personal', value: boardCounts.personal },
      { key: 'team', label: 'Equipo', value: boardCounts.team },
      { key: 'client', label: 'Cliente', value: boardCounts.client },
    ],
    priorityLoad: [
      { key: 'high', label: 'Alta', value: priorityCounts.high },
      { key: 'medium', label: 'Media', value: priorityCounts.medium },
      { key: 'low', label: 'Baja', value: priorityCounts.low },
    ],
  };
}

function canSeeCalendarEvent(event, attendeeMap, session) {
  const visibility = event.visibility || 'global';

  if (visibility === 'global') {
    return true;
  }

  if (event.created_by_user_id && event.created_by_user_id === session.userId) {
    return true;
  }

  return (attendeeMap[event.id] || []).includes(session.userId);
}

function buildHeroMessage({ canViewFinancial, canViewSupport, summary, execution, alerts }) {
  if (canViewFinancial && canViewSupport) {
    return `Tenes ${summary.pendingTasks} frentes activos, ${summary.urgentTickets} tickets con presion alta y una cartera mensual estimada de ${new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(Number(summary.monthlyRecurringRevenue || 0))}.`;
  }

  const todayMeetingText = execution.todayMeeting
    ? `La reunion de hoy ya dejo ${execution.todayMeeting.tasksCount} tareas vinculadas`
    : 'Todavia falta cargar la reunion diaria de hoy';
  const blockedGoalsText = execution.monthlyGoalsSummary.blockedCount
    ? `y ${execution.monthlyGoalsSummary.blockedCount} objetivos del mes estan trabados`
    : 'y no hay objetivos mensuales trabados';

  return `Tenes ${summary.pendingTasks} tareas pendientes, ${alerts.length} alertas operativas. ${todayMeetingText} ${blockedGoalsText}.`;
}

function getClientsQuery(supabase, session, includePricing) {
  const selectColumns = includePricing
    ? 'id, name, status, pack_monthly_fee'
    : 'id, name, status';

  if (isLimitedStaff(session)) {
    if (!session.assignedClientIds?.length) {
      return Promise.resolve({ data: [], error: null });
    }

    return supabase
      .from('clients')
      .select(selectColumns)
      .in('id', session.assignedClientIds)
      .order('name');
  }

  return supabase.from('clients').select(selectColumns).order('name');
}

export default async function DashboardPage() {
  const session = await requireAdminSession();
  const supabase = await createClient();
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
  const currentWindow = getCurrentMonthWindow(now);
  const canViewFinancial = canAccessSection(session, 'cashflow') && canViewClientPricing(session);
  const canViewSupport = canAccessSection(session, 'tickets');
  const canViewPricing = canViewClientPricing(session);

  const [
    tasksResult,
    ticketsResult,
    rawEventsResult,
    attendeesResult,
    clientsResult,
    cashflowResult,
    dailyMeetingsResult,
    dailyMeetingTasksResult,
    communicationMeetingsResult,
    communicationTasksResult,
    monthlyGoalsResult,
    monthlyGoalTasksResult,
    annualGoalsResult,
  ] = await Promise.all([
    supabase
      .from('kanban_tasks')
      .select('id, title, priority, deadline, created_at, kanban_columns!inner(board_id, title)'),
    canViewSupport
      ? supabase
          .from('tickets')
          .select('id, title, status, classification, created_at, clients(name)')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('calendar_events').select('*').order('date', { ascending: true }),
    supabase.from('calendar_event_attendees').select('event_id, user_id'),
    getClientsQuery(supabase, session, canViewPricing),
    canViewFinancial
      ? supabase
          .from('cashflow')
          .select('amount, type, date')
          .gte('date', trendStart)
          .order('date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('daily_meetings').select('*').order('meeting_date', { ascending: false }),
    supabase.from('daily_meeting_tasks').select('daily_meeting_id, task_id'),
    supabase.from('communication_meetings').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
    supabase.from('communication_meeting_tasks').select('communication_meeting_id, task_id'),
    supabase.from('monthly_goals').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
    supabase.from('monthly_goal_tasks').select('monthly_goal_id, task_id'),
    supabase.from('annual_goals').select('*').order('year', { ascending: false }).order('updated_at', { ascending: false }),
  ]);

  if (tasksResult.error || rawEventsResult.error || attendeesResult.error || clientsResult.error || ticketsResult.error || cashflowResult.error) {
    return (
      <div className="p-8 text-center font-medium text-red-500">
        Error cargando los datos principales del dashboard.
      </div>
    );
  }

  const allTasks = (tasksResult.data || []).filter((task) => canAccessBoard(session, task.kanban_columns?.board_id));
  const sortedTasks = [...allTasks].sort((left, right) => {
    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  });
  const highPriorityTasks = sortedTasks.filter((task) => task.priority === 'high');

  const attendeeMap = mapIdsByEntity(attendeesResult.data, 'event_id', 'user_id');
  const upcomingEvents = (rawEventsResult.data || [])
    .filter((event) => canSeeCalendarEvent(event, attendeeMap, session))
    .slice(0, 5);

  const clients = clientsResult.data || [];
  const activeClients = clients.filter((client) => client.status === 'active');
  const allTickets = ticketsResult.data || [];
  const urgentTickets = allTickets.filter(
    (ticket) => !['resolved', 'closed'].includes(ticket.status) && URGENT_CLASSIFICATIONS.has(ticket.classification)
  );
  const cashflow = cashflowResult.data || [];
  const taskAnalytics = buildTaskAnalytics(allTasks, now);
  const supportAnalytics = buildSupportAnalytics(allTickets);
  const monthlyRecurringRevenue = canViewPricing
    ? activeClients.reduce((total, client) => total + Number(client.pack_monthly_fee || 0), 0)
    : 0;

  let executionError = null;
  let execution = {
    todayMeeting: null,
    communicationMeeting: null,
    monthlyGoals: [],
    monthlyGoalsSummary: {
      activeCount: 0,
      blockedCount: 0,
      withoutProgressCount: 0,
    },
    highlightedAnnualGoal: null,
  };
  let alerts = [];

  if (
    dailyMeetingsResult.error
    || dailyMeetingTasksResult.error
    || communicationMeetingsResult.error
    || communicationTasksResult.error
    || monthlyGoalsResult.error
    || monthlyGoalTasksResult.error
    || annualGoalsResult.error
  ) {
    executionError = 'Falta ejecutar el SQL operativo nuevo para ver reuniones y objetivos en el dashboard.';
  } else {
    const taskMap = Object.fromEntries(allTasks.map((task) => [task.id, task]));
    const dailyTaskLinkMap = mapIdsByEntity(dailyMeetingTasksResult.data, 'daily_meeting_id', 'task_id');
    const communicationTaskLinkMap = mapIdsByEntity(
      communicationTasksResult.data,
      'communication_meeting_id',
      'task_id'
    );
    const monthlyTaskLinkMap = mapIdsByEntity(monthlyGoalTasksResult.data, 'monthly_goal_id', 'task_id');
    const dailyMeetings = dailyMeetingsResult.data || [];
    const communicationMeetings = communicationMeetingsResult.data || [];
    const monthlyGoals = (monthlyGoalsResult.data || []).map((goal) => ({
      ...goal,
      linked_tasks: (monthlyTaskLinkMap[goal.id] || []).map((taskId) => taskMap[taskId]).filter(Boolean),
    }));
    const annualGoals = (annualGoalsResult.data || []).map((goal) => ({
      ...goal,
      monthly_goals: monthlyGoals.filter((monthlyGoal) => monthlyGoal.annual_goal_id === goal.id),
    }));

    const todayMeeting = dailyMeetings.find((meeting) => meeting.meeting_date === todayKey) || null;
    const latestDailyMeeting = dailyMeetings[0] || null;
    const featuredMeeting = todayMeeting || latestDailyMeeting;
    const currentCommunication = communicationMeetings.find(
      (meeting) => meeting.month === currentWindow.month && meeting.year === currentWindow.year
    ) || null;
    const currentMonthGoals = monthlyGoals.filter(
      (goal) => goal.month === currentWindow.month && goal.year === currentWindow.year
    );
    const activeAnnualGoals = annualGoals.filter((goal) => goal.status === 'active');
    const highlightedAnnualGoal = [...activeAnnualGoals].sort((left, right) => {
      const progressDiff = Number(right.progress_percentage || 0) - Number(left.progress_percentage || 0);

      if (progressDiff !== 0) {
        return progressDiff;
      }

      return new Date(right.updated_at || right.created_at || 0).getTime()
        - new Date(left.updated_at || left.created_at || 0).getTime();
    })[0] || null;
    const linkedTaskIds = new Set([
      ...(dailyMeetingTasksResult.data || []).map((row) => row.task_id),
      ...(communicationTasksResult.data || []).map((row) => row.task_id),
      ...(monthlyGoalTasksResult.data || []).map((row) => row.task_id),
    ]);
    const relatedTasks = Array.from(linkedTaskIds)
      .map((taskId) => taskMap[taskId])
      .filter(Boolean);

    alerts = buildOperationalAlerts({
      hasTodayMeeting: Boolean(todayMeeting),
      hasCurrentCommunicationMeeting: Boolean(currentCommunication),
      monthlyGoals: currentMonthGoals,
      annualGoals: activeAnnualGoals,
      relatedTasks,
    });

    execution = {
      todayMeeting: featuredMeeting
        ? {
            ...featuredMeeting,
            isToday: featuredMeeting.meeting_date === todayKey,
            prioritiesCount: featuredMeeting.priorities_of_day?.length || 0,
            blockersCount: featuredMeeting.blockers?.length || 0,
            tasksCount: (dailyTaskLinkMap[featuredMeeting.id] || []).length,
          }
        : null,
      communicationMeeting: currentCommunication
        ? {
            ...currentCommunication,
            campaignsCount: currentCommunication.campaigns_or_topics?.length || 0,
            assetsCount: currentCommunication.required_assets?.length || 0,
            tasksCount: (communicationTaskLinkMap[currentCommunication.id] || []).length,
          }
        : null,
      monthlyGoals: currentMonthGoals,
      monthlyGoalsSummary: {
        activeCount: currentMonthGoals.filter((goal) => !['completed', 'cancelled'].includes(goal.status)).length,
        blockedCount: currentMonthGoals.filter((goal) => goal.status === 'blocked').length,
        withoutProgressCount: currentMonthGoals.filter(
          (goal) => Number(goal.progress_percentage || 0) <= 0 && ['pending', 'in_progress'].includes(goal.status)
        ).length,
      },
      highlightedAnnualGoal: highlightedAnnualGoal
        ? {
            ...highlightedAnnualGoal,
            monthlyGoalsCount: highlightedAnnualGoal.monthly_goals?.length || 0,
          }
        : null,
    };
  }

  const summary = {
    activeClients: activeClients.length,
    monthlyRecurringRevenue,
    openTickets: supportAnalytics.open,
    overdueTasks: taskAnalytics.overdue,
    pendingTasks: taskAnalytics.pending,
    urgentTickets: urgentTickets.length,
    resolutionRate: supportAnalytics.resolutionRate,
    heroMessage: buildHeroMessage({
      canViewFinancial,
      canViewSupport,
      summary: {
        pendingTasks: taskAnalytics.pending,
        urgentTickets: urgentTickets.length,
        monthlyRecurringRevenue,
      },
      execution,
      alerts,
    }),
  };

  return (
    <DashboardClient
      userName={session.fullName || session.username || 'Admin'}
      tasks={highPriorityTasks}
      tickets={urgentTickets}
      events={upcomingEvents}
      summary={summary}
      analytics={{
        cashflowTrend: buildCashflowTrend(cashflow, now),
        support: supportAnalytics,
        operations: {
          boards: taskAnalytics.boardLoad,
          priorities: taskAnalytics.priorityLoad,
        },
      }}
      execution={execution}
      alerts={alerts}
      executionError={executionError}
      access={{
        canViewFinancial,
        canViewSupport,
      }}
    />
  );
}
