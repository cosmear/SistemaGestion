import { createClient } from '@/utils/supabase/server';
import BillingClient from './BillingClient';
import { requireAdminSession } from '@/utils/auth/admin';
import { getCurrentPeriodKey } from '@/utils/billing';

export default async function BillingPage() {
  await requireAdminSession(['admin', 'manager']);
  const supabase = await createClient();

  const [invoicesResult, clientsResult] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id,
        title,
        period_key,
        amount,
        status,
        due_date,
        paid_at,
        notes,
        created_at,
        clients (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, pack_monthly_fee')
      .eq('status', 'active')
      .order('name'),
  ]);

  if (invoicesResult.error) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error conectando a cobranzas. Corre el script de migracion de Supabase primero.
      </div>
    );
  }

  const invoiceVersion = JSON.stringify(
    (invoicesResult.data || []).map((invoice) => `${invoice.id}:${invoice.status}:${invoice.paid_at || ''}`)
  );

  return (
    <BillingClient
      key={invoiceVersion}
      initialInvoices={invoicesResult.data || []}
      activeClients={clientsResult.data || []}
      defaultPeriod={getCurrentPeriodKey()}
    />
  );
}
