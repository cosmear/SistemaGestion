import { DEFAULT_KANBAN_COLUMNS } from '@/utils/constants';

export function getClientBoardId(clientId) {
  return `client_${clientId}`;
}

export async function ensureBoardColumns(supabase, boardId) {
  const { data: existingColumns, error } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (existingColumns && existingColumns.length > 0) {
    return existingColumns;
  }

  const payload = DEFAULT_KANBAN_COLUMNS.map((column) => ({
    ...column,
    board_id: boardId,
  }));

  const { data: createdColumns, error: createError } = await supabase
    .from('kanban_columns')
    .insert(payload)
    .select('*')
    .order('position', { ascending: true });

  if (createError) {
    throw new Error(createError.message);
  }

  return createdColumns || [];
}
