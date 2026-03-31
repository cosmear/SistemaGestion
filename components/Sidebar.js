'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFour,
  Users,
  ListDashes,
  ChartLineUp,
  Kanban,
  CalendarBlank,
  ClockCounterClockwise,
  SignOut,
  Ticket,
  Receipt,
} from '@phosphor-icons/react';

export default function Sidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', icon: SquaresFour, label: 'Dashboard' },
    { href: '/clients', icon: Users, label: 'Clientes' },
    { href: '/cashflow', icon: ListDashes, label: 'Cashflow' },
    { href: '/budget', icon: ChartLineUp, label: 'Presupuesto' },
    { href: '/tasks', icon: Kanban, label: 'Tareas' },
    { href: '/calendar', icon: CalendarBlank, label: 'Calendario' },
    { href: '/tickets', icon: Ticket, label: 'Casos B2B' },
    { href: '/billing', icon: Receipt, label: 'Cobranzas' },
    { href: '/audit', icon: ClockCounterClockwise, label: 'Historial' },
  ];

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
          const isActive = pathname === link.href;
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
              U
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Panel interno</p>
              <p className="text-xs text-gray-500">Operacion</p>
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
