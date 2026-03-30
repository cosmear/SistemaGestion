import { createClient } from '@/utils/supabase/server';
import ClientList from './ClientList';
import { requireAdminSession } from '@/utils/auth/admin';

export default async function ClientsPage() {
  await requireAdminSession();
  const supabase = await createClient();

  const [clientsResult, credentialsResult, ticketsResult, invoicesResult] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('client_users').select('id, client_id, email, is_active'),
    supabase.from('tickets').select('id, client_id, status'),
    supabase.from('invoices').select('id, client_id, status, amount'),
  ]);

  if (clientsResult.error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase. Revisa que las tablas de clientes esten disponibles.
      </div>
    );
  }

  const clientVersion = JSON.stringify({
    clients: (clientsResult.data || []).map((client) => `${client.id}:${client.status}:${client.updated_at || client.created_at || ''}`),
    credentials: (credentialsResult.data || []).map((credential) => `${credential.id}:${credential.client_id}:${credential.email}`),
    tickets: (ticketsResult.data || []).map((ticket) => `${ticket.id}:${ticket.client_id}:${ticket.status}`),
    invoices: (invoicesResult.data || []).map((invoice) => `${invoice.id}:${invoice.client_id}:${invoice.status}`),
  });

  return (
    <ClientList
      key={clientVersion}
      initialClients={clientsResult.data || []}
      clientCredentials={credentialsResult.data || []}
      clientTickets={ticketsResult.data || []}
      clientInvoices={invoicesResult.data || []}
    />
  );
}
