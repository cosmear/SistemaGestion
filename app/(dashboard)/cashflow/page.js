import { createClient } from '@/utils/supabase/server';
import CashflowClient from './CashflowClient';
import { requireAdminSession } from '@/utils/auth/admin';

export default async function CashflowPage() {
  await requireAdminSession(['admin', 'manager']);
  const supabase = await createClient();

  const { data: transactions, error } = await supabase
    .from('cashflow')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a Supabase Cashflow. Verifica que la tabla exista.
      </div>
    );
  }

  let totalIn = 0;
  let totalOut = 0;

  if (transactions) {
    transactions.forEach((transaction) => {
      if (transaction.type === 'income') totalIn += Number(transaction.amount);
      if (transaction.type === 'expense') totalOut += Number(transaction.amount);
    });
  }

  return (
    <CashflowClient
      transactions={transactions}
      totalIn={totalIn}
      totalOut={totalOut}
      balance={totalIn - totalOut}
    />
  );
}
