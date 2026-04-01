'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Target } from '@phosphor-icons/react';
import { saveMonthlyGoal } from '@/app/execution-actions';
import LinkedTasksPanel from '@/components/execution/LinkedTasksPanel';
import {
  EmptyState,
  MetricCard,
  ProgressBar,
  RelationList,
  SectionCard,
  StatusBadge,
} from '@/components/execution/ExecutionShell';
import {
  calculateGoalProgress,
  formatDateLabel,
  formatMonthLabel,
  getCurrentMonthWindow,
  getGoalStatusMeta,
  getMeetingStatusMeta,
  GOAL_PROGRESS_MODE_OPTIONS,
  MONTHLY_GOAL_STATUS_OPTIONS,
  MONTH_OPTIONS,
} from '@/utils/execution';
import { runServerAction } from '@/utils/client/runServerAction';

function buildDraft(goal = null) {
  const now = new Date();

  return {
    title: goal?.title || '',
    description: goal?.description || '',
    month: String(goal?.month || now.getMonth() + 1),
    year: String(goal?.year || now.getFullYear()),
    annualGoalId: goal?.annual_goal_id || '',
    metric: goal?.metric || '',
    targetValue: goal?.target_value ?? '',
    currentValue: goal?.current_value ?? '',
    unit: goal?.unit || '',
    responsibleUserId: goal?.responsible_user_id || '',
    status: goal?.status || 'pending',
    progressMode: goal?.progress_mode || 'auto',
    progressPercentage: goal?.progress_percentage ?? 0,
  };
}

export default function MonthlyGoalsClient({
  initialGoals,
  annualGoals,
  internalUsers,
  availableTasks,
  boardOptions,
  selectedGoalId,
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(selectedGoalId || initialGoals[0]?.id || null);
  const [draft, setDraft] = useState(buildDraft(initialGoals.find((goal) => goal.id === selectedGoalId) || null));
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedGoal = useMemo(
    () => initialGoals.find((goal) => goal.id === selectedId) || null,
    [initialGoals, selectedId]
  );

  const currentWindow = getCurrentMonthWindow();
  const currentMonthGoals = useMemo(
    () => initialGoals.filter((goal) => goal.month === currentWindow.month && goal.year === currentWindow.year),
    [currentWindow.month, currentWindow.year, initialGoals]
  );

  const filteredGoals = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return initialGoals.filter((goal) => {
      const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
      const matchesYear = yearFilter === 'all' || String(goal.year) === yearFilter;
      const haystack = [
        goal.title,
        goal.description,
        goal.metric,
        goal.annual_goal?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesStatus && matchesYear && matchesSearch;
    });
  }, [initialGoals, searchTerm, statusFilter, yearFilter]);

  const years = useMemo(
    () => Array.from(new Set(initialGoals.map((goal) => String(goal.year)))).sort((left, right) => Number(right) - Number(left)),
    [initialGoals]
  );

  const monthGroups = useMemo(() => {
    const groups = initialGoals.reduce((accumulator, goal) => {
      const key = `${goal.year}-${String(goal.month).padStart(2, '0')}`;

      if (!accumulator[key]) {
        accumulator[key] = {
          key,
          label: formatMonthLabel(goal.month, goal.year, 'long'),
          count: 0,
        };
      }

      accumulator[key].count += 1;
      return accumulator;
    }, {});

    return Object.values(groups).sort((left, right) => right.key.localeCompare(left.key)).slice(0, 8);
  }, [initialGoals]);

  const annualGroups = useMemo(() => {
    const groups = initialGoals.reduce((accumulator, goal) => {
      const key = goal.annual_goal?.id || 'none';
      const label = goal.annual_goal?.title || 'Sin objetivo anual';

      if (!accumulator[key]) {
        accumulator[key] = {
          key,
          label,
          count: 0,
        };
      }

      accumulator[key].count += 1;
      return accumulator;
    }, {});

    return Object.values(groups).sort((left, right) => right.count - left.count);
  }, [initialGoals]);

  const blockedCount = initialGoals.filter((goal) => goal.status === 'blocked').length;
  const withoutProgressCount = currentMonthGoals.filter(
    (goal) => Number(goal.progress_percentage || 0) <= 0 && ['pending', 'in_progress'].includes(goal.status)
  ).length;
  const previewProgress = calculateGoalProgress({
    targetValue: draft.targetValue,
    currentValue: draft.currentValue,
    manualProgress: draft.progressPercentage,
    progressMode: draft.progressMode,
  });

  useEffect(() => {
    setSelectedId(selectedGoalId || initialGoals[0]?.id || null);
  }, [initialGoals, selectedGoalId]);

  useEffect(() => {
    setDraft(buildDraft(selectedGoal));
  }, [selectedGoal]);

  const handleSelectGoal = (goalId) => {
    setSelectedId(goalId);
    router.replace(`/monthly-goals?goal=${goalId}`, { scroll: false });
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft(buildDraft());
    router.replace('/monthly-goals', { scroll: false });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const result = await runServerAction(saveMonthlyGoal, selectedGoal?.id || null, {
      title: draft.title,
      description: draft.description,
      month: Number(draft.month),
      year: Number(draft.year),
      annualGoalId: draft.annualGoalId,
      metric: draft.metric,
      targetValue: draft.targetValue,
      currentValue: draft.currentValue,
      unit: draft.unit,
      responsibleUserId: draft.responsibleUserId,
      status: draft.status,
      progressMode: draft.progressMode,
      progressPercentage: draft.progressMode === 'manual' ? Number(draft.progressPercentage || 0) : previewProgress,
    });

    if (!result.success) {
      alert(result.error || 'No se pudo guardar el objetivo mensual.');
      setIsSaving(false);
      return;
    }

    const nextGoalId = result.goal?.id || null;

    if (nextGoalId) {
      setSelectedId(nextGoalId);
      router.replace(`/monthly-goals?goal=${nextGoalId}`, { scroll: false });
    }

    router.refresh();
    setIsSaving(false);
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Ejecucion</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Objetivos mensuales</h3>
          <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
            Traduce la estrategia a metas medibles del mes y conectalas con reuniones y tareas para seguirlas de verdad.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Plus weight="bold" />
          Nuevo objetivo mensual
        </button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <MetricCard label="Activos del mes" value={currentMonthGoals.length} hint="en el periodo actual" tone="blue" />
        <MetricCard label="Trabados" value={blockedCount} hint="requieren destrabe" tone={blockedCount ? 'rose' : 'emerald'} />
        <MetricCard label="Sin avance" value={withoutProgressCount} hint="sin progreso visible" tone={withoutProgressCount ? 'amber' : 'emerald'} />
        <MetricCard label="Total" value={initialGoals.length} hint="objetivos mensuales" tone="slate" />
      </div>

      <SectionCard title="Agrupaciones" description="Vista rapida por mes y por objetivo anual para leer el mapa completo.">
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Por mes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {monthGroups.length === 0 ? (
                <span className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-500">
                  No hay objetivos del mes actual.
                </span>
              ) : (
                monthGroups.map((group) => (
                  <span key={group.key} className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                    {group.label} · {group.count}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Por objetivo anual</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {annualGroups.map((group) => (
                <span key={group.key} className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
                  {group.label} · {group.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Listado" description="Filtra por estado o anio y abre el objetivo mensual que quieras revisar.">
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Todos los estados</option>
                {MONTHLY_GOAL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Todos los anios</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por titulo, metrica u objetivo anual..."
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="mt-5 space-y-3">
            {filteredGoals.length === 0 ? (
              <EmptyState title="No hay objetivos para ese filtro" hint="Cambia el estado, el anio o crea un objetivo nuevo." />
            ) : (
              filteredGoals.map((goal) => {
                const isActive = goal.id === selectedId;

                return (
                  <button
                    key={goal.id}
                    onClick={() => handleSelectGoal(goal.id)}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition-colors ${
                      isActive
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">{goal.title}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatMonthLabel(goal.month, goal.year, 'long')}
                        </p>
                      </div>
                      <StatusBadge meta={getGoalStatusMeta(goal.status, 'monthly')} />
                    </div>
                    <div className="mt-4">
                      <ProgressBar value={goal.progress_percentage || 0} label="Avance" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {goal.linked_tasks?.length || 0} tareas
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {goal.linked_daily_meetings?.length || 0} reuniones diarias
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
            title={selectedGoal ? 'Detalle del objetivo mensual' : 'Nuevo objetivo mensual'}
            description="Configura su KPI, el responsable y como se calcula el avance. Luego vincula tareas y reuniones."
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Titulo</label>
                <input
                  type="text"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Descripcion</label>
                <textarea
                  rows="4"
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
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
                <div className="xl:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Objetivo anual asociado</label>
                  <select
                    value={draft.annualGoalId}
                    onChange={(event) => setDraft((current) => ({ ...current, annualGoalId: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Sin objetivo anual</option>
                    {annualGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title} ({goal.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">KPI / metrica</label>
                  <input
                    type="text"
                    value={draft.metric}
                    onChange={(event) => setDraft((current) => ({ ...current, metric: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Valor objetivo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.targetValue}
                    onChange={(event) => setDraft((current) => ({ ...current, targetValue: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Valor actual</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.currentValue}
                    onChange={(event) => setDraft((current) => ({ ...current, currentValue: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Unidad</label>
                  <input
                    type="text"
                    value={draft.unit}
                    onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Responsable</label>
                  <select
                    value={draft.responsibleUserId}
                    onChange={(event) => setDraft((current) => ({ ...current, responsibleUserId: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Sin definir</option>
                    {internalUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Estado</label>
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {MONTHLY_GOAL_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Modo de progreso</label>
                  <select
                    value={draft.progressMode}
                    onChange={(event) => setDraft((current) => ({ ...current, progressMode: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {GOAL_PROGRESS_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-bold text-gray-700">Progreso manual (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={draft.progressPercentage}
                    disabled={draft.progressMode !== 'manual'}
                    onChange={(event) => setDraft((current) => ({ ...current, progressPercentage: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                </div>

                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-gray-900">
                    <Target weight="bold" />
                    Vista previa del progreso
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {draft.progressMode === 'manual'
                      ? 'El porcentaje se toma del campo manual.'
                      : 'Se calcula automaticamente con valor actual / valor objetivo.'}
                  </p>
                  <div className="mt-5">
                    <ProgressBar value={previewProgress} label="Avance esperado" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex flex-wrap gap-2">
                  {selectedGoal ? <StatusBadge meta={getGoalStatusMeta(selectedGoal.status, 'monthly')} /> : null}
                  {selectedGoal?.annual_goal ? (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase text-indigo-700">
                      {selectedGoal.annual_goal.title}
                    </span>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : selectedGoal ? 'Guardar cambios' : 'Crear objetivo'}
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Reuniones diarias relacionadas"
              description="Estas reuniones mencionan o impulsan este objetivo del mes."
            >
              <RelationList
                items={selectedGoal?.linked_daily_meetings || []}
                emptyLabel="Todavia no hay reuniones diarias vinculadas."
                renderItem={(meeting) => (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">{meeting.focus_of_day}</p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                        {formatDateLabel(meeting.meeting_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge meta={{ label: meeting.status === 'closed' ? 'Cerrada' : 'Abierta', className: meeting.status === 'closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200' }} />
                      <Link
                        href={`/daily-meetings?meeting=${meeting.id}`}
                        className="rounded-2xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                )}
              />
            </SectionCard>

            <SectionCard
              title="Reuniones mensuales relacionadas"
              description="Estos plannings de comunicacion apoyan el cumplimiento de este objetivo."
            >
              <RelationList
                items={selectedGoal?.linked_communication_meetings || []}
                emptyLabel="Todavia no hay reuniones mensuales de comunicacion vinculadas."
                renderItem={(meeting) => (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">{meeting.title}</p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                        {formatMonthLabel(meeting.month, meeting.year, 'long')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge meta={getMeetingStatusMeta(meeting.status, 'communication')} />
                      <Link
                        href={`/communication?meeting=${meeting.id}`}
                        className="rounded-2xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                )}
              />
            </SectionCard>
          </div>

          {selectedGoal ? (
            <LinkedTasksPanel
              entityType="monthlyGoal"
              entityId={selectedGoal.id}
              linkedTasks={selectedGoal.linked_tasks || []}
              availableTasks={availableTasks}
              boardOptions={boardOptions}
              assignableUsers={internalUsers}
              title="Tareas vinculadas al objetivo"
              emptyLabel="Todavia no hay tareas vinculadas a este objetivo mensual."
            />
          ) : (
            <SectionCard
              title="Tareas vinculadas"
              description="Guarda primero el objetivo mensual para crear o vincular tareas."
            >
              <EmptyState
                title="Primero crea el objetivo"
                hint="En cuanto guardes este objetivo mensual, se habilita el panel de tareas relacionadas."
              />
            </SectionCard>
          )}

          {selectedGoal ? (
            <SectionCard
              title="Resumen del objetivo"
              description="Lectura rapida para el detalle y para el bloque operativo del dashboard."
            >
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Periodo</p>
                  <p className="mt-3 text-sm font-bold text-gray-900">{formatMonthLabel(selectedGoal.month, selectedGoal.year, 'long')}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Tareas</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">{selectedGoal.linked_tasks?.length || 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Reuniones</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">
                    {(selectedGoal.linked_daily_meetings?.length || 0) + (selectedGoal.linked_communication_meetings?.length || 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Avance</p>
                  <p className="mt-3 text-3xl font-black text-gray-900">{Math.round(selectedGoal.progress_percentage || 0)}%</p>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
