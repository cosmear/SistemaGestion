'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarBlank, CheckCircle, Plus, Target } from '@phosphor-icons/react';
import { saveDailyMeeting } from '@/app/execution-actions';
import LinkedTasksPanel from '@/components/execution/LinkedTasksPanel';
import {
  EmptyState,
  MetricCard,
  RelationList,
  SectionCard,
  StatusBadge,
} from '@/components/execution/ExecutionShell';
import {
  formatDateLabel,
  formatMonthLabel,
  getMeetingStatusMeta,
  stringListToTextarea,
} from '@/utils/execution';
import { runServerAction } from '@/utils/client/runServerAction';

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildDraft(meeting = null) {
  return {
    meetingDate: meeting?.meeting_date || getTodayValue(),
    focusOfDay: meeting?.focus_of_day || '',
    prioritiesOfDay: stringListToTextarea(meeting?.priorities_of_day || []),
    blockers: stringListToTextarea(meeting?.blockers || []),
    decisions: meeting?.decisions || '',
    observations: meeting?.observations || '',
    participantIds: meeting?.participant_ids || [],
    monthlyGoalIds: meeting?.monthly_goal_ids || [],
    status: meeting?.status || 'open',
  };
}

function toLineArray(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function goalLabel(goal) {
  return `${goal.title} · ${formatMonthLabel(goal.month, goal.year, 'short')}`;
}

export default function DailyMeetingsClient({
  initialMeetings,
  monthlyGoals,
  availableTasks,
  internalUsers,
  boardOptions,
  selectedMeetingId,
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(selectedMeetingId || initialMeetings[0]?.id || null);
  const [draft, setDraft] = useState(buildDraft(initialMeetings.find((meeting) => meeting.id === selectedMeetingId) || null));
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedMeeting = useMemo(
    () => initialMeetings.find((meeting) => meeting.id === selectedId) || null,
    [initialMeetings, selectedId]
  );

  const filteredMeetings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return initialMeetings.filter((meeting) => {
      const matchesFrom = !dateRange.from || meeting.meeting_date >= dateRange.from;
      const matchesTo = !dateRange.to || meeting.meeting_date <= dateRange.to;
      const haystack = [
        meeting.focus_of_day,
        ...(meeting.priorities_of_day || []),
        ...(meeting.blockers || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

      return matchesFrom && matchesTo && matchesSearch;
    });
  }, [dateRange.from, dateRange.to, initialMeetings, searchTerm]);

  const todayMeeting = useMemo(() => {
    const today = getTodayValue();
    return initialMeetings.find((meeting) => meeting.meeting_date === today) || null;
  }, [initialMeetings]);

  const openMeetings = useMemo(
    () => initialMeetings.filter((meeting) => meeting.status === 'open').length,
    [initialMeetings]
  );

  const todayTaskCount = todayMeeting?.linked_tasks?.length || 0;
  const todayPriorityCount = todayMeeting?.priorities_of_day?.length || 0;

  useEffect(() => {
    setSelectedId(selectedMeetingId || initialMeetings[0]?.id || null);
  }, [initialMeetings, selectedMeetingId]);

  useEffect(() => {
    setDraft(buildDraft(selectedMeeting));
  }, [selectedMeeting]);

  const handleSelectMeeting = (meetingId) => {
    setSelectedId(meetingId);
    router.replace(`/daily-meetings?meeting=${meetingId}`, { scroll: false });
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft(buildDraft());
    router.replace('/daily-meetings', { scroll: false });
  };

  const toggleParticipant = (userId) => {
    setDraft((current) => ({
      ...current,
      participantIds: current.participantIds.includes(userId)
        ? current.participantIds.filter((value) => value !== userId)
        : [...current.participantIds, userId],
    }));
  };

  const toggleMonthlyGoal = (goalId) => {
    setDraft((current) => ({
      ...current,
      monthlyGoalIds: current.monthlyGoalIds.includes(goalId)
        ? current.monthlyGoalIds.filter((value) => value !== goalId)
        : [...current.monthlyGoalIds, goalId],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const result = await runServerAction(saveDailyMeeting, selectedMeeting?.id || null, {
      meetingDate: draft.meetingDate,
      focusOfDay: draft.focusOfDay,
      prioritiesOfDay: toLineArray(draft.prioritiesOfDay),
      blockers: toLineArray(draft.blockers),
      decisions: draft.decisions,
      observations: draft.observations,
      participantIds: draft.participantIds,
      monthlyGoalIds: draft.monthlyGoalIds,
      status: draft.status,
    });

    if (!result.success) {
      alert(result.error || 'No se pudo guardar la reunion diaria.');
      setIsSaving(false);
      return;
    }

    const nextMeetingId = result.meeting?.id || null;

    if (nextMeetingId) {
      setSelectedId(nextMeetingId);
      router.replace(`/daily-meetings?meeting=${nextMeetingId}`, { scroll: false });
    }

    router.refresh();
    setIsSaving(false);
  };

  const handleCloseMeeting = async () => {
    if (!selectedMeeting?.id) {
      return;
    }

    setIsSaving(true);
    const result = await runServerAction(saveDailyMeeting, selectedMeeting.id, {
      meetingDate: draft.meetingDate,
      focusOfDay: draft.focusOfDay,
      prioritiesOfDay: toLineArray(draft.prioritiesOfDay),
      blockers: toLineArray(draft.blockers),
      decisions: draft.decisions,
      observations: draft.observations,
      participantIds: draft.participantIds,
      monthlyGoalIds: draft.monthlyGoalIds,
      status: 'closed',
    });

    if (!result.success) {
      alert(result.error || 'No se pudo cerrar la reunion.');
      setIsSaving(false);
      return;
    }

    router.refresh();
    setIsSaving(false);
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Ritmo operativo</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Reuniones diarias</h3>
          <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
            Define el foco del dia, registra bloqueos y convierte decisiones operativas en tareas concretas.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Plus weight="bold" />
          Nueva reunion diaria
        </button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <MetricCard label="Historico" value={initialMeetings.length} hint="reuniones registradas" tone="slate" />
        <MetricCard label="Abiertas" value={openMeetings} hint="requieren cierre" tone={openMeetings > 0 ? 'amber' : 'emerald'} />
        <MetricCard label="Prioridades de hoy" value={todayPriorityCount} hint="items definidos" tone="blue" />
        <MetricCard label="Tareas de hoy" value={todayTaskCount} hint="surgidas o vinculadas" tone="indigo" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Historico" description="Filtra por fecha y abre cualquier reunion para ver su detalle.">
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="date"
                value={dateRange.to}
                onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por foco, prioridad o bloqueo..."
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="mt-5 space-y-3">
            {filteredMeetings.length === 0 ? (
              <EmptyState title="No hay reuniones para ese filtro" hint="Prueba otro rango de fechas o crea una nueva reunion." />
            ) : (
              filteredMeetings.map((meeting) => {
                const statusMeta = getMeetingStatusMeta(meeting.status, 'daily');
                const isActive = meeting.id === selectedId;

                return (
                  <button
                    key={meeting.id}
                    onClick={() => handleSelectMeeting(meeting.id)}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition-colors ${
                      isActive
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CalendarBlank className="text-gray-400" weight="bold" />
                        <p className="text-sm font-black text-gray-900">
                          {formatDateLabel(meeting.meeting_date, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <StatusBadge meta={statusMeta} />
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-gray-600">{meeting.focus_of_day}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {meeting.priorities_of_day?.length || 0} prioridades
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {meeting.blockers?.length || 0} bloqueos
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {meeting.linked_tasks?.length || 0} tareas
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title={selectedMeeting ? 'Detalle de la reunion' : 'Nueva reunion diaria'}
            description="Completa la definicion del dia y deja registradas las decisiones operativas."
            action={
              selectedMeeting?.status !== 'closed' ? (
                <button
                  onClick={handleCloseMeeting}
                  disabled={isSaving || !selectedMeeting}
                  className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                >
                  Marcar como cerrada
                </button>
              ) : null
            }
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Fecha</label>
                  <input
                    type="date"
                    required
                    value={draft.meetingDate}
                    onChange={(event) => setDraft((current) => ({ ...current, meetingDate: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Foco del dia</label>
                  <input
                    type="text"
                    required
                    value={draft.focusOfDay}
                    onChange={(event) => setDraft((current) => ({ ...current, focusOfDay: event.target.value }))}
                    placeholder="Ej: ordenar la agenda del equipo comercial"
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Prioridades del dia</label>
                  <textarea
                    rows="6"
                    value={draft.prioritiesOfDay}
                    onChange={(event) => setDraft((current) => ({ ...current, prioritiesOfDay: event.target.value }))}
                    placeholder="Una prioridad por linea"
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Bloqueos</label>
                  <textarea
                    rows="6"
                    value={draft.blockers}
                    onChange={(event) => setDraft((current) => ({ ...current, blockers: event.target.value }))}
                    placeholder="Un bloqueo por linea"
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Decisiones</label>
                  <textarea
                    rows="5"
                    value={draft.decisions}
                    onChange={(event) => setDraft((current) => ({ ...current, decisions: event.target.value }))}
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Observaciones</label>
                  <textarea
                    rows="5"
                    value={draft.observations}
                    onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))}
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-black text-gray-900">Participantes</p>
                  <p className="mt-1 text-sm font-medium text-gray-500">Selecciona quienes participaron de la definicion del dia.</p>
                  <div className="mt-4 grid gap-3">
                    {internalUsers.map((user) => {
                      const isChecked = draft.participantIds.includes(user.id);

                      return (
                        <label
                          key={user.id}
                          className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                            isChecked
                              ? 'border-brand-300 bg-white text-brand-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <p>{user.full_name}</p>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">{user.role}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleParticipant(user.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-gray-900">
                    <Target weight="bold" />
                    Objetivos mensuales impactados
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-500">Marca los objetivos del mes que esta reunion empuja o destraba.</p>
                  <div className="mt-4 grid gap-3">
                    {monthlyGoals.map((goal) => {
                      const isChecked = draft.monthlyGoalIds.includes(goal.id);

                      return (
                        <label
                          key={goal.id}
                          className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                            isChecked
                              ? 'border-brand-300 bg-white text-brand-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <p>{goal.title}</p>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                              {formatMonthLabel(goal.month, goal.year, 'short')}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMonthlyGoal(goal.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex flex-wrap gap-2">
                  {selectedMeeting ? <StatusBadge meta={getMeetingStatusMeta(selectedMeeting.status, 'daily')} /> : null}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                    {draft.participantIds.length} participantes
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                    {draft.monthlyGoalIds.length} objetivos
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : selectedMeeting ? 'Guardar cambios' : 'Crear reunion'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Objetivos relacionados"
            description="Desde aca ves rapidamente que objetivos mensuales se mueven con esta reunion."
          >
            <RelationList
              items={selectedMeeting?.linked_goals || []}
              emptyLabel="Todavia no hay objetivos mensuales vinculados."
              renderItem={(goal) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900">{goal.title}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                      {goalLabel(goal)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                    {Math.round(goal.progress_percentage || 0)}%
                  </span>
                </div>
              )}
            />
          </SectionCard>

          {selectedMeeting ? (
            <LinkedTasksPanel
              entityType="daily"
              entityId={selectedMeeting.id}
              linkedTasks={selectedMeeting.linked_tasks || []}
              availableTasks={availableTasks}
              boardOptions={boardOptions}
              assignableUsers={internalUsers}
              title="Tareas surgidas de la reunion"
              emptyLabel="Todavia no hay tareas vinculadas a esta reunion diaria."
            />
          ) : (
            <SectionCard
              title="Tareas vinculadas"
              description="Guarda primero la reunion para poder crear o vincular tareas desde este contexto."
            >
              <EmptyState
                title="Primero crea la reunion"
                hint="En cuanto guardes esta reunion diaria, se habilita el panel para tareas relacionadas."
              />
            </SectionCard>
          )}

          {todayMeeting ? (
            <SectionCard
              title="Resumen de hoy"
              description="Este bloque replica el resumen operativo que tambien vas a ver en el dashboard."
            >
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Foco</p>
                  <p className="mt-3 text-sm font-bold text-gray-900">{todayMeeting.focus_of_day}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Prioridades</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">{todayMeeting.priorities_of_day?.length || 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Bloqueos</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">{todayMeeting.blockers?.length || 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Tareas</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">{todayMeeting.linked_tasks?.length || 0}</p>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
