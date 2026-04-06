import { canAccessBoard } from '@/utils/auth/permissions';
import { getGoogleCalendarEvents } from '@/utils/google-calendar';

function buildAttendeeMap(attendees = []) {
  return attendees.reduce((accumulator, attendee) => {
    if (!attendee?.event_id || !attendee?.user_id) {
      return accumulator;
    }

    if (!accumulator[attendee.event_id]) {
      accumulator[attendee.event_id] = [];
    }

    accumulator[attendee.event_id].push(attendee.user_id);
    return accumulator;
  }, {});
}

function canSeeCustomCalendarEvent(event, attendeeMap, session) {
  const visibility = event.visibility || 'global';

  if (visibility === 'global') {
    return true;
  }

  if (event.created_by_user_id && event.created_by_user_id === session.userId) {
    return true;
  }

  return (attendeeMap[event.id] || []).includes(session.userId);
}

function buildTaskCalendarEvents(tasks = [], session) {
  return tasks
    .filter((task) => canAccessBoard(session, task.kanban_columns?.board_id))
    .map((task) => {
      const boardId = task.kanban_columns?.board_id || '';
      let backgroundColor = '#9CA3AF';
      let titlePrefix = '';

      if (boardId.startsWith('personal_')) {
        backgroundColor = '#8B5CF6';
      } else if (boardId === 'team') {
        backgroundColor = '#3B82F6';
        titlePrefix = 'Team ';
      } else if (boardId.startsWith('client_')) {
        backgroundColor = '#10B981';
        titlePrefix = 'Cliente ';
      }

      return {
        id: `task_${task.id}`,
        title: `${titlePrefix}${task.title}`,
        start: task.deadline,
        backgroundColor,
        borderColor: 'transparent',
        extendedProps: {
          priority: task.priority,
          isTask: true,
          originalId: task.id,
          assignedUserId: task.assigned_user_id || null,
        },
      };
    });
}

function buildCustomCalendarEvents(rawEvents = [], attendeeMap, session) {
  return rawEvents
    .filter((event) => canSeeCustomCalendarEvent(event, attendeeMap, session))
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
}

export async function getCalendarFeedEvents({ supabase, session, start, end }) {
  const rangeStart = start.toISOString();
  const rangeEnd = end.toISOString();

  const [tasksResult, rawEventsResult, googleEvents] = await Promise.all([
    supabase
      .from('kanban_tasks')
      .select(`
        id,
        title,
        priority,
        deadline,
        assigned_user_id,
        kanban_columns!inner(board_id)
      `)
      .not('deadline', 'is', null)
      .gte('deadline', rangeStart)
      .lt('deadline', rangeEnd)
      .order('deadline', { ascending: true }),
    supabase
      .from('calendar_events')
      .select('*')
      .gte('date', rangeStart)
      .lt('date', rangeEnd)
      .order('date', { ascending: true }),
    getGoogleCalendarEvents(supabase, session, { start, end }),
  ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  if (rawEventsResult.error) {
    throw new Error(rawEventsResult.error.message);
  }

  const eventIds = (rawEventsResult.data || []).map((event) => event.id).filter(Boolean);
  let attendeeMap = {};

  if (eventIds.length > 0) {
    const attendeesResult = await supabase
      .from('calendar_event_attendees')
      .select('event_id, user_id')
      .in('event_id', eventIds);

    if (attendeesResult.error) {
      throw new Error(attendeesResult.error.message);
    }

    attendeeMap = buildAttendeeMap(attendeesResult.data || []);
  }

  return [
    ...buildTaskCalendarEvents(tasksResult.data || [], session),
    ...buildCustomCalendarEvents(rawEventsResult.data || [], attendeeMap, session),
    ...googleEvents,
  ].sort((left, right) => {
    const leftTime = new Date(left.start).getTime();
    const rightTime = new Date(right.start).getTime();

    return leftTime - rightTime;
  });
}
