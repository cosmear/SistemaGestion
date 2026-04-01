import { createClient } from '@/utils/supabase/server';
import DashboardClient from './DashboardClient';
import { requireAdminSession } from '@/utils/auth/admin';
import { canAccessSection, getDefaultInternalRoute } from '@/utils/auth/permissions';
import { redirect } from 'next/navigation';

const URGENT_CLASSIFICATIONS = new Set(['Urgente', 'Bug']);

function canAccessTask(task, userName) {
  const boardId = task.kanban_columns?.board_id || '';

  if (boardId.startsWith('personal_') && boardId !== `personal_${userName}`) {
    return false;
  }

  return true;
}

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

export default async function DashboardPage() {
  const session = await requireAdminSession();

  if (!canAccessSection(session, 'dashboard')) {
    redirect(getDefaultInternalRoute(session));
  }

  const supabase = await createClient();
  const boardOwner = session.username || 'Admin';
  const displayName = session.fullName || boardOwner;
  const now = new Date();
  const today = now.toISOString();
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const [tasksResult, ticketsResult, eventsResult, clientsResult, cashflowResult] = await Promise.all([
    supabase
      .from('kanban_tasks')
      .select('id, title, priority, deadline, created_at, kanban_columns!inner(board_id, title)'),
    supabase
      .from('tickets')
      .select('id, title, status, classification, created_at, clients(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('calendar_events')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(5),
    supabase
      .from('clients')
      .select('id, name, status, pack_type, pack_monthly_fee'),
    supabase
      .from('cashflow')
      .select('amount, type, date')
      .gte('date', trendStart)
      .order('date', { ascending: true }),
  ]);

  const allTasks = (tasksResult.data || []).filter((task) => canAccessTask(task, boardOwner));
  const sortedTasks = [...allTasks].sort((left, right) => {
    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  });

  const highPriorityTasks = sortedTasks.filter((task) => task.priority === 'high');
  const allTickets = ticketsResult.data || [];
  const urgentTickets = allTickets.filter(
    (ticket) => !['resolved', 'closed'].includes(ticket.status) && URGENT_CLASSIFICATIONS.has(ticket.classification)
  );
  const upcomingEvents = eventsResult.data || [];
  const clients = clientsResult.data || [];
  const activeClients = clients.filter((client) => client.status === 'active');
  const cashflow = cashflowResult.data || [];

  const taskAnalytics = buildTaskAnalytics(allTasks, now);
  const supportAnalytics = buildSupportAnalytics(allTickets);
  const monthlyRecurringRevenue = activeClients.reduce(
    (total, client) => total + Number(client.pack_monthly_fee || 0),
    0
  );

  return (
    <DashboardClient
      userName={displayName}
      tasks={highPriorityTasks}
      tickets={urgentTickets}
      events={upcomingEvents}
      summary={{
        activeClients: activeClients.length,
        monthlyRecurringRevenue,
        openTickets: supportAnalytics.open,
        overdueTasks: taskAnalytics.overdue,
        pendingTasks: taskAnalytics.pending,
        urgentTickets: urgentTickets.length,
        resolutionRate: supportAnalytics.resolutionRate,
      }}
      analytics={{
        cashflowTrend: buildCashflowTrend(cashflow, now),
        support: supportAnalytics,
        operations: {
          boards: taskAnalytics.boardLoad,
          priorities: taskAnalytics.priorityLoad,
        },
      }}
    />
  );
}
