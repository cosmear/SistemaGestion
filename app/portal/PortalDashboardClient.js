'use client';
import { useState } from 'react';
import {
  CheckCircle,
  DownloadSimple,
  Globe,
  PaperPlaneRight,
  Receipt,
  Ticket,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { submitClientTicket, submitClientTicketComment } from '@/app/portal-actions';
import { formatPeriodLabel } from '@/utils/billing';
import { getInvoiceStatusMeta, getTicketPriorityMeta, getTicketStatusMeta } from '@/utils/constants';

export default function PortalDashboardClient({ clientData, initialTickets, initialInvoices }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [submittingCommentId, setSubmittingCommentId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  const formatMoney = (value) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value || 0));

  const website = clientData?.website_url
    ? (clientData.website_url.startsWith('http') ? clientData.website_url : `https://${clientData.website_url}`)
    : null;

  const currentMonth = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const currentMonthCapitalized = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
  const openInvoices = (initialInvoices || []).filter((invoice) => ['draft', 'pending', 'overdue'].includes(invoice.status));

  const handleSubmitTicket = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.target);
    const title = formData.get('title');
    const description = formData.get('description');

    const result = await submitClientTicket(title, description);

    if (result.success) {
      event.target.reset();
      router.refresh();
    } else {
      alert(result.error || 'Error enviando el ticket. Por favor contactanos por linea directa.');
    }

    setIsSubmitting(false);
  };

  const handleTicketReply = async (ticketId) => {
    const message = String(commentDrafts[ticketId] || '').trim();

    if (!message) {
      return;
    }

    setSubmittingCommentId(ticketId);
    const result = await submitClientTicketComment(ticketId, message);

    if (!result.success) {
      alert(result.error || 'No se pudo guardar tu mensaje.');
      setSubmittingCommentId(null);
      return;
    }

    setCommentDrafts((currentDrafts) => ({ ...currentDrafts, [ticketId]: '' }));
    setSubmittingCommentId(null);
    router.refresh();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      const element = document.getElementById('receipt-template');
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';

      const canvas = await html2canvas(element, { scale: 2 });
      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Comprobante_Mensualidad_${currentMonth.replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF.');
    }

    setIsGeneratingPDF(false);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div
          className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center items-center text-center group cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
          onClick={() => website && window.open(website, '_blank')}
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
            <Globe className="text-3xl" weight="bold" />
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 leading-tight">Acceso rapido a web</h3>
          {website ? (
            <p className="text-sm font-bold text-gray-400 mt-2 truncate w-full px-4">{website}</p>
          ) : (
            <p className="text-sm font-bold text-red-400 mt-2 bg-red-50 py-1 px-3 rounded-md">Dominio no cargado todavia</p>
          )}
        </div>

        <div className="bg-brand-600 rounded-3xl p-6 shadow-xl shadow-brand-200 border border-brand-500 flex flex-col justify-between items-center text-center text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-brand-500 rounded-full opacity-50"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-brand-700 rounded-full opacity-50"></div>

          <div className="z-10 w-full mb-3 flex flex-col items-center pt-2">
            <p className="text-xs text-brand-100 font-extrabold uppercase tracking-widest bg-brand-800/40 px-3 py-1 rounded-full border border-brand-500 mb-3 shadow-inner">
              Abono {currentMonthCapitalized}
            </p>
            <h3 className="text-4xl font-black tracking-tight drop-shadow-sm">{formatMoney(clientData.pack_monthly_fee)}</h3>
            <p className="text-sm text-brand-100 font-medium mt-1">Retainer base del mes corriente</p>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="z-10 w-full mt-auto py-3 bg-white hover:bg-gray-50 text-brand-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isGeneratingPDF ? 'Generando...' : <><DownloadSimple weight="bold" className="text-lg" /> Descargar comprobante</>}
          </button>
        </div>

        <a
          href="https://wa.me/5491128662553?text=Hola%20agencia,%20necesito%20soporte%20urgente"
          target="_blank"
          className="bg-[#25D366] rounded-3xl p-6 shadow-[0_8px_30px_rgba(37,211,102,0.3)] border border-[#20B958] flex flex-col justify-center items-center text-center hover:bg-[#20B958] transition-colors group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <WhatsappLogo className="text-5xl text-white mb-3 group-hover:scale-110 transition-transform duration-300 relative z-10" weight="fill" />
          <h3 className="text-xl font-extrabold text-white leading-tight relative z-10">Linea directa</h3>
          <p className="text-sm font-bold text-green-100 mt-1.5 uppercase tracking-wide relative z-10">Reporta emergencias ya</p>
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

        {initialInvoices.length === 0 ? (
          <div className="py-12 text-center text-gray-500 font-medium">Todavia no hay facturas emitidas.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {initialInvoices.map((invoice) => {
              const statusMeta = getInvoiceStatusMeta(invoice.status);

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
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    {invoice.due_date ? `Vence ${new Date(invoice.due_date).toLocaleDateString('es-AR')}` : 'Sin vencimiento cargado'}
                  </p>
                  {invoice.notes ? (
                    <p className="mt-3 text-sm font-medium text-gray-600">{invoice.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {openInvoices.length > 0 ? (
          <p className="mt-5 text-sm font-medium text-gray-500">
            Tienes {openInvoices.length} factura(s) abierta(s) por {formatMoney(openInvoices.reduce((total, invoice) => total + Number(invoice.amount || 0), 0))}.
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-3">
        <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-24">
          <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-2">
            <Ticket className="text-brand-600" weight="fill" /> Abrir un pedido
          </h3>
          <p className="text-sm text-gray-500 font-bold mb-6">Describe el cambio o soporte que necesitas y lo tomamos en el inbox.</p>

          <form onSubmit={handleSubmitTicket} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Asunto principal</label>
              <input type="text" name="title" required placeholder="Ej: Nuevo producto para tienda..." className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none text-sm font-semibold transition-all" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Detalles adicionales</label>
              <textarea name="description" required rows="4" placeholder="Explica con detalle asi podemos accionar rapido..." className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none text-sm font-medium transition-all resize-none"></textarea>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 mt-2">
              Enviar ticket oficial <PaperPlaneRight weight="bold" className="text-lg" />
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-extrabold text-gray-800 tracking-tight">Historial y seguimiento</h3>
            <span className="text-xs font-black uppercase tracking-widest bg-gray-200 text-gray-600 px-3 py-1 rounded-lg">
              {initialTickets.length} Tickets
            </span>
          </div>

          {initialTickets.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="text-4xl" weight="fill" />
              </div>
              <h4 className="text-xl font-black text-gray-900 mb-2">Todo en orden</h4>
              <p className="text-sm font-bold text-gray-400">Cuando necesites algo, usa el panel lateral para abrir un pedido.</p>
            </div>
          ) : (
            initialTickets.map((ticket) => {
              const statusMeta = getTicketStatusMeta(ticket.status);
              const priorityMeta = getTicketPriorityMeta(ticket.priority || 'medium');
              const publicComments = [...(ticket.ticket_comments || [])].sort(
                (left, right) => new Date(left.created_at) - new Date(right.created_at)
              );

              return (
                <div key={ticket.id} className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="pr-4">
                      <h4 className="text-lg font-extrabold text-gray-900 leading-tight mb-1">{ticket.title}</h4>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusMeta.className}`}>{statusMeta.label}</span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${priorityMeta.className}`}>{priorityMeta.label}</span>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-gray-600 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100/50">
                    {ticket.description}
                  </p>

                  {publicComments.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {publicComments.map((comment) => (
                        <div key={comment.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-gray-900">{comment.author_name}</span>
                            <span className="text-xs font-medium text-gray-400">{new Date(comment.created_at).toLocaleString('es-AR')}</span>
                          </div>
                          <p className="mt-3 text-sm font-medium text-gray-600">{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <label className="block text-xs font-black uppercase tracking-[0.18em] text-gray-400">Responder sobre este ticket</label>
                    <textarea
                      rows="3"
                      value={commentDrafts[ticket.id] || ''}
                      onChange={(event) => setCommentDrafts((currentDrafts) => ({ ...currentDrafts, [ticket.id]: event.target.value }))}
                      placeholder="Agrega contexto, material o una aclaracion para el equipo..."
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                    <button
                      onClick={() => handleTicketReply(ticket.id)}
                      disabled={submittingCommentId === ticket.id}
                      className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                    >
                      {submittingCommentId === ticket.id ? 'Enviando...' : 'Enviar respuesta'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div id="receipt-template" style={{ display: 'none', width: '800px', padding: '40px', backgroundColor: '#ffffff', color: '#111827', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#16a34a' }}>Loop Smith</h1>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Servicios Digitales y Desarrollo Web</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>COMPROBANTE B2B</h2>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0', fontWeight: 'bold' }}>Periodo: {currentMonthCapitalized}</p>
              </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
              <p style={{ fontSize: '12px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Emitido Para:</p>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{clientData.name}</h3>
              <p style={{ fontSize: '14px', color: '#4b5563', margin: '4px 0 0 0' }}>{website || 'Sin dominio registrado'}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
              <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Descripcion del Servicio</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Importe Mensual</th>
                  </tr>
              </thead>
              <tbody>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '24px 16px', fontSize: '16px', fontWeight: '600' }}>
                          Soporte, mantenimiento y retainer B2B <br/>
                          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'normal' }}>Correspondiente al mes de {currentMonth}</span>
                      </td>
                      <td style={{ padding: '24px 16px', textAlign: 'right', fontSize: '16px', fontWeight: '800' }}>{formatMoney(clientData.pack_monthly_fee)}</td>
                  </tr>
              </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px' }}>
             <div style={{ backgroundColor: '#f0fdf4', padding: '20px 40px', borderRadius: '16px', border: '1px solid #bbf7d0', textAlign: 'right' }}>
                 <p style={{ fontSize: '12px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Total</p>
                 <p style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#14532d' }}>{formatMoney(clientData.pack_monthly_fee)}</p>
             </div>
          </div>
      </div>
    </div>
  );
}
