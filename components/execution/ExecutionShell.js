'use client';

import Link from 'next/link';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { clampPercentage, getProgressTone } from '@/utils/execution';

function joinClasses(...values) {
  return values.filter(Boolean).join(' ');
}

export function MetricCard({ label, value, hint, tone = 'slate' }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-black tracking-tight text-gray-900">{value}</p>
        <span className={joinClasses('rounded-full px-3 py-1 text-[11px] font-black uppercase', toneMap[tone] || toneMap.slate)}>
          {hint}
        </span>
      </div>
    </div>
  );
}

export function SectionCard({ title, description, action, children, className = '' }) {
  return (
    <section className={joinClasses('rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]', className)}>
      <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">{title}</p>
          {description ? (
            <p className="mt-2 text-sm font-medium text-gray-500">{description}</p>
          ) : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ meta }) {
  return (
    <span className={joinClasses('rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]', meta?.className)}>
      {meta?.label}
    </span>
  );
}

export function ProgressBar({ value, label = 'Progreso' }) {
  const progress = clampPercentage(value);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">{label}</span>
        <span className="text-sm font-black text-gray-900">{Math.round(progress)}%</span>
      </div>
      <div className="h-3 rounded-full bg-gray-100">
        <div
          className={joinClasses('h-3 rounded-full transition-all', getProgressTone(progress))}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div className="rounded-[28px] border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
      <p className="text-lg font-black tracking-tight text-gray-800">{title}</p>
      {hint ? <p className="mt-2 text-sm font-medium text-gray-500">{hint}</p> : null}
    </div>
  );
}

export function RelationList({ items, emptyLabel, renderItem }) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm font-medium text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

export function LinkButton({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
    >
      {children}
      <ArrowSquareOut weight="bold" />
    </Link>
  );
}
