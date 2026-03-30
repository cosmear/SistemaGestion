import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import PortalDashboardClient from './PortalDashboardClient';

export default async function PortalPage() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('client_session')?.value;
  
  if (!sessionStr) {
    return <div className="p-8 text-center text-red-500 font-bold">Sin sesión activa.</div>;
  }
  
  const session = JSON.parse(sessionStr);
  const supabase = await createClient();

  // 1. Obtener datos financieros y links de este cliente
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('name, website_url, pack_monthly_fee')
    .eq('id', session.clientId)
    .single();

  if (clientErr || !client) {
    return <div className="p-8 text-center text-red-500 font-bold">Error cargando información de la cuenta corporativa.</div>;
  }

  // 2. Obtener Tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('client_id', session.clientId)
    .order('created_at', { ascending: false });

  return (
    <PortalDashboardClient 
      clientData={client} 
      initialTickets={tickets || []} 
    />
  );
}
