'use client';
import { usePathname } from 'next/navigation';
import { Bell, SignOut, User } from '@phosphor-icons/react';
import { logoutUser } from '@/app/auth-actions';

export default function Header({ userName }) {
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
      <div className="flex items-center gap-6">
        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notificaciones"
        >
          <Bell className="text-xl" />
        </button>

        <div className="h-6 w-px bg-gray-300"></div>

        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              {userName?.charAt(0).toUpperCase()}
           </div>
           <span className="text-sm font-medium text-gray-700 hidden sm:block">
             {userName}
           </span>
           <button
             onClick={() => logoutUser()}
             className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
             title="Cerrar sesión"
           >
             <SignOut weight="bold" className="text-xl" />
           </button>
        </div>
      </div>
    </header>
  );
}
