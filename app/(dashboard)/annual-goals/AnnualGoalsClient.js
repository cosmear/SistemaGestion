'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Target } from '@phosphor-icons/react';
import { saveAnnualGoal } from '@/app/execution-actions';
import {
  EmptyState,
  MetricCard,
  ProgressBar,
  RelationList,
  SectionCard,
  StatusBadge,
} from '@/components/execution/ExecutionShell';
import {
  ANNUAL_GOAL_STATUS_OPTIONS,
  calculateGoalProgress,
  formatMonthLabel,
  getGoalStatusMeta,
  GOAL_PROGRESS_MODE_OPTIONS,
} from '@/utils/execution';
import { runServerAction } from '@/utils/client/runServerAction';

function buildDraft(goal = null) {
  const currentYear = new Date().getFullYear();

  return {
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || '',
    metric: goal?.metric || '',
    targetValue: goal?.target_value ?? '',
    currentValue: goal?.current_value ?? '',
    unit: goal?.unit || '',
    responsibleUserId: goal?.responsible_user_id || '',
    year: String(goal?.year || currentYear),
    status: goal?.status || 'active',
    progressMode: goal?.progress_mode || 'auto',
    progressPercentage: goal?.progress_percentage ?? 0,
  };
}

export default function AnnualGoalsClient({ initialGoals, internalUsers, selectedGoalId }) {
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

  const filteredGoals = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return initialGoals.filter((goal) => {
      const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
      const matchesYear = yearFilter === 'all' || String(goal.year) === yearFilter;
      const haystack = [goal.title, goal.description, goal.category, goal.metric]
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

  const activeGoals = initialGoals.filter((goal) => goal.status === 'active');
  const goalsWithoutMonthlies = activeGoals.filter((goal) => !goal.monthly_goals?.length);
  const averageProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((total, goal) => total + Number(goal.progress_percentage || 0), 0) / activeGoals.length)
    : 0;

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
    router.replace(`/annual-goals?goal=${goalId}`, { scroll: false });
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft(buildDraft());
    router.replace('/annual-goals', { scroll: false });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const result = await runServerAction(saveAnnualGoal, selectedGoal?.id || null, {
      title: draft.title,
      description: draft.description,
      category: draft.category,
      metric: draft.metric,
      targetValue: draft.targetValue,
      currentValue: draft.currentValue,
      unit: draft.unit,
      responsibleUserId: draft.responsibleUserId,
      year: Number(draft.year),
      status: draft.status,
      progressMode: draft.progressMode,
      progressPercentage: draft.progressMode === 'manual' ? Number(draft.progressPercentage || 0) : previewProgress,
    });

    if (!result.success) {
      alert(result.error || 'No se pudo guardar el objetivo anual.');
      setIsSaving(false);
      return;
    }

    const nextGoalId = result.goal?.id || null;

    if (nextGoalId) {
      setSelectedId(nextGoalId);
      router.replace(`/annual-goals?goal=${nextGoalId}`, { scroll: false });
    }

    router.refresh();
    setIsSaving(false);
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Direccion</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Objetivos anuales</h3>
          <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
            Ordena las metas macro del anio y verifica si cada una ya tiene objetivos mensuales que la vuelvan ejecutable.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Plus weight="bold" />
          Nuevo objetivo anual
        </button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <MetricCard label="Total" value={initialGoals.length} hint="objetivos anuales" tone="slate" />
        <MetricCard label="Activos" value={activeGoals.length} hint="en curso" tone="blue" />
        <MetricCard label="Sin desglose mensual" value={goalsWithoutMonthlies.length} hint="requieren aterrizaje" tone={goalsWithoutMonthlies.length ? 'amber' : 'emerald'} />
        <MetricCard label="Avance promedio" value={`${averageProgress}%`} hint="objetivos activos" tone="indigo" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Listado" description="Filtra por estado o anio para revisar el mapa anual.">
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Todos los estados</option>
                {ANNUAL_GOAL_STATUS_OPTIONS.map((option) => (
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
              placeholder="Buscar por titulo, categoria o metrica..."
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="mt-5 space-y-3">
            {filteredGoals.length === 0 ? (
              <EmptyState title="No hay objetivos para ese filtro" hint="Cambia el estado, el anio o crea uno nuevo." />
            ) : (
              filteredGoals.map((goal) => {
                const isActive = goal.id === selectedId;
                const statusMeta = getGoalStatusMeta(goal.status, 'annual');

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
                          {goal.category || 'Sin categoria'} · {goal.year}
                        </p>
                      </div>
                      <StatusBadge meta={statusMeta} />
                    </div>
                    <div className="mt-4">
                      <ProgressBar value={goal.progress_percentage || 0} label="Avance" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {goal.monthly_goals?.length || 0} objetivos mensuales
                      </span>
                      {goal.metric ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                          {goal.metric}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title={selectedGoal ? 'Detalle del objetivo anual' : 'Nuevo objetivo anual'}
            description="Configura su metrica, progreso y responsable. Si el avance es automatico, se calcula con valor actual sobre valor objetivo."
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
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Categoria</label>
                  <input
                    type="text"
                    value={draft.category}
                    onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Metrica</label>
                  <input
                    type="text"
                    value={draft.metric}
                    onChange={(event) => setDraft((current) => ({ ...current, metric: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
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
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Estado</label>
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {ANNUAL_GOAL_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
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
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-bold text-gray-700">Modo de progreso</label>
                  <select
                    value={draft.progressMode}
                    onChange={(event) => setDraft((current) => ({ ...current, progressMode: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    {GOAL_PROGRESS_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="mb-2 mt-4 block text-sm font-bold text-gray-700">Progreso manual (%)</label>
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
                  {selectedGoal ? <StatusBadge meta={getGoalStatusMeta(selectedGoal.status, 'annual')} /> : null}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                    {selectedGoal?.monthly_goals?.length || 0} objetivos mensuales
                  </span>
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

          <SectionCard
            title="Objetivos mensuales asociados"
            description="Desde este detalle ves si el objetivo anual ya tiene traduccion concreta en meses."
          >
            <RelationList
              items={selectedGoal?.monthly_goals || []}
              emptyLabel="Todavia no hay objetivos mensuales asociados a este objetivo anual."
              renderItem={(goal) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900">{goal.title}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                      {formatMonthLabel(goal.month, goal.year, 'long')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge meta={getGoalStatusMeta(goal.status, 'monthly')} />
                    <Link
                      href={`/monthly-goals?goal=${goal.id}`}
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
      </div>
    </div>
  );
}
