import { createClient } from '@/utils/supabase/server';
import { requireAdminSession } from '@/utils/auth/admin';
import { buildUserClientMap, getAllInternalUsers, getInternalUserAssignments } from '@/utils/internal-users';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const session = await requireAdminSession(['admin']);
  const supabase = await createClient();
  let users = [];
  let assignments = [];
  let clientsResult = { data: [], error: null };
  let pageError = null;

  try {
    [users, assignments, clientsResult] = await Promise.all([
      getAllInternalUsers(supabase),
      getInternalUserAssignments(supabase),
      supabase.from('clients').select('id, name, status').order('name'),
    ]);
  } catch (error) {
    pageError = error.message || 'Error cargando usuarios internos. Ejecuta la migracion SQL nueva y vuelve a probar.';
  }

  if (pageError || clientsResult.error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        {pageError || 'Error cargando los clientes para asignar usuarios internos.'}
      </div>
    );
  }

  return (
    <UsersClient
      initialUsers={users}
      clients={clientsResult.data || []}
      assignmentMap={buildUserClientMap(assignments)}
      currentUserId={session.userId}
    />
  );
}
