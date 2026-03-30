import { createClient } from '@/utils/supabase/server';
import PortalDashboardClient from './PortalDashboardClient';
import { requireClientSession } from '@/utils/auth/client';

export default async function PortalPage() {
  const session = await requireClientSession();
  const supabase = await createClient();

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('name, website_url, pack_monthly_fee, contact_name, contact_email')
    .eq('id', session.clientId)
    .single();

  if (clientErr || !client) {
    return <div className="p-8 text-center text-red-500 font-bold">Error cargando la cuenta corporativa.</div>;
  }

  const [ticketsResult, invoicesResult] = await Promise.all([
    supabase
      .from('tickets')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        created_at,
        ticket_comments (
          id,
          message,
          visibility,
          author_name,
          author_role,
          created_at
        )
      `)
      .eq('client_id', session.clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, title, period_key, amount, status, due_date, paid_at, notes, created_at')
      .eq('client_id', session.clientId)
      .order('created_at', { ascending: false }),
  ]);

  const tickets = (ticketsResult.data || []).map((ticket) => ({
    ...ticket,
    ticket_comments: (ticket.ticket_comments || []).filter((comment) => comment.visibility === 'public'),
  }));

  return (
    <PortalDashboardClient
      clientData={client}
      initialTickets={tickets}
      initialInvoices={invoicesResult.data || []}
    />
  );
}
