import { createClient } from '@/utils/supabase/server';
import CalendarClient from './CalendarClient';
import { cookies } from 'next/headers';

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const userName = cookieStore.get('session_user')?.value || 'Guest';
  const supabase = await createClient();

  // Traer tareas con fecha límite haciendo un INNER JOIN con kanban_columns
  // para evaluar el board_id al que pertenece cada tarea
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
        Error conectando a Supabase Kanban/Calendar. Intenta recargar la página.
      </div>
    );
  }

  // Filtrar según la lógica de Privacidad Multi-Tablero:
  // - Ocultar cualquier tablero 'personal_' que NO sea el del usuario logueado en la Cookie.
  // - Mostrar todo lo de 'team'
  // - Mostrar todo lo de 'client_xyz'
  const authorizedTasks = tasks.filter(t => {
    const boardId = t.kanban_columns.board_id;
    if (boardId.startsWith('personal_') && boardId !== `personal_${userName}`) {
      return false; // Es un espacio personal de OTRA persona, no lo mostramos.
    }
    return true; // Pasa el filtro de privacidad
  });

  // Convertirlas a formato FullCalendar accounts
  const events = authorizedTasks.map(t => {
    const boardId = t.kanban_columns.board_id;
    let bgColor = '#9CA3AF'; // fallback
    let typeName = '';

    // Colores según contexto (para diferenciar en la grilla del calendario)
    if (boardId === `personal_${userName}`) {
      bgColor = '#8B5CF6'; // Púrpura (Personal)
      typeName = ''; // No hace falta prefix
    } else if (boardId === 'team') {
      bgColor = '#3B82F6'; // Azul (Equipo)
      typeName = '🤝 ';
    } else if (boardId.startsWith('client_')) {
      bgColor = '#10B981'; // Verde (Clientes)
      typeName = '💼 ';
    }

    return {
      id: `task_${t.id}`,
      title: `${typeName}${t.title}`,
      start: t.deadline,
      backgroundColor: bgColor,
      borderColor: 'transparent',
      extendedProps: {
        priority: t.priority,
        isTask: true,
        originalId: t.id
      }
    };
  });

  // Hito 9: Traer eventos independientes del calendario
  const { data: rawEvents, error: evErr } = await supabase
    .from('calendar_events')
    .select('*')
    .order('date', { ascending: true });

  const customEvents = (rawEvents || []).map(e => ({
     id: `event_${e.id}`,
     title: `📅 ${e.title}`,
     start: e.date, // Soporta Date ISO string con o sin hora
     backgroundColor: '#F97316', // Naranja para Eventos Puros
     borderColor: 'transparent',
     extendedProps: {
        isEvent: true,
        type: e.type,
        originalId: e.id,
        originalTitle: e.title
     }
  }));

  const allEvents = [...events, ...customEvents];

  return <CalendarClient events={allEvents} />;
}
