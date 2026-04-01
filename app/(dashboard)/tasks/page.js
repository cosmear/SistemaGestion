import { createClient } from '@/utils/supabase/server';
import KanbanClient from './KanbanClient';
import { requireAdminSession } from '@/utils/auth/admin';
import { DEFAULT_KANBAN_COLUMNS } from '@/utils/constants';
import { canAccessBoard, canAccessTeamBoard, isLimitedStaff } from '@/utils/auth/permissions';
import { getActiveInternalUsers } from '@/utils/internal-users';

export default async function TasksPage(props) {
  const session = await requireAdminSession();
  const searchParams = await props.searchParams;
  const userName = session.username || 'Admin';
  const personalBoard = `personal_${userName}`;
  const requestedBoard = searchParams?.board ? String(searchParams.board) : personalBoard;
  const targetBoard = canAccessBoard(session, requestedBoard) ? requestedBoard : personalBoard;
  const supabase = await createClient();

  const clientsQuery = isLimitedStaff(session)
    ? session.assignedClientIds?.length
      ? supabase.from('clients').select('id, name, status').in('id', session.assignedClientIds).order('name')
      : Promise.resolve({ data: [], error: null })
    : supabase.from('clients').select('id, name, status').order('name');

  const [clientsResult, assignableUsers] = await Promise.all([
    clientsQuery,
    getActiveInternalUsers(supabase),
  ]);

  if (clientsResult.error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error cargando los clientes para el tablero.
      </div>
    );
  }

  let { data: columns, error: colError } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('board_id', targetBoard)
    .order('position', { ascending: true });

  if (colError) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Kanban (columnas). Asegurate de tener conexion.
      </div>
    );
  }

  if (!columns || columns.length === 0) {
    const defaultCols = DEFAULT_KANBAN_COLUMNS.map((column) => ({
      ...column,
      board_id: targetBoard,
    }));
    await supabase.from('kanban_columns').insert(defaultCols);

    const res = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('board_id', targetBoard)
      .order('position', { ascending: true });
    columns = res.data || [];
  }

  const colIds = columns.map((column) => column.id);
  let tasks = [];

  if (colIds.length > 0) {
    const { data: reqTasks } = await supabase
      .from('kanban_tasks')
      .select('*')
      .in('column_id', colIds)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    tasks = reqTasks || [];
  }

  const boardVersion = JSON.stringify({
    board: targetBoard,
    columns: columns.map((column) => `${column.id}:${column.position}`),
    tasks: tasks.map((task) => {
      const checklistStamp = Array.isArray(task.subtasks)
        ? task.subtasks.map((subtask) => `${subtask.text || ''}:${subtask.done ? 1 : 0}`).join('|')
        : ''

      return `${task.id}:${task.column_id}:${task.title || ''}:${task.priority || ''}:${task.deadline || ''}:${task.assigned_user_id || ''}:${checklistStamp}`
    }),
  });

  return (
    <KanbanClient
      key={boardVersion}
      initialColumns={columns}
      initialTasks={tasks}
      activeBoard={targetBoard}
      userName={userName}
      allClients={clientsResult.data || []}
      assignableUsers={assignableUsers}
      canUseTeamBoard={canAccessTeamBoard(session)}
    />
  );
}
