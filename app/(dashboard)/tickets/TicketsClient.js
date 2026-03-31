'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsClockwise,
  CalendarBlank,
  ChatCircleText,
  ClockCountdown,
  Kanban,
  Lifebuoy,
  PaperPlaneRight,
  Tag,
  UserCircle,
} from '@phosphor-icons/react';
import { addTicketComment, convertTicketToTask, updateTicketDetails } from '@/app/actions';
import { runServerAction } from '@/utils/client/runServerAction';
import {
  getTicketPriorityMeta,
  getTicketStatusMeta,
  TICKET_CLASSIFICATION_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
} from '@/utils/constants';

export default function TicketsClient({ initialTickets }) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets || []);
  const [activeTab, setActiveTab] = useState('open');
  const [selectedTicketId, setSelectedTicketId] = useState(initialTickets?.[0]?.id || null);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentVisibility, setCommentVisibility] = useState('internal');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const filteredTickets = (() => {
    if (activeTab === 'resolved') {
      return tickets.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed');
    }

    return tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status));
  })();

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ||
    filteredTickets[0] ||
    null;

  const patchTicketLocal = (ticketId, updates) => {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...updates } : ticket))
    );
  };

  const handleFieldUpdate = async (ticketId, updates) => {
    patchTicketLocal(ticketId, updates);
    const result = await runServerAction(updateTicketDetails, ticketId, updates);

    if (!result.success) {
      alert(result.error || 'No se pudo actualizar el ticket.');
      router.refresh();
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();

    if (!selectedTicket || !commentMessage.trim()) {
      return;
    }

    setIsCommentSubmitting(true);
    const result = await runServerAction(addTicketComment, selectedTicket.id, commentMessage, commentVisibility);

    if (!result.success) {
      alert(result.error || 'No se pudo guardar el comentario.');
      setIsCommentSubmitting(false);
      return;
    }

    setCommentMessage('');
    setCommentVisibility('internal');
    setIsCommentSubmitting(false);
    router.refresh();
  };

  const handleConvert = async (ticketId) => {
    setIsConverting(true);
    const result = await runServerAction(convertTicketToTask, ticketId);

    if (!result.success) {
      alert(result.error || 'No se pudo convertir el ticket en tarea.');
      setIsConverting(false);
      return;
    }

    setIsConverting(false);
    router.refresh();
  };

  const comments = [...(selectedTicket?.ticket_comments || [])].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at)
  );

  return (
    <div className="absolute inset-0 grid h-full grid-cols-1 gap-6 overflow-y-auto bg-gray-50 p-4 sm:p-8 xl:grid-cols-[0.9fr_1.1fr] custom-scrollbar">
      <section className="rounded-[32px] border border-gray-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Soporte</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-900">Inbox operativo</h3>
            </div>
            <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
              <Lifebuoy weight="fill" className="text-2xl" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('open')}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'open' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Abiertos ({tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === 'resolved' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Resueltos ({tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length})
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-18rem)] overflow-y-auto custom-scrollbar p-4">
          {filteredTickets.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-medium">
              No hay tickets en esta vista.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const statusMeta = getTicketStatusMeta(ticket.status);
                const priorityMeta = getTicketPriorityMeta(ticket.priority);
                const isActive = ticket.id === selectedTicket?.id;

                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                      isActive
                        ? 'border-brand-300 bg-brand-50/50 shadow-[0_12px_30px_rgba(22,163,74,0.08)]'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">{ticket.title}</p>
                        <p className="mt-2 text-xs font-medium text-gray-500">
                          {ticket.clients?.name || 'Cliente eliminado'} ·{' '}
                          {new Date(ticket.created_at).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${priorityMeta.className}`}>
                        {priorityMeta.label}
                      </span>
                      <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-[11px] font-black text-gray-600">
                        {ticket.classification || 'Sin clasificar'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-gray-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)] overflow-hidden">
        {!selectedTicket ? (
          <div className="flex h-full items-center justify-center text-gray-500 font-medium">
            Selecciona un ticket para ver el detalle.
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-gray-100 p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">
                    {selectedTicket.clients?.name || 'Cliente'}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-900">{selectedTicket.title}</h3>
                  <p className="mt-3 text-sm font-medium text-gray-600">{selectedTicket.description}</p>
                </div>

                <button
                  onClick={() => handleConvert(selectedTicket.id)}
                  disabled={isConverting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                >
                  <Kanban weight="bold" />
                  {isConverting ? 'Convirtiendo...' : 'Pasar a tarea'}
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldCard label="Estado">
                  <select
                    value={selectedTicket.status || 'new'}
                    onChange={(event) => handleFieldUpdate(selectedTicket.id, { status: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    {TICKET_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldCard>

                <FieldCard label="Prioridad">
                  <select
                    value={selectedTicket.priority || 'medium'}
                    onChange={(event) => handleFieldUpdate(selectedTicket.id, { priority: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    {TICKET_PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldCard>

                <FieldCard label="Clasificacion">
                  <select
                    value={selectedTicket.classification || ''}
                    onChange={(event) => handleFieldUpdate(selectedTicket.id, { classification: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    {TICKET_CLASSIFICATION_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldCard>

                <FieldCard label="Responsable">
                  <input
                    type="text"
                    value={selectedTicket.assigned_to || ''}
                    onChange={(event) => patchTicketLocal(selectedTicket.id, { assigned_to: event.target.value })}
                    onBlur={(event) => handleFieldUpdate(selectedTicket.id, { assigned_to: event.target.value })}
                    placeholder="Sin asignar"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  />
                </FieldCard>

                <FieldCard label="Vencimiento">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                    <CalendarBlank className="text-gray-400" />
                    <input
                      type="date"
                      value={selectedTicket.due_at ? String(selectedTicket.due_at).slice(0, 10) : ''}
                      onChange={(event) => patchTicketLocal(selectedTicket.id, { due_at: event.target.value })}
                      onBlur={(event) => handleFieldUpdate(selectedTicket.id, { due_at: event.target.value || null })}
                      className="w-full bg-transparent text-sm font-bold text-gray-700 outline-none"
                    />
                  </div>
                </FieldCard>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <ChatCircleText className="text-brand-600" weight="fill" />
                  <h4 className="text-lg font-black text-gray-900">Conversacion</h4>
                </div>

                <div className="max-h-[360px] space-y-3 overflow-y-auto custom-scrollbar pr-2">
                  {comments.length === 0 ? (
                    <p className="text-sm font-medium text-gray-500">Todavia no hay comentarios en este ticket.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <UserCircle className="text-gray-400" weight="fill" />
                            <span className="text-sm font-black text-gray-900">{comment.author_name}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase">{comment.author_role}</span>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${comment.visibility === 'public' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {comment.visibility === 'public' ? 'Publico' : 'Interno'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-700">{comment.message}</p>
                        <p className="mt-3 text-xs font-medium text-gray-400">
                          {new Date(comment.created_at).toLocaleString('es-AR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <ClockCountdown className="text-brand-600" weight="fill" />
                  <h4 className="text-lg font-black text-gray-900">Responder</h4>
                </div>

                <form onSubmit={handleAddComment} className="space-y-4">
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-700">
                      <Tag className="text-gray-400" />
                      Visibilidad
                    </label>
                    <select
                      value={commentVisibility}
                      onChange={(event) => setCommentVisibility(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="internal">Interno</option>
                      <option value="public">Visible para el cliente</option>
                    </select>
                  </div>

                  <div>
                    <textarea
                      rows="8"
                      value={commentMessage}
                      onChange={(event) => setCommentMessage(event.target.value)}
                      placeholder="Escribe una respuesta, contexto interno o pedido de seguimiento..."
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCommentSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {isCommentSubmitting ? <ArrowsClockwise className="animate-spin" /> : <PaperPlaneRight weight="bold" />}
                    {isCommentSubmitting ? 'Guardando comentario...' : 'Guardar comentario'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function FieldCard({ label, children }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
