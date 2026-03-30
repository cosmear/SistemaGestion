'use client';

import { UserCircle, SignOut } from '@phosphor-icons/react';
import { logoutClientPortal } from '@/app/portal-actions';

export default function PortalTopBar({ clientName }) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-inner">
               <UserCircle weight="fill" className="text-white text-2xl" />
             </div>
             <div>
               <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none mb-0.5">Faro Portal B2B</h1>
               <p className="text-xs text-brand-600 font-bold uppercase tracking-widest">{clientName}</p>
             </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => logoutClientPortal()}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
            >
              Cerrar sesion <SignOut weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
