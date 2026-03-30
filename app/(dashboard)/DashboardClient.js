'use client';
import { CalendarBlank, Ticket, WarningCircle, CheckSquareOffset, Buildings, TrafficCone, EnvelopeOpen, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';

export default function DashboardClient({ userName, tasks, tickets, events, kpis }) {
  const isTeam = (boardId) => boardId === 'team' ? 'Equipo' : (boardId.startsWith('client_') ? 'Cliente' : 'Personal');

  return (
    <div className="animate-fade-in block absolute inset-0 p-4 xl:p-8 flex flex-col h-full bg-gray-50 overflow-y-auto custom-scrollbar">
      
      {/* Saludo y KPIs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Hola, {userName}!</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Resumen operativo de tu agencia y clientes.</p>
         </div>
         <div className="flex gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 min-w-[180px]">
               <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Buildings weight="fill" className="text-2xl" />
               </div>
               <div>
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Cartera VIVA</p>
                 <h4 className="text-2xl font-black text-gray-900 leading-tight">{kpis.clients}</h4>
               </div>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 min-w-[180px]">
               <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <EnvelopeOpen weight="fill" className="text-2xl" />
               </div>
               <div>
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Inbox (Casos)</p>
                 <h4 className="text-2xl font-black text-gray-900 leading-tight">{kpis.openTickets}</h4>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 items-start">
         
         {/* COL 1: Tareas Críticas */}
         <div className="xl:col-span-1 bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
               <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><WarningCircle weight="fill" className="text-red-500"/> Urgencias (Kanban)</h3>
               <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-md">{tasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
               {tasks.length === 0 ? (
                 <div className="text-center text-gray-400 py-10">
                   <CheckSquareOffset weight="thin" className="text-5xl mx-auto mb-2 opacity-50"/>
                   <p className="font-bold text-sm">Tu Pila Prioritaria está vacía.</p>
                 </div>
               ) : (
                 tasks.map(t => (
                   <div key={t.id} className="p-4 rounded-2xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                         <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">{isTeam(t.kanban_columns.board_id)}</span>
                         <span className="text-[10px] font-bold text-gray-400">{t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Sin Fecha'}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm leading-snug">{t.title}</h4>
                   </div>
                 ))
               )}
            </div>
            <Link href="/tasks" className="mt-4 block text-center text-sm font-bold text-blue-600 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors">
               Ir al Tablero Completo
            </Link>
         </div>

         {/* COL 2: Tickets en la Lupa */}
         <div className="xl:col-span-1 bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
               <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><TrafficCone weight="fill" className="text-orange-500"/> Crisis B2B Anotadas</h3>
               <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md">{tickets.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
               {tickets.length === 0 ? (
                 <div className="text-center text-gray-400 py-10">
                   <CheckCircle weight="thin" className="text-5xl mx-auto mb-2 opacity-50"/>
                   <p className="font-bold text-sm">No hay reportes de bugs ni fuego.</p>
                 </div>
               ) : (
                 tickets.map(tk => (
                   <div key={tk.id} className="p-4 rounded-2xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest border border-orange-200 bg-white px-2 py-0.5 rounded-md">🏢 {tk.clients?.name}</span>
                         <span className="text-[10px] font-bold text-gray-400">{new Date(tk.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm leading-snug">{tk.title}</h4>
                   </div>
                 ))
               )}
            </div>
            <Link href="/tickets" className="mt-4 block text-center text-sm font-bold text-blue-600 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors">
               Resolver Inbox
            </Link>
         </div>

         {/* COL 3: Eventos y Reuniones (Calendario Autónomo) */}
         <div className="xl:col-span-1 bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4 bg-white">
               <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><CalendarBlank weight="fill" className="text-emerald-500"/> Próximos Eventos</h3>
               <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-md">{events.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
               <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100"></div>
               {events.length === 0 ? (
                 <div className="text-center text-gray-400 py-10 relative z-10">
                   <CalendarBlank weight="thin" className="text-5xl mx-auto mb-2 opacity-50"/>
                   <p className="font-bold text-sm">Tu agenda de eventos está despejada.</p>
                 </div>
               ) : (
                 events.map((ev, i) => {
                   const evtDate = new Date(ev.date);
                   const isTimeSet = ev.date.includes('T') && !ev.date.endsWith('T00:00:00.000Z'); // basic heurística
                   return (
                   <div key={ev.id} className="relative pl-10 pt-2 pb-6 group">
                      <div className="absolute left-[11px] top-4 w-3 h-3 bg-emerald-400 rounded-full border-[3px] border-white group-hover:scale-125 transition-transform shadow-sm"></div>
                      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-black uppercase text-emerald-600 tracking-widest">{evtDate.toLocaleDateString('es-AR', {weekday: 'short', day: 'numeric', month: 'short'})}</span>
                            {isTimeSet && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{evtDate.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}hs</span>}
                         </div>
                         <h4 className="font-extrabold text-gray-900 text-sm leading-snug">{ev.title}</h4>
                      </div>
                   </div>
                 )})
               )}
            </div>
            <Link href="/calendar" className="mt-4 block text-center text-sm font-bold text-blue-600 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors">
               Abrir Calendario Completo
            </Link>
         </div>

      </div>
    </div>
  );
}
