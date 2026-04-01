'use client';

import Link from 'next/link';
import {
  Buildings,
  CalendarBlank,
  ChartLineUp,
  CheckCircle,
  CheckSquareOffset,
  ClockCounterClockwise,
  EnvelopeOpen,
  Megaphone,
  Target,
  TrafficCone,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';
import { formatMonthLabel, getGoalStatusMeta, getMeetingStatusMeta } from '@/utils/execution';

function formatMoney(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatCompactMoney(value) {
  return new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function getBoardLabel(boardId = '') {
  if (boardId === 'team') return 'Equipo';
  if (boardId.startsWith('client_')) return 'Cliente';
  return 'Personal';
}

function getClassificationTone(label = '') {
  const normalized = label.toLowerCase();

  if (normalized.includes('urg')) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (normalized.includes('bug')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (normalized.includes('contenido')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (normalized.includes('fact')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function getBoardTone(key) {
  if (key === 'team') return 'from-blue-500 to-cyan-400';
  if (key === 'client') return 'from-emerald-500 to-lime-400';
  return 'from-indigo-500 to-violet-400';
}

function getPriorityTone(key) {
  if (key === 'high') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (key === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function SummaryCard({ icon: Icon, label, value, hint, iconClassName, valueClassName }) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">{label}</p>
          <p className={`mt-3 text-3xl font-black tracking-tight text-gray-900 ${valueClassName || ''}`}>{value}</p>
          <p className="mt-2 text-sm font-medium text-gray-500">{hint}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon weight="fill" className="text-2xl" />
        </div>
      </div>
    </div>
  );
}

function CashflowTrendCard({ trend }) {
  const maxValue = Math.max(1, ...trend.flatMap((item) => [item.income, item.expense]));
  const totalIncome = trend.reduce((total, item) => total + item.income, 0);
  const totalExpense = trend.reduce((total, item) => total + item.expense, 0);
  const hasData = trend.some((item) => item.income > 0 || item.expense > 0);

  return (
    <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <div className="mb-6 flex flex-col gap-3 border-b border-gray-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Cashflow</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-900">Pulso financiero de los ultimos 6 meses</h3>
          <p className="mt-2 text-sm font-medium text-gray-500">La barra izquierda muestra ingresos y la derecha, egresos.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-500">Ingresos</p>
            <p className="mt-2 text-xl font-black text-emerald-700">{formatCompactMoney(totalIncome)}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Egresos</p>
            <p className="mt-2 text-xl font-black text-rose-700">{formatCompactMoney(totalExpense)}</p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-gray-200 bg-gray-50 text-center">
          <div>
            <ChartLineUp className="mx-auto text-5xl text-gray-300" weight="thin" />
            <p className="mt-4 text-base font-bold text-gray-700">Todavia no hay movimientos para graficar</p>
            <p className="mt-2 text-sm font-medium text-gray-500">En cuanto registres ingresos o egresos, el pulso aparecera aca.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
          <div className="rounded-[28px] bg-slate-950 px-5 py-6 text-white">
            <div className="mb-5 flex items-center gap-3 text-sm font-bold text-slate-300">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                Ingresos
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                Egresos
              </span>
            </div>
            <div className="grid min-h-[220px] grid-cols-6 items-end gap-4">
              {trend.map((item) => (
                <div key={item.key} className="flex flex-col items-center gap-3">
                  <div className="flex h-[200px] items-end gap-2">
                    <div
                      className="w-5 rounded-full bg-gradient-to-t from-emerald-500 to-emerald-300"
                      style={{ height: `${Math.max(10, (item.income / maxValue) * 100)}%` }}
                      title={`Ingresos ${item.label}: ${formatMoney(item.income)}`}
                    />
                    <div
                      className="w-5 rounded-full bg-gradient-to-t from-rose-500 to-orange-300"
                      style={{ height: `${Math.max(10, (item.expense / maxValue) * 100)}%` }}
                      title={`Egresos ${item.label}: ${formatMoney(item.expense)}`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-200">{item.label}</p>
                    <p className={`mt-1 text-xs font-bold ${item.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {item.balance >= 0 ? '+' : ''}
                      {formatCompactMoney(item.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-[28px] border border-gray-100 bg-gray-50 p-5">
            {trend.map((item) => (
              <div key={`${item.key}-resume`} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
                  <p className={`text-sm font-black ${item.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.balance >= 0 ? '+' : ''}
                    {formatCompactMoney(item.balance)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">In</p>
                    <p className="mt-1">{formatCompactMoney(item.income)}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Out</p>
                    <p className="mt-1">{formatCompactMoney(item.expense)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SupportPulseCard({ support, resolutionRate }) {
  const totalTickets = support.open + support.closed;
  const openShare = totalTickets > 0 ? (support.open / totalTickets) * 100 : 0;
  const maxClassification = Math.max(1, ...support.classifications.map((item) => item.value));
  const donutStyle = totalTickets
    ? { background: `conic-gradient(#f97316 0 ${openShare}%, #10b981 ${openShare}% 100%)` }
    : { background: '#e5e7eb' };

  return (
    <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Soporte</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900">Salud del inbox B2B</h3>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
          <TrafficCone className="text-2xl" weight="fill" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-gray-50 p-5 text-center">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full" style={donutStyle}>
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-black text-gray-900">{resolutionRate}%</span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">cerrados</span>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-500">Proporcion entre tickets abiertos y resueltos.</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-orange-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">Abiertos</p>
              <p className="mt-2 text-2xl font-black text-orange-700">{support.open}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-500">Cerrados</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{support.closed}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Clasificacion dominante</p>
            <div className="mt-4 space-y-3">
              {support.classifications.length === 0 ? (
                <p className="text-sm font-medium text-gray-500">Todavia no hay tickets clasificados.</p>
              ) : (
                support.classifications.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getClassificationTone(item.label)}`}>
                        {item.label}
                      </span>
                      <span className="text-sm font-black text-gray-700">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-slate-700 to-slate-400"
                        style={{ width: `${Math.max(12, (item.value / maxClassification) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OperationsCard({ operations, pendingTasks, overdueTasks }) {
  const maxBoardValue = Math.max(1, ...operations.boards.map((item) => item.value));

  return (
    <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Operacion</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900">Carga por tablero y prioridad</h3>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
          <Users className="text-2xl" weight="fill" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] bg-slate-950 p-5 text-white">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Pendientes</p>
              <p className="mt-2 text-2xl font-black">{pendingTasks}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Vencidas</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{overdueTasks}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {operations.boards.map((item) => (
              <div key={item.key}>
                <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-200">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-white/10">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r ${getBoardTone(item.key)}`}
                    style={{ width: `${Math.max(10, (item.value / maxBoardValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Prioridades activas</p>
          <div className="mt-4 space-y-3">
            {operations.priorities.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${getPriorityTone(item.key)}`}>
                  {item.label}
                </span>
                <span className="text-lg font-black text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function getAlertTone(tone = 'amber') {
  if (tone === 'rose') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (tone === 'blue') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function ExecutionSnapshotCard({ icon: Icon, title, eyebrow, href, toneClassName, children }) {
  return (
    <section className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">{eyebrow}</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-gray-900">{title}</h3>
        </div>
        <div className={`rounded-2xl p-3 ${toneClassName}`}>
          <Icon className="text-2xl" weight="fill" />
        </div>
      </div>
      {children}
      <Link
        href={href}
        className="mt-5 block rounded-2xl bg-blue-50 py-3 text-center text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
      >
        Abrir detalle
      </Link>
    </section>
  );
}

function MonthlyGoalsOverviewCard({ execution }) {
  const blockedGoals = execution.monthlyGoals.filter((goal) => goal.status === 'blocked');
  const noProgressGoals = execution.monthlyGoals.filter(
    (goal) => Number(goal.progress_percentage || 0) <= 0 && ['pending', 'in_progress'].includes(goal.status)
  );

  return (
    <ExecutionSnapshotCard
      icon={Target}
      title="Objetivos del mes"
      eyebrow="Ejecucion"
      href="/monthly-goals"
      toneClassName="bg-blue-50 text-blue-600"
    >
      {execution.monthlyGoals.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <p className="text-base font-bold text-gray-800">No hay objetivos del mes cargados</p>
          <p className="mt-2 text-sm font-medium text-gray-500">Crea los objetivos mensuales para empezar a seguir el avance.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Activos</p>
              <p className="mt-2 text-2xl font-black text-gray-900">{execution.monthlyGoalsSummary.activeCount}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Trabados</p>
              <p className="mt-2 text-2xl font-black text-rose-700">{execution.monthlyGoalsSummary.blockedCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-500">Sin avance</p>
              <p className="mt-2 text-2xl font-black text-amber-700">{execution.monthlyGoalsSummary.withoutProgressCount}</p>
            </div>
          </div>

          <div className="space-y-3">
            {execution.monthlyGoals.map((goal) => {
              const statusMeta = getGoalStatusMeta(goal.status, 'monthly');

              return (
                <div key={goal.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">{goal.title}</p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                        {formatMonthLabel(goal.month, goal.year, 'long')}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Progreso</span>
                      <span className="text-sm font-black text-gray-900">{Math.round(goal.progress_percentage || 0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div
                        className={`h-2 rounded-full ${
                          goal.status === 'blocked'
                            ? 'bg-rose-500'
                            : Number(goal.progress_percentage || 0) >= 100
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.max(6, Number(goal.progress_percentage || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {blockedGoals.length > 0 || noProgressGoals.length > 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              {blockedGoals.length > 0
                ? `Hay ${blockedGoals.length} objetivos trabados en este mes.`
                : `Hay ${noProgressGoals.length} objetivos del mes sin avance cargado.`}
            </div>
          ) : null}
        </div>
      )}
    </ExecutionSnapshotCard>
  );
}

function AnnualGoalSpotlightCard({ goal }) {
  return (
    <ExecutionSnapshotCard
      icon={ChartLineUp}
      title="Objetivo anual destacado"
      eyebrow="Direccion"
      href="/annual-goals"
      toneClassName="bg-emerald-50 text-emerald-600"
    >
      {!goal ? (
        <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <p className="text-base font-bold text-gray-800">No hay objetivo anual destacado</p>
          <p className="mt-2 text-sm font-medium text-gray-500">Crea o activa un objetivo anual para verlo aca.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-black tracking-tight text-gray-900">{goal.title}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
              {goal.description || 'Sin descripcion ampliada.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Estado</p>
              <p className="mt-2 text-sm font-black text-gray-900">{getGoalStatusMeta(goal.status, 'annual').label}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Progreso</p>
              <p className="mt-2 text-2xl font-black text-gray-900">{Math.round(goal.progress_percentage || 0)}%</p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Objetivos mensuales</p>
              <p className="mt-2 text-2xl font-black text-gray-900">{goal.monthlyGoalsCount || 0}</p>
            </div>
          </div>
        </div>
      )}
    </ExecutionSnapshotCard>
  );
}

function AlertsCard({ alerts, executionError }) {
  return (
    <div className="flex min-h-[420px] flex-col rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
        <h4 className="flex items-center gap-2 text-lg font-black text-gray-900">
          <WarningCircle weight="fill" className="text-amber-500" />
          Pendientes operativos
        </h4>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
          {alerts.length + (executionError ? 1 : 0)}
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {executionError ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-sm font-bold text-amber-800">{executionError}</p>
          </div>
        ) : null}

        {alerts.length === 0 && !executionError ? (
          <div className="py-12 text-center text-gray-400">
            <CheckCircle weight="thin" className="mx-auto text-5xl opacity-50" />
            <p className="mt-3 text-sm font-bold">No hay alertas operativas ahora.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <Link
              key={alert.key}
              href={alert.href}
              className={`block rounded-[24px] border p-4 transition-colors hover:opacity-90 ${getAlertTone(alert.tone)}`}
            >
              <p className="text-sm font-bold leading-snug">{alert.title}</p>
            </Link>
          ))
        )}
      </div>
      <Link href="/monthly-goals" className="mt-5 block rounded-2xl bg-blue-50 py-3 text-center text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
        Ver objetivos y alertas
      </Link>
    </div>
  );
}

export default function DashboardClient({
  userName,
  tasks,
  tickets,
  events,
  summary,
  analytics,
  execution,
  alerts,
  executionError,
  access,
}) {
  const nextEvent = events[0] || null;
  const summaryCards = [
    {
      key: 'clients',
      icon: Buildings,
      label: 'Clientes activos',
      value: summary.activeClients,
      hint: 'Base viva con operacion en curso',
      iconClassName: 'bg-blue-50 text-blue-600',
    },
    access.canViewFinancial
      ? {
          key: 'mrr',
          icon: ChartLineUp,
          label: 'MRR estimado',
          value: formatCompactMoney(summary.monthlyRecurringRevenue),
          hint: 'Suma mensual de cartera activa',
          iconClassName: 'bg-emerald-50 text-emerald-600',
          valueClassName: 'text-emerald-700',
        }
        : {
            key: 'meeting',
            icon: CheckSquareOffset,
            label: 'Reunion diaria',
            value: execution.todayMeeting?.isToday ? 'OK' : 'Pend.',
            hint: execution.todayMeeting?.isToday ? 'Cargada hoy' : 'Falta registrar hoy',
            iconClassName: execution.todayMeeting?.isToday ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
          valueClassName: execution.todayMeeting?.isToday ? 'text-emerald-700' : 'text-amber-700',
        },
    access.canViewSupport
      ? {
          key: 'tickets',
          icon: EnvelopeOpen,
          label: 'Tickets abiertos',
          value: summary.openTickets,
          hint: 'Soporte pendiente de cierre',
          iconClassName: 'bg-orange-50 text-orange-600',
        }
      : {
          key: 'blocked',
          icon: Target,
          label: 'Objetivos trabados',
          value: execution.monthlyGoalsSummary.blockedCount,
          hint: 'Metas del mes frenadas',
          iconClassName: execution.monthlyGoalsSummary.blockedCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600',
          valueClassName: execution.monthlyGoalsSummary.blockedCount > 0 ? 'text-rose-700' : 'text-emerald-700',
        },
    {
      key: 'overdue',
      icon: ClockCounterClockwise,
      label: 'Tareas vencidas',
      value: summary.overdueTasks,
      hint: 'Items fuera de fecha en tablero',
      iconClassName: 'bg-amber-50 text-amber-600',
      valueClassName: summary.overdueTasks > 0 ? 'text-amber-700' : 'text-gray-900',
    },
  ];
  const radarGridClass = access.canViewSupport ? 'xl:grid-cols-4' : 'xl:grid-cols-3';

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 custom-scrollbar xl:p-8">
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.28),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#14532d_100%)] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
            <div className="absolute -right-12 top-6 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-emerald-300/10 blur-2xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
                  <ChartLineUp weight="fill" />
                  Control room
                </span>
                {access.canViewSupport ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                    Resolucion {summary.resolutionRate}%
                  </span>
                ) : (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                    Alertas {alerts.length}
                  </span>
                )}
              </div>

              <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Hola, {userName}.</h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-200 sm:text-base">
                {summary.heroMessage}
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Tareas vencidas</p>
                  <p className="mt-3 flex items-end gap-2 text-3xl font-black">
                    {summary.overdueTasks}
                    <span className="pb-1 text-xs font-bold text-amber-200">requieren foco</span>
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
                    {access.canViewSupport ? 'Inbox abierto' : 'Objetivos del mes'}
                  </p>
                  <p className="mt-3 flex items-end gap-2 text-3xl font-black">
                    {access.canViewSupport ? summary.openTickets : execution.monthlyGoalsSummary.activeCount}
                    <span className="pb-1 text-xs font-bold text-orange-200">
                      {access.canViewSupport ? 'casos vivos' : 'frentes activos'}
                    </span>
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Proximo evento</p>
                  {nextEvent ? (
                    <>
                      <p className="mt-3 text-lg font-black leading-tight">{nextEvent.title}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                        {new Date(nextEvent.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-slate-300">No hay eventos inmediatos en agenda.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {summaryCards.map((card) => (
              <SummaryCard
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={card.value}
                hint={card.hint}
                iconClassName={card.iconClassName}
                valueClassName={card.valueClassName}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Cadencia del equipo</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-900">Ritmo de gestion y seguimiento</h3>
            </div>
            <p className="text-sm font-medium text-gray-500">Reuniones, objetivos y planning mensual conectados al trabajo real.</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-4">
            <ExecutionSnapshotCard
              icon={CheckSquareOffset}
              title="Reunion de hoy"
              eyebrow="Operacion"
              href={execution.todayMeeting?.id ? `/daily-meetings?meeting=${execution.todayMeeting.id}` : '/daily-meetings'}
              toneClassName="bg-emerald-50 text-emerald-600"
            >
              {!execution.todayMeeting ? (
                <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-base font-bold text-gray-800">Todavia no hay reunion cargada</p>
                  <p className="mt-2 text-sm font-medium text-gray-500">Registra la reunion diaria para ordenar prioridades y bloqueos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-black tracking-tight text-gray-900">{execution.todayMeeting.focus_of_day}</p>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                      {execution.todayMeeting.isToday ? 'Corresponde a hoy' : 'Mostrando la reunion mas reciente'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Prioridades</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{execution.todayMeeting.prioritiesCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Bloqueos</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{execution.todayMeeting.blockersCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Tareas</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{execution.todayMeeting.tasksCount}</p>
                    </div>
                  </div>
                </div>
              )}
            </ExecutionSnapshotCard>

            <ExecutionSnapshotCard
              icon={Megaphone}
              title="Comunicacion del mes"
              eyebrow="Planning"
              href={execution.communicationMeeting?.id ? `/communication?meeting=${execution.communicationMeeting.id}` : '/communication'}
              toneClassName="bg-orange-50 text-orange-600"
            >
              {!execution.communicationMeeting ? (
                <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-base font-bold text-gray-800">Falta crear el planning del mes</p>
                  <p className="mt-2 text-sm font-medium text-gray-500">Carga la reunion mensual de comunicacion para ordenar campañas, canales y piezas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-black tracking-tight text-gray-900">
                      {execution.communicationMeeting.objective_general || 'Sin objetivo general cargado.'}
                    </p>
                    <div className="mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                      {getMeetingStatusMeta(execution.communicationMeeting.status, 'communication').label}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Campañas</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{execution.communicationMeeting.campaignsCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Piezas</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{execution.communicationMeeting.assetsCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Tareas</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{execution.communicationMeeting.tasksCount}</p>
                    </div>
                  </div>
                </div>
              )}
            </ExecutionSnapshotCard>

            <MonthlyGoalsOverviewCard execution={execution} />
            <AnnualGoalSpotlightCard goal={execution.highlightedAnnualGoal} />
          </div>
        </section>

        {access.canViewFinancial && access.canViewSupport ? (
          <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <CashflowTrendCard trend={analytics.cashflowTrend} />
            <div className="grid gap-6">
              <SupportPulseCard support={analytics.support} resolutionRate={summary.resolutionRate} />
              <OperationsCard operations={analytics.operations} pendingTasks={summary.pendingTasks} overdueTasks={summary.overdueTasks} />
            </div>
          </section>
        ) : access.canViewFinancial ? (
          <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <CashflowTrendCard trend={analytics.cashflowTrend} />
            <OperationsCard operations={analytics.operations} pendingTasks={summary.pendingTasks} overdueTasks={summary.overdueTasks} />
          </section>
        ) : access.canViewSupport ? (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <SupportPulseCard support={analytics.support} resolutionRate={summary.resolutionRate} />
            <OperationsCard operations={analytics.operations} pendingTasks={summary.pendingTasks} overdueTasks={summary.overdueTasks} />
          </section>
        ) : (
          <section>
            <OperationsCard operations={analytics.operations} pendingTasks={summary.pendingTasks} overdueTasks={summary.overdueTasks} />
          </section>
        )}

        <section>
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Radar diario</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-900">Listas operativas para mover hoy</h3>
            </div>
            <p className="text-sm font-medium text-gray-500">Lo estrategico arriba, lo accionable aca abajo.</p>
          </div>

          <div className={`grid grid-cols-1 gap-6 ${radarGridClass}`}>
            <div className="flex min-h-[420px] flex-col rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                <h4 className="flex items-center gap-2 text-lg font-black text-gray-900">
                  <WarningCircle weight="fill" className="text-rose-500" />
                  Urgencias del kanban
                </h4>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">{tasks.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {tasks.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <CheckSquareOffset weight="thin" className="mx-auto text-5xl opacity-50" />
                    <p className="mt-3 text-sm font-bold">No hay tareas altas para atender.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="rounded-[24px] border border-rose-100 bg-rose-50/60 p-4 transition-colors hover:bg-rose-50">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <span className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">
                          {getBoardLabel(task.kanban_columns?.board_id)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          {task.deadline ? new Date(task.deadline).toLocaleDateString('es-AR') : 'Sin fecha'}
                        </span>
                      </div>
                      <p className="text-sm font-bold leading-snug text-gray-900">{task.title}</p>
                    </div>
                  ))
                )}
              </div>
              <Link href="/tasks" className="mt-5 block rounded-2xl bg-blue-50 py-3 text-center text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
                Ir al tablero completo
              </Link>
            </div>

            {access.canViewSupport ? (
              <div className="flex min-h-[420px] flex-col rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                  <h4 className="flex items-center gap-2 text-lg font-black text-gray-900">
                    <TrafficCone weight="fill" className="text-orange-500" />
                    Tickets bajo presion
                  </h4>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">{tickets.length}</span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {tickets.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <CheckCircle weight="thin" className="mx-auto text-5xl opacity-50" />
                      <p className="mt-3 text-sm font-bold">No hay urgentes ni bugs abiertos.</p>
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-[24px] border border-orange-200 bg-orange-50/60 p-4 transition-colors hover:bg-orange-50">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
                            {ticket.clients?.name || 'Sin cliente'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">
                            {new Date(ticket.created_at).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <p className="text-sm font-bold leading-snug text-gray-900">{ticket.title}</p>
                        <div className="mt-3">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getClassificationTone(ticket.classification || '')}`}>
                            {ticket.classification || 'Sin clasificar'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Link href="/tickets" className="mt-5 block rounded-2xl bg-blue-50 py-3 text-center text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
                  Resolver inbox
                </Link>
              </div>
            ) : null}

            <div className="flex min-h-[420px] flex-col rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                <h4 className="flex items-center gap-2 text-lg font-black text-gray-900">
                  <CalendarBlank weight="fill" className="text-emerald-500" />
                  Agenda proxima
                </h4>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">{events.length}</span>
              </div>
              <div className="relative flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="absolute bottom-0 left-4 top-0 w-px bg-gray-100" />
                {events.length === 0 ? (
                  <div className="relative z-10 py-12 text-center text-gray-400">
                    <CalendarBlank weight="thin" className="mx-auto text-5xl opacity-50" />
                    <p className="mt-3 text-sm font-bold">La agenda cercana esta despejada.</p>
                  </div>
                ) : (
                  events.map((event) => {
                    const eventDate = new Date(event.date);
                    const hasTime = event.date.includes('T') && !event.date.endsWith('T00:00:00.000Z');

                    return (
                      <div key={event.id} className="relative pb-6 pl-10 pt-2">
                        <div className="absolute left-[11px] top-4 h-3 w-3 rounded-full border-[3px] border-white bg-emerald-400 shadow-sm" />
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">
                              {eventDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            {hasTime ? (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
                                {eventDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm font-bold leading-snug text-gray-900">{event.title}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <Link href="/calendar" className="mt-5 block rounded-2xl bg-blue-50 py-3 text-center text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
                Abrir calendario
              </Link>
            </div>

            <AlertsCard alerts={alerts} executionError={executionError} />
          </div>
        </section>
      </div>
    </div>
  );
}
