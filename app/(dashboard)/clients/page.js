import { createClient } from '@/utils/supabase/server';
import ClientList from './ClientList';

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase. ¿Ya ejecutaste el script SQL de migración?
      </div>
    );
  }

  // Traemos las credenciales (client_users) si existen, pero ocultando un poco tal vez?
  // O como es el panel super auth, traemos mail y pass
  const { data: creds } = await supabase
     .from('client_users')
     .select('*');

  return <ClientList initialClients={clients} clientCredentials={creds || []} />;
}
