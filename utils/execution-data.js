import { canAccessBoard, isLimitedStaff } from '@/utils/auth/permissions';
import { buildAccessibleBoardOptions } from '@/utils/execution';
import { getActiveInternalUsers } from '@/utils/internal-users';

export async function getAccessibleClients(supabase, session) {
  if (isLimitedStaff(session)) {
    if (!session.assignedClientIds?.length) {
      return [];
    }

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status')
      .in('id', session.assignedClientIds)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status')
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getExecutionContext(supabase, session) {
  const [clients, internalUsers, tasksResult] = await Promise.all([
    getAccessibleClients(supabase, session),
    getActiveInternalUsers(supabase),
    supabase
      .from('kanban_tasks')
      .select(`
        *,
        kanban_columns!inner(
          id,
          title,
          board_id
        )
      `)
      .order('created_at', { ascending: false }),
  ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const userMap = Object.fromEntries(
    internalUsers.map((user) => [user.id, user.full_name || user.username])
  );

  const tasks = (tasksResult.data || [])
    .filter((task) => canAccessBoard(session, task.kanban_columns?.board_id))
    .map((task) => ({
      ...task,
      assigned_user_name: task.assigned_user_id ? userMap[task.assigned_user_id] || null : null,
    }));

  return {
    clients,
    internalUsers,
    tasks,
    boardOptions: buildAccessibleBoardOptions(session, clients),
  };
}
