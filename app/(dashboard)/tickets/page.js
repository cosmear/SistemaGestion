import { createClient } from '@/utils/supabase/server';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
  const supabase = await createClient();

  // Traemos los tickets con información del cliente unido
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      id,
      title,
      description,
      status,
      classification,
      created_at,
      clients (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium z-10">
        Error conectando a Supabase Tickets. ¿Ya corriste el script SQL de migración?
      </div>
    );
  }

  return <TicketsClient initialTickets={tickets || []} />;
}
