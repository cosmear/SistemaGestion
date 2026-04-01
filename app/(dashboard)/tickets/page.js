import { createClient } from '@/utils/supabase/server';
import TicketsClient from './TicketsClient';
import { requireAdminSession } from '@/utils/auth/admin';

export default async function TicketsPage() {
  await requireAdminSession(['admin', 'manager']);
  const supabase = await createClient();

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      id,
      client_id,
      title,
      description,
      status,
      classification,
      priority,
      assigned_to,
      due_at,
      created_at,
      clients (
        id,
        name
      ),
      ticket_comments (
        id,
        message,
        visibility,
        author_name,
        author_role,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium z-10">
        Error conectando a Supabase Tickets. Corre el script SQL de migracion primero.
      </div>
    );
  }

  const ticketVersion = JSON.stringify(
    (tickets || []).map((ticket) => `${ticket.id}:${ticket.status}:${ticket.priority || ''}:${ticket.assigned_to || ''}:${(ticket.ticket_comments || []).length}`)
  );

  return <TicketsClient key={ticketVersion} initialTickets={tickets || []} />;
}
