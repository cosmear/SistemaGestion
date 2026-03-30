import { createClient } from '@/utils/supabase/server';
import DashboardClient from './DashboardClient';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const userName = cookieStore.get('session_user')?.value || 'Admin';

  // 1. Fetch Tareas Prioridad Alta (del usuario o de team)
  const { data: fetchTasks } = await supabase
    .from('kanban_tasks')
    .select('id, title, deadline, kanban_columns!inner(board_id, title)')
    .eq('priority', 'high');
  
  // Filtramos por privacidad
  const highPriorityTasks = (fetchTasks || []).filter(t => {
     const bId = t.kanban_columns?.board_id;
     if (bId?.startsWith('personal_') && bId !== `personal_${userName}`) return false;
     return true;
  });

  // 2. Fetch Tickets Urgentes Abiertos
  const { data: urgentTickets } = await supabase
    .from('tickets')
    .select('id, title, status, classification, created_at, clients(name)')
    .eq('status', 'open')
    .in('classification', ['Urgente', 'Bug'])
    .order('created_at', { ascending: false });

  // 3. Fetch Próximos Eventos del Calendario (A partir de hoy)
  const today = new Date().toISOString();
  const { data: upcomingEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(5);

  // 4. KPIs
  const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: ticketsCount } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');

  return (
    <DashboardClient 
       userName={userName}
       tasks={highPriorityTasks || []}
       tickets={urgentTickets || []}
       events={upcomingEvents || []}
       kpis={{ clients: clientsCount || 0, openTickets: ticketsCount || 0 }}
    />
  );
}
