import { createClient } from '@/utils/supabase/server';
import ClientList from './ClientList';

export default async function ClientsPage() {
  const supabase = await createClient();

  // Fetch clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Clientes. Verifique que la tabla exista.
      </div>
    );
  }

  return <ClientList clients={clients} />;
}
