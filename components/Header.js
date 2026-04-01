'use client';
import { usePathname } from 'next/navigation';
import { Bell, SignOut } from '@phosphor-icons/react';

export default function Header({ userName, userRole }) {
  const pathname = usePathname();

  const getTitle = () => {
    switch (pathname) {
      case '/':
        return 'Dashboard';
      case '/clients':
        return 'Lista de Clientes';
      case '/cashflow':
        return 'Transacciones (Cashflow)';
      case '/budget':
        return 'Presupuesto Financiero';
      case '/tasks':
        return 'Gestion de Tareas';
      case '/calendar':
        return 'Calendario';
      case '/notes':
        return 'Notas';
      case '/tickets':
        return 'Tickets y Soporte';
      case '/billing':
        return 'Facturacion y Cobranzas';
      case '/audit':
        return 'Historial de Auditoria';
      case '/users':
        return 'Usuarios Internos';
      default:
        return 'Sistema de Gestion';
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
           <div className="hidden sm:block">
             <span className="text-sm font-medium text-gray-700 block">
               {userName}
             </span>
             <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
               {userRole || 'admin'}
             </span>
           </div>
           <form action="/api/auth/admin/logout" method="post">
             <button
               type="submit"
               className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
               title="Cerrar sesion"
             >
               <SignOut weight="bold" className="text-xl" />
             </button>
           </form>
        </div>
      </div>
    </header>
  );
}
