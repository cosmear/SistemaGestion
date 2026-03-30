import { createClient } from '@/utils/supabase/server';
import CalendarClient from './CalendarClient';
import { requireAdminSession } from '@/utils/auth/admin';

export default async function CalendarPage() {
  const session = await requireAdminSession();
  const userName = session.username || 'Admin';
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from('kanban_tasks')
    .select(`
      id,
      title,
      deadline,
      priority,
      kanban_columns!inner(board_id)
    `)
    .not('deadline', 'is', null)
    .order('deadline', { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Kanban/Calendar. Intenta recargar la pagina.
      </div>
    );
  }

  const authorizedTasks = tasks.filter((task) => {
    const boardId = task.kanban_columns.board_id;

    if (boardId.startsWith('personal_') && boardId !== `personal_${userName}`) {
      return false;
    }

    return true;
  });

  const events = authorizedTasks.map((task) => {
    const boardId = task.kanban_columns.board_id;
    let bgColor = '#9CA3AF';
    let typeName = '';

    if (boardId === `personal_${userName}`) {
      bgColor = '#8B5CF6';
    } else if (boardId === 'team') {
      bgColor = '#3B82F6';
      typeName = 'Team ';
    } else if (boardId.startsWith('client_')) {
      bgColor = '#10B981';
      typeName = 'Cliente ';
    }

    return {
      id: `task_${task.id}`,
      title: `${typeName}${task.title}`,
      start: task.deadline,
      backgroundColor: bgColor,
      borderColor: 'transparent',
      extendedProps: {
        priority: task.priority,
        isTask: true,
        originalId: task.id,
      },
    };
  });

  const { data: rawEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .order('date', { ascending: true });

  const customEvents = (rawEvents || []).map((event) => ({
    id: `event_${event.id}`,
    title: `Agenda ${event.title}`,
    start: event.date,
    backgroundColor: '#F97316',
    borderColor: 'transparent',
    extendedProps: {
      isEvent: true,
      type: event.type,
      originalId: event.id,
      originalTitle: event.title,
    },
  }));

  return <CalendarClient events={[...events, ...customEvents]} />;
}
