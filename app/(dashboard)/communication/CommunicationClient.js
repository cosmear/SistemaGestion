'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Plus, Target } from '@phosphor-icons/react';
import { saveCommunicationMeeting } from '@/app/execution-actions';
import LinkedTasksPanel from '@/components/execution/LinkedTasksPanel';
import {
  EmptyState,
  MetricCard,
  RelationList,
  SectionCard,
  StatusBadge,
} from '@/components/execution/ExecutionShell';
import {
  COMMUNICATION_MEETING_STATUS_OPTIONS,
  formatMonthLabel,
  getCurrentMonthWindow,
  getMeetingStatusMeta,
  MONTH_OPTIONS,
  stringListToTextarea,
} from '@/utils/execution';
import { runServerAction } from '@/utils/client/runServerAction';

function buildDraft(meeting = null) {
  const now = new Date();

  return {
    month: String(meeting?.month || now.getMonth() + 1),
    year: String(meeting?.year || now.getFullYear()),
    title: meeting?.title || '',
    objectiveGeneral: meeting?.objective_general || '',
    keyMessages: stringListToTextarea(meeting?.key_messages || []),
    campaignsOrTopics: stringListToTextarea(meeting?.campaigns_or_topics || []),
    channels: stringListToTextarea(meeting?.channels || []),
    requiredAssets: stringListToTextarea(meeting?.required_assets || []),
    observations: meeting?.observations || '',
    responsibleIds: meeting?.responsible_ids || [],
    monthlyGoalIds: meeting?.monthly_goal_ids || [],
    status: meeting?.status || 'planned',
  };
}

function toLineArray(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CommunicationClient({
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
  const [yearFilter, setYearFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedMeeting = useMemo(
    () => initialMeetings.find((meeting) => meeting.id === selectedId) || null,
    [initialMeetings, selectedId]
  );

  const availableYears = useMemo(
    () => Array.from(new Set(initialMeetings.map((meeting) => String(meeting.year)))).sort((left, right) => Number(right) - Number(left)),
    [initialMeetings]
  );

  const filteredMeetings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return initialMeetings.filter((meeting) => {
      const matchesYear = yearFilter === 'all' || String(meeting.year) === yearFilter;
      const haystack = [
        meeting.title,
        meeting.objective_general,
        ...(meeting.campaigns_or_topics || []),
        ...(meeting.key_messages || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesYear && matchesSearch;
    });
  }, [initialMeetings, searchTerm, yearFilter]);

  const currentWindow = getCurrentMonthWindow();
  const currentMeeting = useMemo(
    () => initialMeetings.find((meeting) => meeting.month === currentWindow.month && meeting.year === currentWindow.year) || null,
    [currentWindow.month, currentWindow.year, initialMeetings]
  );

  useEffect(() => {
    setSelectedId(selectedMeetingId || initialMeetings[0]?.id || null);
  }, [initialMeetings, selectedMeetingId]);

  useEffect(() => {
    setDraft(buildDraft(selectedMeeting));
  }, [selectedMeeting]);

  const handleSelectMeeting = (meetingId) => {
    setSelectedId(meetingId);
    router.replace(`/communication?meeting=${meetingId}`, { scroll: false });
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft(buildDraft());
    router.replace('/communication', { scroll: false });
  };

  const toggleResponsible = (userId) => {
    setDraft((current) => ({
      ...current,
      responsibleIds: current.responsibleIds.includes(userId)
        ? current.responsibleIds.filter((value) => value !== userId)
        : [...current.responsibleIds, userId],
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

    const result = await runServerAction(saveCommunicationMeeting, selectedMeeting?.id || null, {
      month: Number(draft.month),
      year: Number(draft.year),
      title: draft.title,
      objectiveGeneral: draft.objectiveGeneral,
      keyMessages: toLineArray(draft.keyMessages),
      campaignsOrTopics: toLineArray(draft.campaignsOrTopics),
      channels: toLineArray(draft.channels),
      requiredAssets: toLineArray(draft.requiredAssets),
      observations: draft.observations,
      responsibleIds: draft.responsibleIds,
      monthlyGoalIds: draft.monthlyGoalIds,
      status: draft.status,
    });

    if (!result.success) {
      alert(result.error || 'No se pudo guardar la reunion mensual.');
      setIsSaving(false);
      return;
    }

    const nextMeetingId = result.meeting?.id || null;

    if (nextMeetingId) {
      setSelectedId(nextMeetingId);
      router.replace(`/communication?meeting=${nextMeetingId}`, { scroll: false });
    }

    router.refresh();
    setIsSaving(false);
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Planeamiento</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Comunicacion del mes</h3>
          <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
            Define el objetivo comunicacional, baja campañas a piezas y transforma el planning del mes en ejecucion.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Plus weight="bold" />
          Nueva reunion mensual
        </button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <MetricCard label="Historico" value={initialMeetings.length} hint="plannings registrados" tone="slate" />
        <MetricCard label="Campañas del mes" value={currentMeeting?.campaigns_or_topics?.length || 0} hint="frentes activos" tone="blue" />
        <MetricCard label="Piezas necesarias" value={currentMeeting?.required_assets?.length || 0} hint="pendientes de producir" tone="amber" />
        <MetricCard label="Tareas vinculadas" value={currentMeeting?.linked_tasks?.length || 0} hint="derivadas del planning" tone="indigo" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Historico" description="Explora planes mensuales anteriores o filtra por anio.">
          <div className="grid gap-3">
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos los anios</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por titulo, objetivo o campaña..."
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="mt-5 space-y-3">
            {filteredMeetings.length === 0 ? (
              <EmptyState title="No hay plannings para ese filtro" hint="Crea una reunion mensual o cambia el anio filtrado." />
            ) : (
              filteredMeetings.map((meeting) => {
                const isActive = meeting.id === selectedId;
                const statusMeta = getMeetingStatusMeta(meeting.status, 'communication');

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
                      <div>
                        <p className="text-sm font-black text-gray-900">{meeting.title}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatMonthLabel(meeting.month, meeting.year, 'long')}
                        </p>
                      </div>
                      <StatusBadge meta={statusMeta} />
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-gray-600">
                      {meeting.objective_general || 'Sin objetivo general cargado todavia.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {meeting.campaigns_or_topics?.length || 0} campañas
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {meeting.required_assets?.length || 0} piezas
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
            title={selectedMeeting ? 'Detalle del planning mensual' : 'Nuevo planning mensual'}
            description="Carga el objetivo general, mensajes clave, piezas y responsables del mes."
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Mes</label>
                  <select
                    value={draft.month}
                    onChange={(event) => setDraft((current) => ({ ...current, month: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Anio</label>
                  <input
                    type="number"
                    min="2024"
                    value={draft.year}
                    onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Estado</label>
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {COMMUNICATION_MEETING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Titulo</label>
                <input
                  type="text"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ej: Planning comunicacional de abril"
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Objetivo general</label>
                <textarea
                  rows="4"
                  value={draft.objectiveGeneral}
                  onChange={(event) => setDraft((current) => ({ ...current, objectiveGeneral: event.target.value }))}
                  className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Mensajes clave</label>
                  <textarea
                    rows="6"
                    value={draft.keyMessages}
                    onChange={(event) => setDraft((current) => ({ ...current, keyMessages: event.target.value }))}
                    placeholder="Un mensaje por linea"
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Campañas o temas</label>
                  <textarea
                    rows="6"
                    value={draft.campaignsOrTopics}
                    onChange={(event) => setDraft((current) => ({ ...current, campaignsOrTopics: event.target.value }))}
                    placeholder="Una campaña por linea"
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Canales</label>
                  <textarea
                    rows="5"
                    value={draft.channels}
                    onChange={(event) => setDraft((current) => ({ ...current, channels: event.target.value }))}
                    placeholder="Ej: Instagram, newsletter, web"
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Piezas necesarias</label>
                  <textarea
                    rows="5"
                    value={draft.requiredAssets}
                    onChange={(event) => setDraft((current) => ({ ...current, requiredAssets: event.target.value }))}
                    placeholder="Una pieza por linea"
                    className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Observaciones</label>
                <textarea
                  rows="4"
                  value={draft.observations}
                  onChange={(event) => setDraft((current) => ({ ...current, observations: event.target.value }))}
                  className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-black text-gray-900">Responsables</p>
                  <p className="mt-1 text-sm font-medium text-gray-500">Define quienes mueven este planning durante el mes.</p>
                  <div className="mt-4 grid gap-3">
                    {internalUsers.map((user) => {
                      const isChecked = draft.responsibleIds.includes(user.id);

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
                            onChange={() => toggleResponsible(user.id)}
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
                    Objetivos mensuales apoyados
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-500">Relaciona este planning con los objetivos mensuales a los que sirve.</p>
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
                  {selectedMeeting ? <StatusBadge meta={getMeetingStatusMeta(selectedMeeting.status, 'communication')} /> : null}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                    {draft.responsibleIds.length} responsables
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
                  {isSaving ? 'Guardando...' : selectedMeeting ? 'Guardar cambios' : 'Crear planning'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Objetivos relacionados"
            description="Aqui ves rapidamente que objetivos del mes quedan soportados por este planning de comunicacion."
          >
            <RelationList
              items={selectedMeeting?.linked_goals || []}
              emptyLabel="Todavia no hay objetivos mensuales vinculados."
              renderItem={(goal) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900">{goal.title}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                      {formatMonthLabel(goal.month, goal.year, 'short')}
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
              entityType="communication"
              entityId={selectedMeeting.id}
              linkedTasks={selectedMeeting.linked_tasks || []}
              availableTasks={availableTasks}
              boardOptions={boardOptions}
              assignableUsers={internalUsers}
              title="Tareas de comunicacion vinculadas"
              emptyLabel="Todavia no hay tareas vinculadas a esta reunion mensual."
            />
          ) : (
            <SectionCard
              title="Tareas vinculadas"
              description="Guarda primero el planning mensual para poder crear o vincular tareas."
            >
              <EmptyState
                title="Primero crea el planning"
                hint="En cuanto guardes la reunion mensual, se habilita el panel de tareas relacionadas."
              />
            </SectionCard>
          )}

          {currentMeeting ? (
            <SectionCard
              title="Resumen del mes"
              description="Este bloque replica la vista corta que aparece en el dashboard para el planning activo."
            >
              <div className="grid gap-4 md:grid-cols-5">
                <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Objetivo general</p>
                  <p className="mt-3 text-sm font-bold leading-6 text-gray-900">
                    {currentMeeting.objective_general || 'Sin objetivo general cargado.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Campañas</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">{currentMeeting.campaigns_or_topics?.length || 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Piezas</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">{currentMeeting.required_assets?.length || 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Estado</p>
                  <div className="mt-3">
                    <StatusBadge meta={getMeetingStatusMeta(currentMeeting.status, 'communication')} />
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
