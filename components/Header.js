'use client';
import { usePathname } from 'next/navigation';
import { Bell } from '@phosphor-icons/react';

export default function Header() {
  const pathname = usePathname();

  const getTitle = () => {
    switch(pathname) {
      case '/': return 'Dashboard';
      case '/clients': return 'Lista de Clientes';
      case '/cashflow': return 'Transacciones (Cashflow)';
      case '/budget': return 'Presupuesto Financiero';
      case '/tasks': return 'Gestión de Tareas';
      case '/calendar': return 'Calendario';
      case '/audit': return 'Historial de Auditoría';
      default: return 'Sistema de Gestión';
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20 shrink-0">
      <h2 className="text-xl font-semibold text-gray-800">
        {getTitle()}
      </h2>
      <div className="flex items-center gap-4">
        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notificaciones"
        >
          <Bell className="text-xl" />
        </button>
      </div>
    </header>
  );
}
