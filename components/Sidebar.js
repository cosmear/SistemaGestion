'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartLineUp,
  CheckSquareOffset,
  ClockCounterClockwise,
  Kanban,
  ListDashes,
  Megaphone,
  NotePencil,
  Receipt,
  SignOut,
  SquaresFour,
  Ticket,
  Target,
  UserCircle,
  Users,
} from '@phosphor-icons/react';
import { canAccessSection } from '@/utils/auth/permissions';

const ROLE_LABELS = {
  admin: 'Administrador',
  manager: 'Manager',
  employee: 'Empleado',
  operator: 'Empleado',
};

const ORBIT_POSITIONS = [
  'left-1/2 top-2 -translate-x-1/2',
  'right-2 top-1/2 -translate-y-1/2',
  'left-1/2 bottom-2 -translate-x-1/2',
  'left-2 top-1/2 -translate-y-1/2',
];

function isLinkActive(pathname, href) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function uniqueLinks(links = []) {
  return links.filter(
    (link, index, collection) =>
      collection.findIndex((current) => current.href === link.href) === index
  );
}

function NavLink({ link, pathname, nested = false, collapsed = false }) {
  const Icon = link.icon;
  const isActive = isLinkActive(pathname, link.href);

  if (collapsed) {
    return (
      <Link
        href={link.href}
        title={link.label}
        className={`group flex items-center justify-center rounded-2xl p-3 transition-all ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 shadow-sm'
            : 'text-gray-500 hover:bg-gray-50 hover:text-emerald-700'
        }`}
      >
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            isActive ? 'bg-white shadow-[0_8px_18px_rgba(16,185,129,0.12)]' : 'bg-gray-100'
          }`}
        >
          <Icon weight={isActive ? 'fill' : 'regular'} className="text-lg" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={link.href}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
        nested
          ? isActive
            ? 'bg-white text-emerald-700 shadow-sm'
            : 'text-gray-600 hover:bg-white hover:text-gray-900'
          : isActive
            ? 'bg-emerald-50 text-emerald-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
          isActive
            ? 'bg-white text-emerald-600 shadow-[0_8px_18px_rgba(16,185,129,0.12)]'
            : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'
        }`}
      >
        <Icon weight={isActive ? 'fill' : 'regular'} className="text-lg" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate">{link.label}</p>
        {link.helper ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-gray-400">
            {link.helper}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function OrbitalLink({ link, pathname, positionClassName }) {
  const Icon = link.icon;
  const isActive = isLinkActive(pathname, link.href);

  return (
    <div className={`absolute ${positionClassName}`}>
      <Link href={link.href} className="group block" title={link.label}>
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full border text-xl transition-all ${
            isActive
              ? 'border-emerald-400 bg-emerald-500 text-white shadow-[0_12px_26px_rgba(16,185,129,0.35)]'
              : 'border-white/80 bg-white text-gray-600 shadow-[0_10px_25px_rgba(15,23,42,0.10)] hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-600'
          }`}
        >
          <Icon weight={isActive ? 'fill' : 'regular'} />
        </span>
      </Link>
    </div>
  );
}

function SelectorChip({ link, pathname }) {
  const Icon = link.icon;
  const isActive = isLinkActive(pathname, link.href);

  return (
    <Link
      href={link.href}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-bold transition-all ${
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
          : 'border-white bg-white text-gray-700 hover:border-emerald-100 hover:bg-emerald-50/60 hover:text-emerald-700'
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        <Icon weight={isActive ? 'fill' : 'regular'} className="text-lg" />
      </span>
      <span className="min-w-0 truncate">{link.label}</span>
    </Link>
  );
}

export default function Sidebar({ userName, userRole }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const orbitLinks = [
    canAccessSection(userRole, 'dashboard')
      ? { href: '/', icon: SquaresFour, label: 'Inicio' }
      : null,
    canAccessSection(userRole, 'clients')
      ? { href: '/clients', icon: Users, label: 'Clientes' }
      : null,
    canAccessSection(userRole, 'tasks')
      ? { href: '/tasks', icon: Kanban, label: 'Tareas' }
      : null,
    canAccessSection(userRole, 'calendar')
      ? { href: '/calendar', icon: CalendarBlank, label: 'Agenda' }
      : null,
  ].filter(Boolean);

  const executionLinks = [
    canAccessSection(userRole, 'dailyMeetings')
      ? {
          href: '/daily-meetings',
          icon: CheckSquareOffset,
          label: 'Reunion diaria',
          helper: 'Foco, prioridades y bloqueos',
        }
      : null,
    canAccessSection(userRole, 'communication')
      ? {
          href: '/communication',
          icon: Megaphone,
          label: 'Comunicacion',
          helper: 'Planning mensual y piezas',
        }
      : null,
    canAccessSection(userRole, 'monthlyGoals')
      ? {
          href: '/monthly-goals',
          icon: Target,
          label: 'Objetivos mensuales',
          helper: 'Seguimiento y alertas',
        }
      : null,
  ].filter(Boolean);

  const managementLinks = [
    canAccessSection(userRole, 'notes')
      ? { href: '/notes', icon: NotePencil, label: 'Notas', helper: 'Personales o por cliente' }
      : null,
    canAccessSection(userRole, 'annualGoals')
      ? { href: '/annual-goals', icon: ChartLineUp, label: 'Objetivos anuales', helper: 'Marco de direccion' }
      : null,
    canAccessSection(userRole, 'cashflow')
      ? { href: '/cashflow', icon: ListDashes, label: 'Cashflow', helper: 'Movimientos y balance' }
      : null,
    canAccessSection(userRole, 'budget')
      ? { href: '/budget', icon: ChartLineUp, label: 'Presupuesto', helper: 'Proyeccion financiera' }
      : null,
    canAccessSection(userRole, 'tickets')
      ? { href: '/tickets', icon: Ticket, label: 'Casos B2B', helper: 'Inbox de soporte' }
      : null,
    canAccessSection(userRole, 'billing')
      ? { href: '/billing', icon: Receipt, label: 'Cobranzas', helper: 'Facturacion y seguimiento' }
      : null,
    canAccessSection(userRole, 'audit')
      ? { href: '/audit', icon: ClockCounterClockwise, label: 'Historial', helper: 'Actividad registrada' }
      : null,
    canAccessSection(userRole, 'users')
      ? { href: '/users', icon: UserCircle, label: 'Usuarios', helper: 'Equipo y permisos' }
      : null,
  ].filter(Boolean);

  const extraQuickLinks = managementLinks.slice(0, 4);
  const managementListLinks = managementLinks.filter(
    (link) => !extraQuickLinks.some((extraLink) => extraLink.href === link.href)
  );
  const compactLinks = uniqueLinks([...orbitLinks, ...executionLinks, ...managementLinks]);
  const hasExecutionActive = executionLinks.some((link) => isLinkActive(pathname, link.href));
  const [isExecutionOpen, setIsExecutionOpen] = useState(hasExecutionActive);
  const isExecutionExpanded = hasExecutionActive || isExecutionOpen;
  const activeOrbitLink =
    orbitLinks.find((link) => isLinkActive(pathname, link.href)) || orbitLinks[0] || null;

  return (
    <aside
      className={`relative z-10 flex h-full shrink-0 flex-col border-r border-gray-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7faf8_100%)] shadow-sm transition-[width] duration-300 ${
        isCollapsed ? 'w-24' : 'w-80'
      }`}
    >
      <div className={`border-b border-gray-100 ${isCollapsed ? 'px-3 pb-4 pt-5' : 'px-6 pb-5 pt-6'}`}>
        <div className={`flex ${isCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between gap-3'}`}>
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'gap-3'}`}>
            <div className={`relative overflow-hidden rounded-[22px] bg-slate-950 shadow-[0_14px_24px_rgba(16,185,129,0.18)] ${isCollapsed ? 'h-12 w-12' : 'h-12 w-12'}`}>
              <Image
                src="/faro-logo.png"
                alt="Logo Faro"
                fill
                priority
                className="object-cover"
              />
            </div>

            {!isCollapsed ? (
              <div>
                <h1 className="text-xl font-black tracking-tight text-gray-900">Faro</h1>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Desarrollado por Loopsmith
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
            title={isCollapsed ? 'Abrir barra lateral' : 'Cerrar barra lateral'}
          >
            {isCollapsed ? <CaretRight weight="bold" /> : <CaretLeft weight="bold" />}
          </button>
        </div>
      </div>

      <nav className={`custom-scrollbar flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-4' : 'px-4 py-5'}`}>
        {isCollapsed ? (
          <div className="space-y-4">
            <div className="space-y-1">
              {compactLinks.map((link) => (
                <NavLink key={link.href} link={link} pathname={pathname} collapsed />
              ))}
            </div>

            <div className="rounded-[26px] border border-gray-200 bg-white px-2 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 shadow-inner">
                  {userName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <form action="/api/auth/admin/logout" method="post">
                  <button
                    type="submit"
                    title="Cerrar sesion"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                  >
                    <SignOut weight="regular" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <>
            {orbitLinks.length > 0 ? (
              <section className="rounded-[32px] border border-gray-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,253,244,0.92))] p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
                      Selector rapido
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      Frentes base de Faro
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-emerald-700">
                    {orbitLinks.length}
                  </span>
                </div>

                <div className="relative mx-auto mt-5 h-64 w-64">
                  <div className="absolute inset-3 rounded-full border border-emerald-100 bg-[conic-gradient(from_200deg_at_50%_50%,rgba(16,185,129,0.20),rgba(255,255,255,0.98),rgba(59,130,246,0.16),rgba(255,255,255,0.98),rgba(16,185,129,0.20))]" />
                  <div className="absolute inset-12 rounded-full border border-white bg-white/90 shadow-[inset_0_2px_18px_rgba(15,23,42,0.06)]" />
                  <div className="absolute inset-[5.5rem] flex flex-col items-center justify-center rounded-full bg-slate-950 px-4 text-center text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/10 shadow-[0_10px_22px_rgba(0,0,0,0.25)]">
                      <Image
                        src="/faro-logo.png"
                        alt="Logo Faro"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="mt-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                      Faro Hub
                    </span>
                    <span className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white">
                      {activeOrbitLink?.label || 'Inicio'}
                    </span>
                    <span className="mt-1 text-[11px] font-medium text-slate-300">
                      Acceso rapido
                    </span>
                  </div>

                  {orbitLinks.slice(0, 4).map((link, index) => (
                    <OrbitalLink
                      key={link.href}
                      link={link}
                      pathname={pathname}
                      positionClassName={ORBIT_POSITIONS[index]}
                    />
                  ))}
                </div>

                {extraQuickLinks.length > 0 ? (
                  <>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
                      Atajos extra
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {extraQuickLinks.map((link) => (
                        <SelectorChip key={link.href} link={link} pathname={pathname} />
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {executionLinks.length > 0 ? (
              <section className="mt-6 overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <button
                  type="button"
                  onClick={() => setIsExecutionOpen((current) => !current)}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors ${
                    hasExecutionActive || isExecutionOpen ? 'bg-emerald-50/70' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]">
                      <Target weight="fill" className="text-lg" />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-gray-900">
                        Cadencia del equipo
                      </p>
                      <p className="mt-1 text-xs font-medium text-gray-500">
                        Reuniones, comunicacion y objetivos del mes
                      </p>
                    </div>
                  </div>
                  <CaretDown
                    className={`text-xl text-gray-400 transition-transform ${
                      isExecutionExpanded ? 'rotate-180' : ''
                    }`}
                    weight="bold"
                  />
                </button>

                <div
                  className={`grid transition-all duration-300 ${
                    isExecutionExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-gray-100 bg-gray-50/80 p-3">
                      {executionLinks.map((link) => (
                        <NavLink key={link.href} link={link} pathname={pathname} nested />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {managementListLinks.length > 0 ? (
              <div className="mt-6">
                <p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
                  Gestion general
                </p>
                <div className="mt-3 space-y-1">
                  {managementListLinks.map((link) => (
                    <NavLink key={link.href} link={link} pathname={pathname} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </nav>

      {!isCollapsed ? (
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 shadow-inner">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">
                  {userName || 'Panel interno'}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  {ROLE_LABELS[userRole] || userRole || 'Operacion'}
                </p>
              </div>
            </div>

            <form action="/api/auth/admin/logout" method="post">
              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
              >
                <SignOut weight="regular" />
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
