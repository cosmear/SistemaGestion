'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarBlank,
  ChartLineUp,
  CheckSquareOffset,
  ClockCounterClockwise,
  Kanban,
  ListDashes,
  Megaphone,
  NotePencil,
  Receipt,
  SquaresFour,
  SignOut,
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

export default function Sidebar({ userName, userRole }) {
  const pathname = usePathname();
  const navLinks = [
    canAccessSection(userRole, 'dashboard') ? { href: '/', icon: SquaresFour, label: 'Dashboard' } : null,
    canAccessSection(userRole, 'clients') ? { href: '/clients', icon: Users, label: 'Clientes' } : null,
    canAccessSection(userRole, 'tasks') ? { href: '/tasks', icon: Kanban, label: 'Tareas' } : null,
    canAccessSection(userRole, 'calendar') ? { href: '/calendar', icon: CalendarBlank, label: 'Calendario' } : null,
    canAccessSection(userRole, 'dailyMeetings') ? { href: '/daily-meetings', icon: CheckSquareOffset, label: 'Reunion diaria' } : null,
    canAccessSection(userRole, 'communication') ? { href: '/communication', icon: Megaphone, label: 'Comunicacion' } : null,
    canAccessSection(userRole, 'monthlyGoals') ? { href: '/monthly-goals', icon: Target, label: 'Objetivos mes' } : null,
    canAccessSection(userRole, 'annualGoals') ? { href: '/annual-goals', icon: ChartLineUp, label: 'Objetivos anio' } : null,
    canAccessSection(userRole, 'notes') ? { href: '/notes', icon: NotePencil, label: 'Notas' } : null,
    canAccessSection(userRole, 'cashflow') ? { href: '/cashflow', icon: ListDashes, label: 'Cashflow' } : null,
    canAccessSection(userRole, 'budget') ? { href: '/budget', icon: ChartLineUp, label: 'Presupuesto' } : null,
    canAccessSection(userRole, 'tickets') ? { href: '/tickets', icon: Ticket, label: 'Casos B2B' } : null,
    canAccessSection(userRole, 'billing') ? { href: '/billing', icon: Receipt, label: 'Cobranzas' } : null,
    canAccessSection(userRole, 'audit') ? { href: '/audit', icon: ClockCounterClockwise, label: 'Historial' } : null,
    canAccessSection(userRole, 'users') ? { href: '/users', icon: UserCircle, label: 'Usuarios' } : null,
  ].filter(Boolean);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10 transition-all duration-300 relative shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
          F
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Faro</h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Desarrollado por Loopsmith</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon weight={isActive ? 'fill' : 'regular'} className="text-lg" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold overflow-hidden shadow-inner flex items-center justify-center">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{userName || 'Panel interno'}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[userRole] || userRole || 'Operacion'}</p>
            </div>
          </div>
          <form action="/api/auth/admin/logout" method="post">
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-red-600 text-left px-2 flex items-center gap-2 transition-colors mt-2"
            >
              <SignOut weight="regular" /> Cerrar sesion
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
