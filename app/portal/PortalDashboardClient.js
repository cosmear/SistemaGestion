'use client';

import { useState } from 'react';
import {
  CheckCircle,
  DownloadSimple,
  EnvelopeSimple,
  Globe,
  PaperPlaneRight,
  Receipt,
  Ticket,
  WhatsappLogo,
} from '@phosphor-icons/react';
import jsPDF from 'jspdf';
import { submitClientTicket, submitClientTicketComment } from '@/app/portal-actions';
import { formatPeriodLabel } from '@/utils/billing';
import { getInvoiceStatusMeta, getTicketPriorityMeta, getTicketStatusMeta } from '@/utils/constants';

function formatMoney(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(Number(value || 0));
}

function formatDate(value, options = {}) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString('es-AR');
}

function isOpenTicket(status) {
  return !['resolved', 'closed'].includes(status);
}

function buildInvoiceFileName(invoice) {
  const period = String(invoice?.period_key || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');
  const title = String(invoice?.title || 'comprobante')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${title || 'comprobante'}_${period}.pdf`;
}

function Banner({ type = 'info', message }) {
  if (!message) {
    return null;
  }

  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${styles[type] || styles.info}`}>
      {message}
    </div>
  );
}

export default function PortalDashboardClient({ clientData, initialTickets, initialInvoices }) {
  const [tickets, setTickets] = useState(initialTickets || []);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [submittingCommentId, setSubmittingCommentId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [ticketBanner, setTicketBanner] = useState(null);
  const [commentBanners, setCommentBanners] = useState({});

  const invoices = initialInvoices || [];
  const website = clientData?.website_url
    ? (clientData.website_url.startsWith('http') ? clientData.website_url : `https://${clientData.website_url}`)
    : null;
  const contactName = clientData?.contact_name || 'Sin contacto principal';
  const contactEmail = clientData?.contact_email || 'Sin email operativo';
  const openInvoices = invoices.filter((invoice) => ['draft', 'pending', 'overdue'].includes(invoice.status));
  const openTickets = tickets.filter((ticket) => isOpenTicket(ticket.status));
  const resolvedTickets = tickets.length - openTickets.length;
  const outstandingBalance = openInvoices.reduce((total, invoice) => total + Number(invoice.amount || 0), 0);

  const handleSubmitTicket = async (event) => {
    event.preventDefault();
    setIsSubmittingTicket(true);
    setTicketBanner(null);

    const formData = new FormData(event.target);
    const title = formData.get('title');
    const description = formData.get('description');
    const result = await submitClientTicket(title, description);

    if (!result.success) {
      setTicketBanner({
        type: 'error',
        message: result.error || 'No pudimos guardar tu pedido. Prueba de nuevo.',
      });
      setIsSubmittingTicket(false);
      return;
    }

    if (result.ticket) {
      setTickets((currentTickets) => [result.ticket, ...currentTickets]);
    }

    event.target.reset();
    setTicketBanner({
      type: 'success',
      message: 'Tu ticket ya ingreso al inbox y quedo visible en el historial.',
    });
    setIsSubmittingTicket(false);
  };

  const handleTicketReply = async (ticketId) => {
    const message = String(commentDrafts[ticketId] || '').trim();

    if (!message) {
      setCommentBanners((current) => ({
        ...current,
        [ticketId]: {
          type: 'error',
          message: 'Escribe un mensaje antes de responder.',
        },
      }));
      return;
    }

    setSubmittingCommentId(ticketId);
    setCommentBanners((current) => ({
      ...current,
      [ticketId]: null,
    }));

    const result = await submitClientTicketComment(ticketId, message);

    if (!result.success) {
      setCommentBanners((current) => ({
        ...current,
        [ticketId]: {
          type: 'error',
          message: result.error || 'No se pudo guardar tu mensaje.',
        },
      }));
      setSubmittingCommentId(null);
      return;
    }

    if (result.comment) {
      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                ticket_comments: [...(ticket.ticket_comments || []), result.comment],
              }
            : ticket
        )
      );
    }

    setCommentDrafts((currentDrafts) => ({ ...currentDrafts, [ticketId]: '' }));
    setCommentBanners((current) => ({
      ...current,
      [ticketId]: {
        type: 'success',
        message: 'Tu respuesta ya se envio al equipo.',
      },
    }));
    setSubmittingCommentId(null);
  };

  const handleDownloadInvoice = async (invoice) => {
    setDownloadingInvoiceId(invoice.id);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const statusMeta = getInvoiceStatusMeta(invoice.status);
      const invoiceAmount = formatMoney(invoice.amount);
      const periodLabel = formatPeriodLabel(invoice.period_key);
      const dueDateLabel = formatDate(invoice.due_date) || 'Sin vencimiento cargado';
      const paidAtLabel = formatDate(invoice.paid_at) || 'Pendiente de pago';

      pdf.setFillColor(17, 24, 39);
      pdf.rect(0, 0, 210, 34, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text('Faro Portal B2B', 14, 18);
      pdf.setFontSize(10);
      pdf.text(clientData?.name || 'Cliente', 14, 25);

      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(18);
      pdf.text(invoice.title || 'Comprobante', 14, 50);
      pdf.setFontSize(11);
      pdf.setTextColor(75, 85, 99);
      pdf.text(`Periodo: ${periodLabel}`, 14, 59);
      pdf.text(`Estado: ${statusMeta.label}`, 14, 66);

      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(14, 78, 182, 32, 4, 4);
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(10);
      pdf.text('Importe', 20, 90);
      pdf.text('Vencimiento', 90, 90);
      pdf.text('Pagada', 145, 90);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(16);
      pdf.text(invoiceAmount, 20, 101);
      pdf.setFontSize(11);
      pdf.text(dueDateLabel, 90, 101, { maxWidth: 48 });
      pdf.text(paidAtLabel, 145, 101, { maxWidth: 40 });

      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(10);
      pdf.text('Contacto operativo', 14, 124);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(12);
      pdf.text(contactName, 14, 132);
      pdf.text(contactEmail, 14, 139, { maxWidth: 120 });

      if (website) {
        pdf.setTextColor(37, 99, 235);
        pdf.text(website, 14, 147, { maxWidth: 182 });
      }

      if (invoice.notes) {
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(10);
        pdf.text('Notas', 14, 163);
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(11);
        const noteLines = pdf.splitTextToSize(String(invoice.notes), 182);
        pdf.text(noteLines, 14, 171);
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(14, 250, 196, 250);
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(10);
      pdf.text('Generado desde el portal privado de Loop Smith Management.', 14, 258);

      pdf.save(buildInvoiceFileName(invoice));
    } catch (error) {
      console.error('Error generating invoice PDF', error);
    }

    setDownloadingInvoiceId(null);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="relative overflow-hidden rounded-[32px] border border-brand-500 bg-brand-600 p-6 text-white shadow-xl shadow-brand-200">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-500/60" />
          <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-brand-700/60" />
          <div className="relative z-10">
            <p className="rounded-full border border-brand-400 bg-brand-700/40 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-100">
              Resumen
            </p>
            <h3 className="mt-4 text-3xl font-black tracking-tight">{formatMoney(outstandingBalance)}</h3>
            <p className="mt-2 text-sm font-medium text-brand-100">Saldo abierto visible en el portal.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-100">Facturas abiertas</p>
                <p className="mt-2 text-2xl font-black">{openInvoices.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-100">Tickets abiertos</p>
                <p className="mt-2 text-2xl font-black">{openTickets.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Cuenta</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-900">{clientData?.name}</h3>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Globe className="text-2xl" weight="bold" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Web</p>
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-sm font-bold text-brand-700 hover:underline"
                >
                  {website}
                </a>
              ) : (
                <p className="mt-2 text-sm font-medium text-gray-500">No hay dominio cargado todavia.</p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-gray-900">
                <EnvelopeSimple className="text-lg text-gray-400" weight="bold" />
                <p className="text-sm font-black">Contacto del servicio</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-700">{contactName}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">{contactEmail}</p>
            </div>
          </div>
        </section>

        <a
          href="https://wa.me/5491128662553?text=Hola%20agencia,%20necesito%20soporte%20urgente"
          target="_blank"
          rel="noreferrer"
          className="relative overflow-hidden rounded-[32px] border border-[#20B958] bg-[#25D366] p-6 text-white shadow-[0_12px_35px_rgba(37,211,102,0.35)] transition-colors hover:bg-[#20B958]"
        >
          <div className="absolute inset-0 bg-white opacity-0 transition-opacity hover:opacity-10" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <WhatsappLogo className="text-5xl" weight="fill" />
              <h3 className="mt-4 text-2xl font-extrabold leading-tight">Linea directa</h3>
              <p className="mt-2 text-sm font-bold uppercase tracking-wide text-green-100">
                Para urgencias y bloqueos de operacion
              </p>
            </div>
            <div className="mt-8 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur-sm">
              Respuesta rapida por WhatsApp
            </div>
          </div>
        </a>
      </div>

      <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Facturas</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-900">Estado de cuenta</h3>
          </div>
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
            <Receipt className="text-2xl" weight="fill" />
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center font-medium text-gray-500">Todavia no hay facturas emitidas.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {invoices.map((invoice) => {
              const statusMeta = getInvoiceStatusMeta(invoice.status);
              const dueDateLabel = formatDate(invoice.due_date) || 'Sin vencimiento cargado';
              const paidAtLabel = formatDate(invoice.paid_at);

              return (
                <div key={invoice.id} className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">{invoice.title}</p>
                      <p className="mt-2 text-xs font-medium text-gray-500">{formatPeriodLabel(invoice.period_key)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="mt-4 text-2xl font-black text-gray-900">{formatMoney(invoice.amount)}</p>
                  <p className="mt-2 text-sm font-medium text-gray-500">Vence {dueDateLabel}</p>
                  {paidAtLabel ? (
                    <p className="mt-1 text-sm font-medium text-emerald-600">Pagada {paidAtLabel}</p>
                  ) : null}
                  {invoice.notes ? (
                    <p className="mt-3 text-sm font-medium text-gray-600">{invoice.notes}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleDownloadInvoice(invoice)}
                    disabled={downloadingInvoiceId === invoice.id}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                  >
                    <DownloadSimple weight="bold" className="text-lg" />
                    {downloadingInvoiceId === invoice.id ? 'Generando PDF...' : 'Descargar comprobante'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {openInvoices.length > 0 ? (
          <p className="mt-5 text-sm font-medium text-gray-500">
            Tienes {openInvoices.length} factura(s) abierta(s) por {formatMoney(outstandingBalance)}.
          </p>
        ) : (
          <p className="mt-5 text-sm font-medium text-emerald-600">No tienes facturas pendientes en este momento.</p>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="sticky top-24 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-1 sm:p-8">
          <h3 className="mb-2 flex items-center gap-3 text-2xl font-black text-gray-900">
            <Ticket className="text-brand-600" weight="fill" />
            Abrir un pedido
          </h3>
          <p className="mb-6 text-sm font-bold text-gray-500">
            Describe el cambio o soporte que necesitas y lo tomamos en el inbox.
          </p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Abiertos</p>
              <p className="mt-2 text-2xl font-black text-gray-900">{openTickets.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-500">Resueltos</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{resolvedTickets}</p>
            </div>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500">Asunto principal</label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ej: Nuevo producto para tienda"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500">Detalles</label>
              <textarea
                name="description"
                required
                rows="4"
                placeholder="Explica el cambio con el mayor contexto posible"
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium outline-none transition-all focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <Banner type={ticketBanner?.type} message={ticketBanner?.message} />

            <button
              type="submit"
              disabled={isSubmittingTicket}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 font-extrabold text-white shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5 hover:bg-black disabled:opacity-50"
            >
              <PaperPlaneRight weight="bold" className="text-lg" />
              {isSubmittingTicket ? 'Enviando ticket...' : 'Enviar ticket oficial'}
            </button>
          </form>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xl font-extrabold tracking-tight text-gray-800">Historial y seguimiento</h3>
            <span className="rounded-lg bg-gray-200 px-3 py-1 text-xs font-black uppercase tracking-widest text-gray-600">
              {tickets.length} tickets
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <CheckCircle className="text-4xl" weight="fill" />
              </div>
              <h4 className="mb-2 text-xl font-black text-gray-900">Todo en orden</h4>
              <p className="text-sm font-bold text-gray-400">
                Cuando necesites algo, usa el panel lateral para abrir un pedido.
              </p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const statusMeta = getTicketStatusMeta(ticket.status);
              const priorityMeta = getTicketPriorityMeta(ticket.priority || 'medium');
              const publicComments = [...(ticket.ticket_comments || [])].sort(
                (left, right) => new Date(left.created_at) - new Date(right.created_at)
              );
              const commentBanner = commentBanners[ticket.id];

              return (
                <div key={ticket.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="pr-4">
                      <h4 className="mb-1 text-lg font-extrabold leading-tight text-gray-900">{ticket.title}</h4>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        {formatDate(ticket.created_at) || 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${priorityMeta.className}`}>
                        {priorityMeta.label}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 rounded-xl border border-gray-100/50 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-600">
                    {ticket.description}
                  </p>

                  {publicComments.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {publicComments.map((comment) => (
                        <div key={comment.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-gray-900">{comment.author_name}</span>
                            <span className="text-xs font-medium text-gray-400">
                              {formatDateTime(comment.created_at) || 'Sin horario'}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-medium text-gray-600">{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <label className="block text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                      Responder sobre este ticket
                    </label>
                    <textarea
                      rows="3"
                      value={commentDrafts[ticket.id] || ''}
                      onChange={(event) =>
                        setCommentDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [ticket.id]: event.target.value,
                        }))
                      }
                      placeholder="Agrega contexto, material o una aclaracion para el equipo"
                      className="mt-3 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    />

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => handleTicketReply(ticket.id)}
                        disabled={submittingCommentId === ticket.id}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                      >
                        <PaperPlaneRight weight="bold" />
                        {submittingCommentId === ticket.id ? 'Enviando...' : 'Enviar respuesta'}
                      </button>
                      <span className="text-xs font-semibold text-gray-400">
                        {publicComments.length} mensaje(s) visibles en este ticket
                      </span>
                    </div>

                    <div className="mt-3">
                      <Banner type={commentBanner?.type} message={commentBanner?.message} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
