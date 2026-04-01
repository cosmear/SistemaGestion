import { createClient } from '@/utils/supabase/server';
import ClientList from './ClientList';
import { requireAdminSession } from '@/utils/auth/admin';
import { canManageClients, canViewClientPricing, isLimitedStaff } from '@/utils/auth/permissions';

export default async function ClientsPage() {
  const session = await requireAdminSession();
  const supabase = await createClient();
  const limitedStaff = isLimitedStaff(session);
  const visibleClientIds = limitedStaff ? session.assignedClientIds || [] : null;
  const showFinancials = canViewClientPricing(session);
  const manageClients = canManageClients(session);

  const clientsQuery = limitedStaff
    ? visibleClientIds.length
      ? supabase.from('clients').select('*').in('id', visibleClientIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })
    : supabase.from('clients').select('*').order('created_at', { ascending: false });

  const credentialsQuery = manageClients
    ? supabase.from('client_users').select('id, client_id, email, is_active')
    : Promise.resolve({ data: [], error: null });

  const ticketsQuery = limitedStaff
    ? visibleClientIds.length
      ? supabase.from('tickets').select('id, client_id, status').in('client_id', visibleClientIds)
      : Promise.resolve({ data: [], error: null })
    : supabase.from('tickets').select('id, client_id, status');

  const invoicesQuery = showFinancials
    ? limitedStaff
      ? visibleClientIds.length
        ? supabase.from('invoices').select('id, client_id, status, amount').in('client_id', visibleClientIds)
        : Promise.resolve({ data: [], error: null })
      : supabase.from('invoices').select('id, client_id, status, amount')
    : Promise.resolve({ data: [], error: null });

  const [clientsResult, credentialsResult, ticketsResult, invoicesResult] = await Promise.all([
    clientsQuery,
    credentialsQuery,
    ticketsQuery,
    invoicesQuery,
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
      canManageClients={manageClients}
      canViewFinancials={showFinancials}
    />
  );
}
