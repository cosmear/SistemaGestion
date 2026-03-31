'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarBlank,
  CurrencyCircleDollar,
  MagnifyingGlass,
  Plus,
  Receipt,
  Sparkle,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  createInvoice,
  deleteInvoice,
  generateMonthlyInvoices,
  updateInvoiceStatus,
} from '@/app/actions';
import { runServerAction } from '@/utils/client/runServerAction';
import { formatPeriodLabel } from '@/utils/billing';
import { getInvoiceStatusMeta, INVOICE_STATUS_OPTIONS } from '@/utils/constants';

const STATUS_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'overdue', label: 'Vencidas' },
  { key: 'paid', label: 'Pagadas' },
];

export default function BillingClient({ initialInvoices, activeClients, defaultPeriod }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatMoney = (value) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const filteredInvoices = invoices.filter((invoice) => {
    const haystack = [
      invoice.title,
      invoice.clients?.name,
      invoice.period_key,
      invoice.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = searchTerm.trim().length === 0 || haystack.includes(searchTerm.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const summary = invoices.reduce(
    (accumulator, invoice) => {
      if (['draft', 'pending', 'overdue'].includes(invoice.status)) {
        accumulator.outstanding += Number(invoice.amount || 0);
      }

      if (invoice.status === 'paid') {
        accumulator.collected += Number(invoice.amount || 0);
      }

      if (invoice.status === 'overdue') {
        accumulator.overdue += 1;
      }

      if (invoice.status === 'pending') {
        accumulator.pending += 1;
      }

      return accumulator;
    },
    { outstanding: 0, collected: 0, overdue: 0, pending: 0 }
  );

  const handleCreateInvoice = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.target);
    const result = await runServerAction(createInvoice, {
      clientId: formData.get('client_id'),
      periodKey: formData.get('period_key'),
      amount: Number(formData.get('amount') || 0),
      dueDate: formData.get('due_date') || null,
      notes: formData.get('notes') || null,
    });

    if (!result.success) {
      alert(result.error || 'No se pudo crear la factura.');
      setIsSubmitting(false);
      return;
    }

    setCreateModalOpen(false);
    setIsSubmitting(false);
    router.refresh();
  };

  const handleBulkGeneration = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.target);
    const result = await runServerAction(
      generateMonthlyInvoices,
      formData.get('period_key'),
      formData.get('due_date') || null
    );

    if (!result.success) {
      alert(result.error || 'No se pudo generar la tanda de facturas.');
      setIsSubmitting(false);
      return;
    }

    setBulkModalOpen(false);
    setIsSubmitting(false);
    router.refresh();
  };

  const handleStatusChange = async (invoiceId, nextStatus) => {
    const result = await runServerAction(updateInvoiceStatus, invoiceId, nextStatus);

    if (!result.success) {
      alert(result.error || 'No se pudo actualizar el estado.');
      return;
    }

    router.refresh();
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Eliminar esta factura?')) {
      return;
    }

    const result = await runServerAction(deleteInvoice, invoiceId);

    if (!result.success) {
      alert(result.error || 'No se pudo eliminar la factura.');
      return;
    }

    router.refresh();
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 animate-fade-in custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Facturacion</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Cobranzas y seguimiento</h3>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Emite facturas, genera el mes completo y concilia cobros con cashflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Sparkle weight="bold" />
            Generar mes
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
          >
            <Plus weight="bold" />
            Nueva factura
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <SummaryCard label="Por cobrar" value={formatMoney(summary.outstanding)} hint="Pendiente y vencido" icon={CurrencyCircleDollar} iconClassName="bg-rose-50 text-rose-600" />
        <SummaryCard label="Cobrado" value={formatMoney(summary.collected)} hint="Facturas pagadas" icon={Receipt} iconClassName="bg-emerald-50 text-emerald-600" />
        <SummaryCard label="Pendientes" value={summary.pending} hint="Facturas abiertas" icon={CalendarBlank} iconClassName="bg-blue-50 text-blue-600" />
        <SummaryCard label="Vencidas" value={summary.overdue} hint="Clientes a seguir" icon={WarningCircle} iconClassName="bg-amber-50 text-amber-600" />
      </div>

      <div className="mb-6 rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <MagnifyingGlass className="absolute left-4 top-3.5 text-lg text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente, titulo o periodo..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  statusFilter === filter.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-gray-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.9fr_0.7fr_0.6fr_0.7fr] border-b border-gray-100 bg-gray-50 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
          <span>Factura</span>
          <span>Cliente / Periodo</span>
          <span className="text-right">Monto</span>
          <span>Estado</span>
          <span className="text-right">Acciones</span>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-gray-500 font-medium">No encontramos facturas con ese filtro.</div>
        ) : (
          filteredInvoices.map((invoice) => {
            const statusMeta = getInvoiceStatusMeta(invoice.status);

            return (
              <div
                key={invoice.id}
                className="grid grid-cols-[1.2fr_0.9fr_0.7fr_0.6fr_0.7fr] items-center gap-4 border-b border-gray-100 px-6 py-5 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-black text-gray-900">{invoice.title}</p>
                  {invoice.notes ? (
                    <p className="mt-2 text-xs font-medium text-gray-500">{invoice.notes}</p>
                  ) : null}
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-800">{invoice.clients?.name || 'Cliente eliminado'}</p>
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    {formatPeriodLabel(invoice.period_key)} {invoice.due_date ? `· vence ${invoice.due_date}` : ''}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-base font-black text-gray-900">{formatMoney(invoice.amount)}</p>
                  {invoice.paid_at ? (
                    <p className="mt-2 text-xs font-medium text-emerald-600">
                      Pagada {new Date(invoice.paid_at).toLocaleDateString('es-AR')}
                    </p>
                  ) : null}
                </div>

                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <select
                    value={invoice.status}
                    onChange={(event) => handleStatusChange(invoice.id, event.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    {INVOICE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDeleteInvoice(invoice.id)}
                    className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash weight="bold" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {createModalOpen ? (
        <InvoiceModal
          activeClients={activeClients}
          defaultPeriod={defaultPeriod}
          isSubmitting={isSubmitting}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateInvoice}
          title="Nueva factura"
          submitLabel="Crear factura"
        />
      ) : null}

      {bulkModalOpen ? (
        <BulkModal
          defaultPeriod={defaultPeriod}
          isSubmitting={isSubmitting}
          onClose={() => setBulkModalOpen(false)}
          onSubmit={handleBulkGeneration}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, hint, icon: Icon, iconClassName }) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-gray-900">{value}</p>
          <p className="mt-2 text-sm font-medium text-gray-500">{hint}</p>
        </div>
        <div className={`rounded-2xl p-3 ${iconClassName}`}>
          <Icon className="text-2xl" weight="fill" />
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ activeClients, defaultPeriod, isSubmitting, onClose, onSubmit, title, submitLabel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] bg-white shadow-2xl animate-fade-in overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="text-2xl font-black tracking-tight text-gray-900">{title}</h3>
          <p className="mt-2 text-sm font-medium text-gray-500">Carga una factura puntual para una cuenta especifica.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">Cliente</label>
            <select name="client_id" required className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500">
              <option value="">Selecciona un cliente</option>
              {activeClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-700">Periodo</label>
              <input type="month" name="period_key" defaultValue={defaultPeriod} required className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-700">Vencimiento</label>
              <input type="date" name="due_date" className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">Monto</label>
            <input type="number" name="amount" min="0" step="0.01" required className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">Nota</label>
            <textarea name="notes" rows="3" className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={onClose} className="rounded-2xl px-5 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-colors hover:bg-brand-700 disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkModal({ defaultPeriod, isSubmitting, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] bg-white shadow-2xl animate-fade-in overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="text-2xl font-black tracking-tight text-gray-900">Generar mes completo</h3>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Crea facturas masivas para todos los clientes activos con fee mensual.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">Periodo</label>
            <input type="month" name="period_key" defaultValue={defaultPeriod} required className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">Vencimiento</label>
            <input type="date" name="due_date" className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={onClose} className="rounded-2xl px-5 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-black disabled:opacity-50">
              {isSubmitting ? 'Generando...' : 'Generar facturas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
