'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Buildings,
  CalendarBlank,
  CurrencyCircleDollar,
  EnvelopeOpen,
  HandCoins,
  Kanban,
  Key,
  MagnifyingGlass,
  NotePencil,
  PencilSimple,
  Plus,
  Trash,
  UserCircle,
  Wrench,
} from '@phosphor-icons/react';
import {
  deleteClient,
  deleteClientCredential,
  insertClient,
  setClientCredentials,
  updateClient,
  updateClientStatus,
} from '@/app/actions';
import { runServerAction } from '@/utils/client/runServerAction';
import { CLIENT_ONBOARDING_OPTIONS, getOnboardingMeta } from '@/utils/constants';

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
];

export default function ClientList({
  initialClients,
  clientCredentials,
  clientTickets,
  clientInvoices,
  canManageClients,
  canViewFinancials,
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientModal, setClientModal] = useState({ open: false, mode: 'create', client: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingClientId, setDeletingClientId] = useState(null);
  const [togglingClientId, setTogglingClientId] = useState(null);
  const [credModal, setCredModal] = useState({ open: false, client: null, currentCred: null });
  const [isCredSubmitting, setIsCredSubmitting] = useState(false);

  const formatMoney = (value) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const packTypes = {
    '1': { name: 'Estandarizado #1', badge: 'pack-badge-1' },
    '2': { name: 'Estandarizado #2', badge: 'pack-badge-2' },
    '3': { name: 'Avanzado', badge: 'pack-badge-3' },
    custom: { name: 'Pack Personalizado', badge: 'pack-badge-custom' },
    '0': { name: 'Sin Pack', badge: 'pack-badge-0' },
  };

  const ticketMap = {};
  (clientTickets || []).forEach((ticket) => {
    if (!ticketMap[ticket.client_id]) {
      ticketMap[ticket.client_id] = { open: 0, total: 0 };
    }

    ticketMap[ticket.client_id].total += 1;

    if (!['resolved', 'closed'].includes(ticket.status)) {
      ticketMap[ticket.client_id].open += 1;
    }
  });

  const invoiceMap = {};
  (clientInvoices || []).forEach((invoice) => {
    if (!invoiceMap[invoice.client_id]) {
      invoiceMap[invoice.client_id] = { open: 0, overdue: 0, total: 0, outstandingAmount: 0 };
    }

    invoiceMap[invoice.client_id].total += 1;

    if (invoice.status === 'overdue') {
      invoiceMap[invoice.client_id].overdue += 1;
    }

    if (['draft', 'pending', 'overdue'].includes(invoice.status)) {
      invoiceMap[invoice.client_id].open += 1;
      invoiceMap[invoice.client_id].outstandingAmount += Number(invoice.amount || 0);
    }
  });

  const activeClients = clients.filter((client) => client.status === 'active');
  const inactiveClients = clients.filter((client) => client.status === 'inactive');
  const totalMrr = activeClients.reduce((total, client) => total + Number(client.pack_monthly_fee || 0), 0);
  const openTicketsCount = (clientTickets || []).filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length;
  const portalEnabledCount = (clientCredentials || []).length;
  const overdueInvoicesCount = (clientInvoices || []).filter((invoice) => invoice.status === 'overdue').length;
  const outstandingAmount = (clientInvoices || [])
    .filter((invoice) => ['draft', 'pending', 'overdue'].includes(invoice.status))
    .reduce((total, invoice) => total + Number(invoice.amount || 0), 0);
  const isEditMode = clientModal.mode === 'edit' && Boolean(clientModal.client);
  const modalClient = clientModal.client;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleClients = clients.filter((client) => {
    const searchableFields = [
      client.name,
      client.website_url,
      client.phone_whatsapp,
      client.contact_name,
      client.contact_email,
      client.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = normalizedSearch.length === 0 || searchableFields.includes(normalizedSearch);

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const buildClientUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const refreshData = () => {
    router.refresh();
  };

  const openCreateModal = () => {
    setClientModal({ open: true, mode: 'create', client: null });
  };

  const openEditModal = (client) => {
    setClientModal({ open: true, mode: 'edit', client });
  };

  const closeClientModal = () => {
    setClientModal({ open: false, mode: 'create', client: null });
    setIsSubmitting(false);
  };

  const handleClientSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.target);
    const data = {
      name: formData.get('name'),
      pack_type: formData.get('pack_type'),
      pack_dev_fee: parseFloat(formData.get('pack_dev_fee')) || 0,
      pack_monthly_fee: parseFloat(formData.get('pack_monthly_fee')) || 0,
      website_url: formData.get('website_url') || null,
      phone_whatsapp: formData.get('phone_whatsapp') || null,
      contact_name: formData.get('contact_name') || null,
      contact_email: formData.get('contact_email') || null,
      onboarding_status: formData.get('onboarding_status') || 'pending',
      renewal_date: formData.get('renewal_date') || null,
      notes: formData.get('notes') || null,
    };

    const result =
      clientModal.mode === 'edit' && clientModal.client
        ? await runServerAction(updateClient, clientModal.client.id, data)
        : await runServerAction(insertClient, data);

    if (result.success) {
      closeClientModal();
      refreshData();
      return;
    }

    alert(result.error || 'Error guardando el cliente.');
    setIsSubmitting(false);
  };

  const toggleStatus = async (id, currentStatus, name) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setTogglingClientId(id);
    setClients((currentClients) =>
      currentClients.map((client) => (client.id === id ? { ...client, status: newStatus } : client))
    );

    const result = await runServerAction(updateClientStatus, id, newStatus, name);

    if (!result.success) {
      setClients((currentClients) =>
        currentClients.map((client) => (client.id === id ? { ...client, status: currentStatus } : client))
      );
      alert('No se pudo actualizar el estado del cliente.');
    } else {
      refreshData();
    }

    setTogglingClientId(null);
  };

  const openCredModal = (client) => {
    const currentCred = (clientCredentials || []).find((credential) => credential.client_id === client.id) || null;
    setCredModal({ open: true, client, currentCred });
  };

  const handleSaveCredential = async (event) => {
    event.preventDefault();
    setIsCredSubmitting(true);

    const email = event.target.email.value;
    const password = event.target.password.value;
    const result = await runServerAction(setClientCredentials, credModal.client.id, email, password);

    if (result.success) {
      setCredModal({ open: false, client: null, currentCred: null });
      setIsCredSubmitting(false);
      refreshData();
      return;
    }

    alert('Error configurando las credenciales. Puede existir un email duplicado.');
    setIsCredSubmitting(false);
  };

  const handleDeleteCredential = async (clientId) => {
    if (!confirm('Quitar acceso al portal de este cliente?')) {
      return;
    }

    const result = await runServerAction(deleteClientCredential, clientId);

    if (!result.success) {
      alert('No se pudo eliminar el acceso del cliente.');
      return;
    }

    setCredModal({ open: false, client: null, currentCred: null });
    refreshData();
  };

  const handleDeleteClient = async (clientId, clientName) => {
    const confirmed = confirm(
      `Eliminar a "${clientName}"?\n\nSe borraran su acceso al portal, tickets, facturas y tablero de tareas del cliente.`
    );

    if (!confirmed) {
      return;
    }

    const previousClients = clients;
    setDeletingClientId(clientId);
    setClients((currentClients) => currentClients.filter((client) => client.id !== clientId));

    const result = await runServerAction(deleteClient, clientId, clientName);

    if (!result.success) {
      setClients(previousClients);
      alert(result.error || 'No se pudo eliminar el cliente.');
      setDeletingClientId(null);
      return;
    }

    if (credModal.client?.id === clientId) {
      setCredModal({ open: false, client: null, currentCred: null });
    }

    setDeletingClientId(null);
    refreshData();
  };

  const getHealthTone = (ticketInfo, invoiceInfo) => {
    if (canViewFinancials && (invoiceInfo?.overdue || 0) > 0) {
      return 'bg-rose-50 text-rose-700';
    }

    if ((ticketInfo?.open || 0) >= 3) {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-emerald-50 text-emerald-700';
  };

  const getHealthLabel = (ticketInfo, invoiceInfo) => {
    if (canViewFinancials && (invoiceInfo?.overdue || 0) > 0) return 'Cobro en riesgo';
    if ((ticketInfo?.open || 0) >= 3) return 'Alta demanda';
    return 'Saludable';
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 animate-fade-in custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Clientes</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">CRM comercial y operativo</h3>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Gestiona contactos, onboarding, acceso al portal y estado de cobranzas desde un solo lugar.
          </p>
        </div>

        {canManageClients ? (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
          >
            <Plus weight="bold" />
            Nuevo cliente
          </button>
        ) : null}
      </div>

      <div className={`mb-6 grid gap-4 md:grid-cols-2 ${canViewFinancials ? '2xl:grid-cols-5' : 'xl:grid-cols-3'}`}>
        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Cartera total</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-gray-900">{clients.length}</p>
              <p className="mt-2 text-sm font-medium text-gray-500">{activeClients.length} activas / {inactiveClients.length} inactivas</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Buildings className="text-2xl" weight="fill" />
            </div>
          </div>
        </div>

        {canViewFinancials ? (
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">MRR activo</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-emerald-700">{formatMoney(totalMrr)}</p>
                <p className="mt-2 text-sm font-medium text-gray-500">Mensualidad estimada de clientes activos</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <HandCoins className="text-2xl" weight="fill" />
              </div>
            </div>
          </div>
        ) : null}

        {canManageClients ? (
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Portales activos</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-indigo-700">{portalEnabledCount}</p>
                <p className="mt-2 text-sm font-medium text-gray-500">Clientes con acceso B2B configurado</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                <Key className="text-2xl" weight="fill" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Tickets abiertos</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-orange-700">{openTicketsCount}</p>
              <p className="mt-2 text-sm font-medium text-gray-500">Casos de soporte pendientes en toda la cartera</p>
            </div>
            <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
              <EnvelopeOpen className="text-2xl" weight="fill" />
            </div>
          </div>
        </div>

        {canViewFinancials ? (
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Cobranza abierta</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-rose-700">{formatMoney(outstandingAmount)}</p>
                <p className="mt-2 text-sm font-medium text-gray-500">{overdueInvoicesCount} facturas vencidas</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <CurrencyCircleDollar className="text-2xl" weight="fill" />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-6 rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <MagnifyingGlass className="absolute left-4 top-3.5 text-lg text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por marca, contacto, email o nota..."
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

      {visibleClients.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-[32px] border border-dashed border-gray-300 bg-white p-10 text-center">
          <div>
            <UserCircle className="mx-auto text-6xl text-gray-300" weight="thin" />
            <p className="mt-4 text-lg font-bold text-gray-800">No encontramos clientes con ese filtro</p>
            <p className="mt-2 text-sm font-medium text-gray-500">Prueba otro termino o cambia el estado visible.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visibleClients.map((client) => {
            const credentials = (clientCredentials || []).find((credential) => credential.client_id === client.id) || null;
            const ticketInfo = ticketMap[client.id] || { open: 0, total: 0 };
            const invoiceInfo = invoiceMap[client.id] || { open: 0, overdue: 0, total: 0, outstandingAmount: 0 };
            const clientUrl = buildClientUrl(client.website_url);
            const isDeleting = deletingClientId === client.id;
            const isToggling = togglingClientId === client.id;
            const isInactive = client.status === 'inactive';
            const onboardingMeta = getOnboardingMeta(client.onboarding_status || 'pending');

            return (
              <article
                key={client.id}
                className={`rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${isInactive ? 'opacity-80' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-50 p-2.5 text-brand-600">
                      <UserCircle className="text-3xl" weight="fill" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight text-gray-900">{client.name}</h4>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Alta {new Date(client.created_at).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                        isInactive ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isInactive ? 'Inactivo' : 'Activo'}
                    </span>
                    <div className={`rounded-full px-3 py-1 text-[11px] font-black ${getHealthTone(ticketInfo, invoiceInfo)}`}>
                      {getHealthLabel(ticketInfo, invoiceInfo)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase shadow-sm ${packTypes[client.pack_type]?.badge || packTypes['0'].badge}`}>
                    {packTypes[client.pack_type]?.name || 'Sin pack'}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${onboardingMeta.className}`}>
                    {onboardingMeta.label}
                  </span>
                  {canManageClients ? (
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${credentials ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                      {credentials ? 'Portal activo' : 'Sin portal'}
                    </span>
                  ) : null}
                </div>

                {canViewFinancials ? (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Setup</p>
                      <p className="mt-2 text-sm font-black text-gray-900">{formatMoney(client.pack_dev_fee)}</p>
                    </div>
                    <div className="rounded-2xl bg-brand-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-500">Mensual</p>
                      <p className="mt-2 text-sm font-black text-brand-700">{formatMoney(client.pack_monthly_fee)}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Cobranza</p>
                      <p className="mt-2 text-sm font-black text-gray-900">{formatMoney(invoiceInfo.outstandingAmount)}</p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Contacto</span>
                    <span className="text-sm font-semibold text-gray-700">{client.contact_name || 'Sin cargar'}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Email</span>
                    <span className="text-sm font-semibold text-gray-600">{client.contact_email || 'No definido'}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Renovacion</span>
                    <span className="text-sm font-semibold text-gray-600">
                      {client.renewal_date ? new Date(client.renewal_date).toLocaleDateString('es-AR') : 'Sin fecha'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Website</span>
                    {clientUrl ? (
                      <a
                        href={clientUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-brand-700 hover:underline"
                      >
                        Abrir sitio
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-gray-400">Sin web</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">WhatsApp</span>
                    <span className="text-sm font-semibold text-gray-600">
                      {client.phone_whatsapp || 'No configurado'}
                    </span>
                  </div>

                  {client.notes ? (
                    <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
                      {client.notes}
                    </div>
                  ) : null}
                </div>

                <div className={`mt-5 grid gap-3 ${canManageClients ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                  <Link
                    href={`/tasks?board=client_${client.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <Kanban weight="bold" />
                    Abrir tablero
                  </Link>

                  {canManageClients ? (
                    <>
                      <button
                        onClick={() => openEditModal(client)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        <PencilSimple weight="bold" />
                        Editar ficha
                      </button>

                      <button
                        onClick={() => openCredModal(client)}
                        className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                          credentials
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {credentials ? 'Reset portal' : 'Dar acceso portal'}
                      </button>

                      <button
                        onClick={() => toggleStatus(client.id, client.status, client.name)}
                        disabled={isToggling}
                        className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                          client.status === 'active'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        } disabled:opacity-50`}
                      >
                        {client.status === 'active' ? 'Marcar inactivo' : 'Reactivar cliente'}
                      </button>
                    </>
                  ) : null}
                </div>

                {canViewFinancials ? (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-orange-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">Tickets</p>
                      <p className="mt-2 text-sm font-black text-orange-700">{ticketInfo.open} abiertos</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500">Facturas</p>
                      <p className="mt-2 text-sm font-black text-blue-700">{invoiceInfo.open} abiertas</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Vencidas</p>
                      <p className="mt-2 text-sm font-black text-rose-700">{invoiceInfo.overdue}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">Tickets</p>
                    <p className="mt-2 text-sm font-black text-orange-700">{ticketInfo.open} abiertos</p>
                  </div>
                )}

                {canManageClients ? (
                  <button
                    onClick={() => handleDeleteClient(client.id, client.name)}
                    disabled={isDeleting}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash weight="bold" />
                    {isDeleting ? 'Eliminando...' : 'Eliminar cliente'}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {canManageClients && clientModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white shadow-2xl custom-scrollbar animate-fade-in">
            <div className="border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="text-2xl font-black tracking-tight text-gray-900">
                {isEditMode ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <p className="mt-2 text-sm font-medium text-gray-500">
                {isEditMode
                  ? 'Actualiza los datos comerciales, CRM y renovacion de la cuenta.'
                  : 'Crea la ficha comercial y deja listo el seguimiento operativo desde el dia uno.'}
              </p>
            </div>

            <form
              key={modalClient?.id || 'new-client'}
              onSubmit={handleClientSubmit}
              className="space-y-6 p-6"
            >
              <div className="space-y-4">
                <h4 className="border-b border-brand-100 pb-2 text-xs font-black uppercase tracking-[0.2em] text-brand-600">
                  Identidad
                </h4>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Nombre comercial</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Ej: Mi marca"
                    defaultValue={modalClient?.name || ''}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-gray-700">Website</label>
                    <input
                      type="text"
                      name="website_url"
                      placeholder="ej: empresa.com"
                      defaultValue={modalClient?.website_url || ''}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-gray-700">WhatsApp</label>
                    <input
                      type="text"
                      name="phone_whatsapp"
                      placeholder="+54911..."
                      defaultValue={modalClient?.phone_whatsapp || ''}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="border-b border-brand-100 pb-2 text-xs font-black uppercase tracking-[0.2em] text-brand-600">
                  CRM y seguimiento
                </h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-gray-700">Contacto principal</label>
                    <input
                      type="text"
                      name="contact_name"
                      placeholder="Nombre y apellido"
                      defaultValue={modalClient?.contact_name || ''}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-gray-700">Email contacto</label>
                    <input
                      type="email"
                      name="contact_email"
                      placeholder="contacto@marca.com"
                      defaultValue={modalClient?.contact_email || ''}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-gray-700">Onboarding</label>
                    <select
                      name="onboarding_status"
                      defaultValue={modalClient?.onboarding_status || 'pending'}
                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    >
                      {CLIENT_ONBOARDING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                      <CalendarBlank className="text-gray-400" />
                      Renovacion
                    </label>
                    <input
                      type="date"
                      name="renewal_date"
                      defaultValue={modalClient?.renewal_date || ''}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <NotePencil className="text-gray-400" />
                    Notas internas
                  </label>
                  <textarea
                    name="notes"
                    rows="3"
                    placeholder="Hallazgos, acuerdos, renovaciones, alertas..."
                    defaultValue={modalClient?.notes || ''}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="border-b border-brand-100 pb-2 text-xs font-black uppercase tracking-[0.2em] text-brand-600">
                  Pack y fees
                </h4>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Tipo de pack</label>
                  <select
                    name="pack_type"
                    defaultValue={modalClient?.pack_type || 'custom'}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="1">Estandarizado #1</option>
                    <option value="2">Estandarizado #2</option>
                    <option value="3">Avanzado</option>
                    <option value="custom">Pack Personalizado</option>
                    <option value="0">Sin pack</option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                      <Wrench className="text-gray-400" />
                      Fee desarrollo
                    </label>
                    <input
                      type="number"
                      name="pack_dev_fee"
                      defaultValue={modalClient?.pack_dev_fee ?? '0'}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                      <HandCoins className="text-brand-500" />
                      Fee mensual
                    </label>
                    <input
                      type="number"
                      name="pack_monthly_fee"
                      defaultValue={modalClient?.pack_monthly_fee ?? '0'}
                      className="w-full rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={closeClientModal}
                  className="rounded-2xl px-5 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canManageClients && credModal.open && credModal.client && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[32px] border-t-4 border-indigo-600 bg-white shadow-2xl animate-fade-in">
            <div className="border-b border-gray-100 bg-indigo-50/40 p-6">
              <h3 className="text-2xl font-black tracking-tight text-gray-900">Faro Portal B2B</h3>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Configura el acceso de <b>{credModal.client.name}</b> a su portal privado.
              </p>
              {credModal.currentCred ? (
                <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm">
                  Email activo: <span className="font-black text-indigo-700">{credModal.currentCred.email}</span>
                </p>
              ) : null}
            </div>

            <form onSubmit={handleSaveCredential} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={credModal.currentCred?.email || ''}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Nueva contrasena</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-2 text-xs font-medium text-gray-500">
                  Al guardar se reemplaza la credencial anterior por esta nueva combinacion.
                </p>
              </div>

              <div className="grid gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isCredSubmitting}
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCredSubmitting ? 'Guardando...' : 'Guardar credenciales'}
                </button>

                {credModal.currentCred ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCredential(credModal.client.id)}
                    className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
                  >
                    Eliminar acceso
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setCredModal({ open: false, client: null, currentCred: null })}
                  className="rounded-2xl px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
