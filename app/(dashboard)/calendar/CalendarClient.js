'use client';

import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarBlank, Plus, User, Users, X } from '@phosphor-icons/react';
import { addCalendarEvent, deleteCalendarEvent } from '@/app/actions';
import { runServerAction } from '@/utils/client/runServerAction';

export default function CalendarClient({ events, internalUsers, currentUserId }) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibility, setVisibility] = useState('personal');
  const userMap = useMemo(
    () => Object.fromEntries((internalUsers || []).map((user) => [user.id, user])),
    [internalUsers]
  );
  const shareableUsers = (internalUsers || []).filter((user) => user.id !== currentUserId);

  const resetModal = () => {
    setShowModal(false);
    setVisibility('personal');
    setIsSubmitting(false);
  };

  const handleEventClick = async (info) => {
    const isTask = info.event.extendedProps.isTask;
    const isEvent = info.event.extendedProps.isEvent;

    if (isTask) {
      const assignedUser = info.event.extendedProps.assignedUserId
        ? userMap[info.event.extendedProps.assignedUserId]?.full_name
        : null;

      alert(
        `Vencimiento de tarea\n\nNombre: ${info.event.title}\nFecha: ${info.event.start.toLocaleDateString(
          'es-AR',
          {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        )}\nPrioridad: ${(info.event.extendedProps.priority || 'low').toUpperCase()}${
          assignedUser ? `\nResponsable: ${assignedUser}` : ''
        }`
      );
      return;
    }

    if (!isEvent) {
      return;
    }

    const summary = `${info.event.title}\nInicia: ${info.event.start.toLocaleString('es-AR')}`;

    if (!info.event.extendedProps.canDelete) {
      alert(`Evento agendado\n\n${summary}`);
      return;
    }

    const confirmDelete = window.confirm(`Evento agendado\n\n${summary}\n\nDeseas eliminarlo?`);

    if (confirmDelete) {
      const result = await runServerAction(
        deleteCalendarEvent,
        info.event.extendedProps.originalId,
        info.event.extendedProps.originalTitle
      );

      if (!result.success) {
        alert(result.error || 'No se pudo eliminar el evento.');
      }
    }
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.target);
    const dateInput = formData.get('date');
    const timeInput = formData.get('time');
    const dateStr = timeInput ? `${dateInput}T${timeInput}:00` : `${dateInput}T00:00:00`;
    const payload = {
      title: formData.get('title'),
      dateStr: new Date(dateStr).toISOString(),
      type: formData.get('type'),
      visibility: formData.get('visibility'),
      sharedUserIds: formData.getAll('sharedUserIds'),
    };

    const result = await runServerAction(addCalendarEvent, payload);

    if (!result.success) {
      alert(result.error || 'No se pudo agendar el evento.');
      setIsSubmitting(false);
      return;
    }

    resetModal();
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col bg-gray-50/30 p-4 sm:p-8">
      <div className="mb-6 flex shrink-0 flex-col items-start justify-between gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="mb-1 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-gray-900">
            <CalendarBlank className="text-brand-600" weight="fill" /> Agenda corporativa
          </h3>
          <p className="text-sm font-medium text-gray-500">
            Cruza vencimientos de tareas con eventos globales, personales o compartidos por @personas.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Plus weight="bold" className="text-lg" /> Nuevo evento
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="mb-4 flex flex-wrap gap-4 border-b border-gray-100 pb-4 shrink-0">
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="h-3 w-3 rounded-full bg-[#8B5CF6]" /> Tarea personal
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="h-3 w-3 rounded-full bg-[#3B82F6]" /> Tareas de equipo
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="h-3 w-3 rounded-full bg-[#10B981]" /> Tareas cliente
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="h-3 w-3 rounded-full bg-[#F97316]" /> Evento global
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="h-3 w-3 rounded-full bg-[#EC4899]" /> Evento personal o compartido
          </span>
        </div>

        <div className="custom-scrollbar relative min-h-0 flex-1 w-full overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            events={events}
            eventClick={handleEventClick}
            height="100%"
            locale="es"
            dayMaxEvents
            fixedWeekCount={false}
          />
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50 p-6">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-extrabold text-brand-900">
                  <CalendarBlank weight="fill" className="text-brand-600" /> Agendar evento
                </h3>
                <p className="mt-1 text-sm font-medium text-brand-700">
                  Puedes dejarlo solo para ti, compartirlo con usuarios concretos o volverlo global.
                </p>
              </div>
              <button
                onClick={resetModal}
                className="rounded-lg p-1 text-brand-400 transition-colors hover:bg-white hover:text-brand-800"
              >
                <X weight="bold" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                  Titulo
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ej: Reunion con cliente"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-900 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                    Dia
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-900 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                    Horario
                  </label>
                  <input
                    type="time"
                    name="time"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-900 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                    Tipo
                  </label>
                  <select
                    name="type"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-700 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="meeting">Reunion</option>
                    <option value="call">Llamada</option>
                    <option value="reminder">Recordatorio</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                    Alcance
                  </label>
                  <select
                    name="visibility"
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-700 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="personal">Personal</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  {visibility === 'global' ? (
                    <Users className="text-orange-500" weight="fill" />
                  ) : (
                    <User className="text-pink-500" weight="fill" />
                  )}
                  <p className="text-sm font-black text-gray-900">Arrobar personas</p>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Aunque el evento sea personal, las personas seleccionadas tambien lo veran en su calendario.
                </p>

                {shareableUsers.length === 0 ? (
                  <p className="mt-4 text-sm font-medium text-gray-500">No hay otros usuarios internos activos.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {shareableUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
                      >
                        <span>{user.full_name}</span>
                        <input
                          type="checkbox"
                          name="sharedUserIds"
                          value={user.id}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-xl px-5 py-3 font-bold text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-brand-600 px-6 py-3 font-extrabold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar en agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
