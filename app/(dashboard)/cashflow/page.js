import { createClient } from '@/utils/supabase/server';
import CashflowClient from './CashflowClient';

export default async function CashflowPage() {
  const supabase = await createClient();

  // Fetch transactions directly from Supabase 
  const { data: transactions, error } = await supabase
    .from('cashflow')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Cashflow. Verifique que la tabla exista.
      </div>
    );
  }

  // Calculate totals Server-Side 
  let totalIn = 0;
  let totalOut = 0;
  
  if (transactions) {
    transactions.forEach(t => {
      if (t.type === 'income') totalIn += Number(t.amount);
      if (t.type === 'expense') totalOut += Number(t.amount);
    });
  }
  
  const balance = totalIn - totalOut;

  // Render the Client component passing the Server-Side props
  return (
    <CashflowClient 
      transactions={transactions} 
      totalIn={totalIn}
      totalOut={totalOut}
      balance={balance}
    />
  );
}
