import { createClient } from '@/utils/supabase/server';
import { requireAdminSession } from '@/utils/auth/admin';
import { isLimitedStaff } from '@/utils/auth/permissions';
import { getActiveInternalUsers } from '@/utils/internal-users';
import NotesClient from './NotesClient';

function sortNotes(notes = []) {
  return [...notes].sort((left, right) => {
    const leftValue = new Date(left.updated_at || left.created_at || 0).getTime();
    const rightValue = new Date(right.updated_at || right.created_at || 0).getTime();
    return rightValue - leftValue;
  });
}

export default async function NotesPage() {
  const session = await requireAdminSession();
  const supabase = await createClient();
  let clientsResult = { data: [], error: null };
  let authors = [];
  let notes = [];
  let pageError = null;

  try {
    const accessibleClientsQuery = isLimitedStaff(session)
      ? session.assignedClientIds?.length
        ? supabase.from('clients').select('id, name, status').in('id', session.assignedClientIds).order('name')
        : Promise.resolve({ data: [], error: null })
      : supabase.from('clients').select('id, name, status').order('name');

    [clientsResult, authors] = await Promise.all([
      accessibleClientsQuery,
      getActiveInternalUsers(supabase),
    ]);

    if (isLimitedStaff(session)) {
      const [personalResult, clientResult] = await Promise.all([
        supabase.from('notes').select('*').eq('scope', 'personal').eq('created_by_user_id', session.userId),
        session.assignedClientIds?.length
          ? supabase.from('notes').select('*').eq('scope', 'client').in('client_id', session.assignedClientIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (personalResult.error || clientResult.error) {
        pageError = 'Error cargando notas. Ejecuta la migracion SQL nueva y vuelve a intentar.';
      } else {
        notes = [...(personalResult.data || []), ...(clientResult.data || [])];
      }
    } else {
      const notesResult = await supabase.from('notes').select('*');

      if (notesResult.error) {
        pageError = 'Error cargando notas. Ejecuta la migracion SQL nueva y vuelve a intentar.';
      } else {
        notes = notesResult.data || [];
      }
    }
  } catch (error) {
    pageError = error.message || 'Error cargando notas. Ejecuta la migracion SQL nueva y vuelve a intentar.';
  }

  if (pageError || clientsResult.error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        {pageError || 'Error cargando clientes para las notas.'}
      </div>
    );
  }

  const authorMap = Object.fromEntries(authors.map((author) => [author.id, author.full_name]));
  const clientMap = Object.fromEntries((clientsResult.data || []).map((client) => [client.id, client]));
  const mappedNotes = sortNotes(notes).map((note) => ({
    ...note,
    author_name: authorMap[note.created_by_user_id] || 'Usuario interno',
    client_name: note.client_id ? clientMap[note.client_id]?.name || 'Cliente' : null,
    client_status: note.client_id ? clientMap[note.client_id]?.status || 'active' : null,
  }));

  return (
    <NotesClient
      initialNotes={mappedNotes}
      availableClients={clientsResult.data || []}
      currentUserId={session.userId}
    />
  );
}
