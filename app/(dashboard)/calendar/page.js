import { createClient } from '@/utils/supabase/server';
import CalendarClient from './CalendarClient';
import { requireAdminSession } from '@/utils/auth/admin';
import { canAccessBoard } from '@/utils/auth/permissions';
import { getActiveInternalUsers } from '@/utils/internal-users';

export default async function CalendarPage() {
  const session = await requireAdminSession();
  const supabase = await createClient();

  const [tasksResult, rawEventsResult, attendeesResult, internalUsers] = await Promise.all([
    supabase
      .from('kanban_tasks')
      .select(`
        *,
        kanban_columns!inner(board_id)
      `)
      .not('deadline', 'is', null)
      .order('deadline', { ascending: true }),
    supabase.from('calendar_events').select('*').order('date', { ascending: true }),
    supabase.from('calendar_event_attendees').select('event_id, user_id'),
    getActiveInternalUsers(supabase),
  ]);

  if (tasksResult.error || rawEventsResult.error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Kanban/Calendar. Intenta recargar la pagina.
      </div>
    );
  }

  const tasks = tasksResult.data || [];
  const authorizedTasks = tasks.filter((task) => canAccessBoard(session, task.kanban_columns.board_id));

  const events = authorizedTasks.map((task) => {
    const boardId = task.kanban_columns.board_id;
    let bgColor = '#9CA3AF';
    let typeName = '';

    if (boardId.startsWith('personal_')) {
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
        assignedUserId: task.assigned_user_id || null,
      },
    };
  });

  const attendeeMap = {};
  (attendeesResult.data || []).forEach((attendee) => {
    if (!attendeeMap[attendee.event_id]) {
      attendeeMap[attendee.event_id] = [];
    }

    attendeeMap[attendee.event_id].push(attendee.user_id);
  });

  const customEvents = (rawEventsResult.data || [])
    .filter((event) => {
      const visibility = event.visibility || 'global';

      if (visibility === 'global') {
        return true;
      }

      if (event.created_by_user_id && event.created_by_user_id === session.userId) {
        return true;
      }

      return (attendeeMap[event.id] || []).includes(session.userId);
    })
    .map((event) => ({
    id: `event_${event.id}`,
    title: event.title,
    start: event.date,
    backgroundColor: (event.visibility || 'global') === 'global' ? '#F97316' : '#EC4899',
    borderColor: 'transparent',
    extendedProps: {
      isEvent: true,
      type: event.type,
      originalId: event.id,
      originalTitle: event.title,
      visibility: event.visibility || 'global',
      canDelete:
        session.role === 'admin' ||
        session.role === 'manager' ||
        event.created_by_user_id === session.userId,
    },
  }));

  return (
    <CalendarClient
      events={[...events, ...customEvents]}
      internalUsers={internalUsers}
      currentUserId={session.userId}
    />
  );
}
