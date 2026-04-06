'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  GoogleLogo,
  Plus,
  TrashSimple,
  User,
  Users,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { addCalendarEvent, deleteCalendarEvent } from '@/app/actions';
import {
  disconnectGoogleCalendarAccount,
  refreshGoogleCalendarAccountSources,
  setGoogleCalendarSourceEnabled,
} from '@/app/google-calendar-actions';
import { runServerAction } from '@/utils/client/runServerAction';

const GOOGLE_STATUS_MESSAGES = {
  connected: {
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle,
    title: 'Google Calendar conectado',
    message: 'La cuenta quedo vinculada y ya puede aportar eventos a la agenda.',
  },
  error: {
    classes: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: WarningCircle,
    title: 'No se pudo completar la conexion',
    message: 'Google devolvio un error al terminar el OAuth. Reintenta la vinculacion.',
  },
  'auth-error': {
    classes: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: WarningCircle,
    title: 'Sesion expirada',
    message: 'Vuelve a iniciar sesion antes de conectar una cuenta de Google.',
  },
  'state-error': {
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: WarningCircle,
    title: 'Vinculacion invalida',
    message: 'La conexion con Google vencio o no coincide con esta sesion. Intenta otra vez.',
  },
  'missing-config': {
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: WarningCircle,
    title: 'Falta configurar Google Calendar',
    message:
      'Crea GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET y GOOGLE_CALENDAR_TOKEN_SECRET para habilitar esta integracion.',
  },
  'legacy-user': {
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: WarningCircle,
    title: 'Usuario no compatible',
    message:
      'Solo los usuarios internos guardados en la tabla de personal pueden conectar cuentas de Google.',
  },
};

export default function CalendarClient({
  internalUsers,
  currentUserId,
  googleCalendarEnabled,
  googleConnectionAllowed,
  googleConnections,
  googleStatus,
}) {
  const router = useRouter();
  const calendarRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibility, setVisibility] = useState('personal');
  const [pendingKey, setPendingKey] = useState(null);
  const [calendarError, setCalendarError] = useState('');
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [sourceSelectionOverrides, setSourceSelectionOverrides] = useState({});
  const [isRefreshingUI, startTransition] = useTransition();
  const userMap = useMemo(
    () => Object.fromEntries((internalUsers || []).map((user) => [user.id, user])),
    [internalUsers]
  );
  const shareableUsers = (internalUsers || []).filter((user) => user.id !== currentUserId);
  const googleStatusConfig = googleStatus ? GOOGLE_STATUS_MESSAGES[googleStatus] : null;
  const GoogleStatusIcon = googleStatusConfig?.icon || null;

  const refetchCalendar = () => {
    calendarRef.current?.getApi()?.refetchEvents();
  };

  const syncCalendarUi = () => {
    refetchCalendar();
    startTransition(() => {
      router.refresh();
    });
  };

  const resetModal = () => {
    setShowModal(false);
    setVisibility('personal');
    setIsSubmitting(false);
  };

  const getSourceSelection = (source) => {
    if (Object.prototype.hasOwnProperty.call(sourceSelectionOverrides, source.id)) {
      return sourceSelectionOverrides[source.id];
    }

    return source.isSelected !== false;
  };

  const handleConnectGoogle = () => {
    window.location.assign('/api/google-calendar/connect');
  };

  const handleEventClick = async (info) => {
    const isTask = info.event.extendedProps.isTask;
    const isEvent = info.event.extendedProps.isEvent;
    const isGoogleEvent = info.event.extendedProps.isGoogleEvent;

    if (isGoogleEvent) {
      const accountEmail = info.event.extendedProps.googleAccountEmail;
      const calendarName = info.event.extendedProps.googleCalendarSummary;
      const summary = `${info.event.title}\nCuenta: ${accountEmail}\nCalendario: ${calendarName}`;

      if (info.event.extendedProps.googleHtmlLink) {
        const shouldOpen = window.confirm(
          `Evento sincronizado desde Google\n\n${summary}\n\nQuieres abrirlo en Google Calendar?`
        );

        if (shouldOpen) {
          window.open(info.event.extendedProps.googleHtmlLink, '_blank', 'noopener,noreferrer');
        }

        return;
      }

      alert(`Evento sincronizado desde Google\n\n${summary}`);
      return;
    }

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
        return;
      }

      refetchCalendar();
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
    refetchCalendar();
  };

  const handleRefreshGoogleAccount = async (accountId) => {
    setPendingKey(`account-refresh:${accountId}`);

    try {
      const result = await runServerAction(refreshGoogleCalendarAccountSources, accountId);

      if (!result.success) {
        alert(result.error || 'No se pudo refrescar la cuenta de Google.');
        return;
      }

      syncCalendarUi();
    } finally {
      setPendingKey(null);
    }
  };

  const handleDisconnectGoogleAccount = async (accountId, accountEmail) => {
    const confirmed = window.confirm(
      `Vas a desconectar ${accountEmail}.\n\nLos eventos dejaran de verse en este calendario.`
    );

    if (!confirmed) {
      return;
    }

    setPendingKey(`account-disconnect:${accountId}`);

    try {
      const result = await runServerAction(disconnectGoogleCalendarAccount, accountId);

      if (!result.success) {
        alert(result.error || 'No se pudo desconectar la cuenta de Google.');
        return;
      }

      syncCalendarUi();
    } finally {
      setPendingKey(null);
    }
  };

  const handleToggleGoogleSource = async (sourceId, nextValue) => {
    setPendingKey(`source:${sourceId}`);
    setSourceSelectionOverrides((current) => ({
      ...current,
      [sourceId]: nextValue,
    }));

    try {
      const result = await runServerAction(setGoogleCalendarSourceEnabled, sourceId, nextValue);

      if (!result.success) {
        setSourceSelectionOverrides((current) => ({
          ...current,
          [sourceId]: !nextValue,
        }));
        alert(result.error || 'No se pudo actualizar ese calendario externo.');
        return;
      }

      syncCalendarUi();
    } finally {
      setPendingKey(null);
    }
  };

  const loadEvents = async (fetchInfo, successCallback, failureCallback) => {
    try {
      setCalendarError('');

      const query = new URLSearchParams({
        start: fetchInfo.startStr,
        end: fetchInfo.endStr,
      });

      const response = await fetch(`/api/calendar/feed?${query.toString()}`, {
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar la agenda corporativa.');
      }

      successCallback(payload?.events || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar la agenda corporativa.';
      setCalendarError(message);
      failureCallback(error);
    }
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col bg-gray-50/30 p-4 sm:p-8">
      <div className="mb-6 flex shrink-0 flex-col items-start justify-between gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="mb-1 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-gray-900">
            <CalendarBlank className="text-brand-600" weight="fill" /> Agenda corporativa
          </h3>
          <p className="text-sm font-medium text-gray-500">
            Cruza tareas internas con eventos propios, compartidos y ahora tambien con Google
            Calendar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {googleConnectionAllowed ? (
            <button
              type="button"
              onClick={handleConnectGoogle}
              className="flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
            >
              <GoogleLogo weight="fill" className="text-lg" /> Conectar Google
            </button>
          ) : null}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
          >
            <Plus weight="bold" className="text-lg" /> Nuevo evento
          </button>
        </div>
      </div>

      {googleStatusConfig ? (
        <div
          className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${googleStatusConfig.classes}`}
        >
          {GoogleStatusIcon ? (
            <GoogleStatusIcon className="mt-0.5 shrink-0 text-lg" weight="fill" />
          ) : null}
          <div>
            <p className="font-black">{googleStatusConfig.title}</p>
            <p>{googleStatusConfig.message}</p>
          </div>
        </div>
      ) : null}

      {calendarError ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          <WarningCircle className="mt-0.5 shrink-0 text-lg" weight="fill" />
          <div>
            <p className="font-black">No se pudo refrescar la agenda</p>
            <p>{calendarError}</p>
          </div>
        </div>
      ) : null}

      <div className="mb-6 shrink-0 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="flex items-center gap-2 text-lg font-black text-gray-900">
              <GoogleLogo weight="fill" className="text-brand-600" /> Google Calendar
            </h4>
            <p className="text-sm font-medium text-gray-500">
              Puedes conectar varias cuentas y decidir que calendarios externos entran en la agenda.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            {isCalendarLoading ? 'Sincronizando agenda...' : 'Feed dinamico por rango'}
          </div>
        </div>

        {!googleCalendarEnabled ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Configura `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` y
            `GOOGLE_CALENDAR_TOKEN_SECRET` para habilitar esta integracion.
          </div>
        ) : !googleConnectionAllowed ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Esta sesion es legacy. Para conectar Google Calendar, entra con un usuario que exista en
            `internal_users`.
          </div>
        ) : googleConnections.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-sm font-medium text-gray-500">
            Aun no hay cuentas conectadas. Vincula una cuenta de Google para empezar a traer sus
            eventos.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {googleConnections.map((account) => {
              const selectedSources = account.sources.filter((source) => getSourceSelection(source));
              const isRefreshingAccount = pendingKey === `account-refresh:${account.id}`;
              const isDisconnectingAccount = pendingKey === `account-disconnect:${account.id}`;

              return (
                <div
                  key={account.id}
                  className="rounded-3xl border border-gray-100 bg-gray-50/60 p-4"
                >
                  <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-gray-900">
                        {account.displayName || account.email}
                      </p>
                      <p className="text-sm font-medium text-gray-500">{account.email}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        {selectedSources.length} calendarios visibles de {account.sources.length}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRefreshGoogleAccount(account.id)}
                        disabled={isRefreshingAccount || isRefreshingUI}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ArrowsClockwise
                          className={isRefreshingAccount ? 'animate-spin text-base' : 'text-base'}
                          weight="bold"
                        />
                        Actualizar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnectGoogleAccount(account.id, account.email)}
                        disabled={isDisconnectingAccount || isRefreshingUI}
                        className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <TrashSimple className="text-base" weight="bold" />
                        Desconectar
                      </button>
                    </div>
                  </div>

                  {account.sources.length === 0 ? (
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      Esta cuenta ya quedo conectada, pero todavia no devolvio calendarios.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {account.sources.map((source) => {
                        const isSelected = getSourceSelection(source);
                        const isSourcePending = pendingKey === `source:${source.id}`;

                        return (
                          <button
                            key={source.id}
                            type="button"
                            onClick={() => handleToggleGoogleSource(source.id, !isSelected)}
                            disabled={isSourcePending || isRefreshingUI}
                            className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition-all ${
                              isSelected
                                ? 'border-brand-200 bg-white ring-2 ring-brand-100'
                                : 'border-gray-200 bg-white/60 hover:border-gray-300'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: source.backgroundColor || '#4285F4' }}
                                  />
                                  <p className="truncate text-sm font-black text-gray-900">
                                    {source.summary}
                                  </p>
                                </div>
                                <p className="mt-1 text-xs font-medium text-gray-500">
                                  {source.primaryCalendar ? 'Principal' : 'Secundario'} ·{' '}
                                  {source.accessRole}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                                  isSelected
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {isSelected ? 'Visible' : 'Oculto'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="mb-4 flex shrink-0 flex-wrap gap-4 border-b border-gray-100 pb-4">
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
            <span className="h-3 w-3 rounded-full bg-[#F97316]" /> Evento interno
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="h-3 w-3 rounded-full bg-[#EC4899]" /> Evento personal o compartido
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <span className="h-3 w-3 rounded-full bg-[#4285F4]" /> Evento de Google Calendar
          </span>
        </div>

        <div className="custom-scrollbar relative min-h-0 flex-1 w-full overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            events={loadEvents}
            eventClick={handleEventClick}
            loading={setIsCalendarLoading}
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
                    onChange={(changeEvent) => setVisibility(changeEvent.target.value)}
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
                  Aunque el evento sea personal, las personas seleccionadas tambien lo veran en su
                  calendario.
                </p>

                {shareableUsers.length === 0 ? (
                  <p className="mt-4 text-sm font-medium text-gray-500">
                    No hay otros usuarios internos activos.
                  </p>
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
