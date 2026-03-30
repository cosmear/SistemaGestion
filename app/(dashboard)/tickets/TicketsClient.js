'use client';
import { useState, useEffect } from 'react';
import { EnvelopeOpen, CheckCircle, Warning, Tag, Check, X } from '@phosphor-icons/react';
import { updateTicketStatus, updateTicketClassification } from '@/app/actions';

export default function TicketsClient({ initialTickets }) {
  const [tickets, setTickets] = useState(initialTickets || []);
  const [activeTab, setActiveTab] = useState('open'); // 'open' or 'closed'

  // Update client state when server props change
  useEffect(() => {
    setTickets(initialTickets || []);
  }, [initialTickets]);

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    // Optimistic
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await updateTicketStatus(id, newStatus);
  };

  const handleClassification = async (id, val) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, classification: val } : t));
    await updateTicketClassification(id, val);
  };

  const filteredTickets = tickets.filter(t => t.status === activeTab);

  const getPillColor = (classification) => {
    switch(classification) {
       case 'Bug': return 'bg-red-100 text-red-700';
       case 'Urgente': return 'bg-orange-100 text-orange-700 font-bold';
       case 'Cambio de Contenido': return 'bg-blue-100 text-blue-700';
       case 'Facturación': return 'bg-emerald-100 text-emerald-700';
       default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in block absolute inset-0">
      <div className="flex justify-between items-center mb-6 shrink-0 border-b border-gray-200 pb-5">
        <div>
           <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
             <EnvelopeOpen className="text-orange-500" /> Help Desk (Buzón de Clientes)
           </h3>
           <p className="text-sm text-gray-500 font-medium mt-1">Clasifica y marca como resueltos los pedidos de B2B.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
           onClick={() => setActiveTab('open')}
           className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${activeTab === 'open' ? 'bg-orange-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50' }`}
        >
           <Warning weight={activeTab === 'open' ? 'fill' : 'regular'} /> BandEja de Entrada ({tickets.filter(t => t.status==='open').length})
        </button>
        <button 
           onClick={() => setActiveTab('closed')}
           className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${activeTab === 'closed' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50' }`}
        >
           <CheckCircle weight={activeTab === 'closed' ? 'fill' : 'regular'} /> Resueltos ({tickets.filter(t => t.status==='closed').length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4">
         {filteredTickets.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <CheckCircle className="text-6xl text-emerald-100 mb-4" weight="fill" />
              <h4 className="text-lg font-bold text-gray-800">Todo limpio por aquí</h4>
              <p className="text-sm">No hay tickets en esta categoría.</p>
           </div>
         ) : (
           <div className="space-y-4">
             {filteredTickets.map(ticket => (
               <div key={ticket.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow bg-gray-50/50 flex flex-col md:flex-row gap-6">
                  {/* Info del Cliente y Asunto */}
                  <div className="flex-1">
                     <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-black uppercase text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md tracking-widest border border-brand-100">
                           🏢 {ticket.clients?.name || 'Cliente Eliminado'}
                        </span>
                        <span className="text-[11px] text-gray-400 font-bold">{new Date(ticket.created_at).toLocaleString('es-AR')}</span>
                     </div>
                     <h4 className="text-lg font-extrabold text-gray-900 mb-2">{ticket.title}</h4>
                     <p className="text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-100 shadow-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {ticket.description}
                     </p>
                  </div>

                  {/* Acciones del Administrador */}
                  <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 border-l border-gray-200 pl-6 border-dashed">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2"><Tag/> Clasificación Oculta</label>
                        <select 
                           value={ticket.classification || ''} 
                           onChange={(e) => handleClassification(ticket.id, e.target.value)}
                           className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-brand-500 ${getPillColor(ticket.classification)}`}
                        >
                           <option value="" className="bg-white text-gray-700">📌 Sin Clasificar</option>
                           <option value="Urgente" className="bg-white text-gray-700">🚨 Urgente (+24hs)</option>
                           <option value="Bug" className="bg-white text-gray-700">🐞 Bug / Fallo</option>
                           <option value="Cambio de Contenido" className="bg-white text-gray-700">📝 Cambio de Contenido</option>
                           <option value="Facturación" className="bg-white text-gray-700">💵 Facturación</option>
                        </select>
                     </div>

                     <div className="mt-auto">
                        {ticket.status === 'open' ? (
                           <button 
                              onClick={() => handleStatusToggle(ticket.id, 'open')}
                              className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                           >
                              <Check weight="bold" /> Marcar como Resuelto
                           </button>
                        ) : (
                           <button 
                              onClick={() => handleStatusToggle(ticket.id, 'closed')}
                              className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                           >
                              <X weight="bold" /> Reabrir Ticket
                           </button>
                        )}
                     </div>
                  </div>
               </div>
             ))}
           </div>
         )}
      </div>

    </div>
  );
}
