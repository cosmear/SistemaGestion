import { createClient } from '@/utils/supabase/server';
import BudgetClient from './BudgetClient';

export default async function BudgetPage() {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from('budget_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Budget. Verifique las tablas.
      </div>
    );
  }

  return <BudgetClient items={items} />;
}
