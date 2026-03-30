import { createClient } from '@/utils/supabase/server';
import ClientList from './ClientList';

export default async function ClientsPage() {
  const supabase = await createClient();

  const [clientsResult, credentialsResult, ticketsResult] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('client_users').select('*'),
    supabase.from('tickets').select('id, client_id, status'),
  ]);

  if (clientsResult.error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase. Revisa que las tablas de clientes esten disponibles.
      </div>
    );
  }

  return (
    <ClientList
      initialClients={clientsResult.data || []}
      clientCredentials={credentialsResult.data || []}
      clientTickets={ticketsResult.data || []}
    />
  );
}
