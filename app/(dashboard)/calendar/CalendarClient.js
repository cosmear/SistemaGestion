'use client';
import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarBlank, Plus, X, Handshake, BellRinging, Trash } from '@phosphor-icons/react';
import { addCalendarEvent, deleteCalendarEvent } from '@/app/actions';

export default function CalendarClient({ events }) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEventClick = async (info) => {
    const isTask = info.event.extendedProps.isTask;
    const isEvent = info.event.extendedProps.isEvent;
    
    if (isTask) {
        alert(`📌 Vencimiento de Tarea\n\nNombre: ${info.event.title}\nFecha: ${info.event.start.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nPrioridad: ${info.event.extendedProps.priority?.toUpperCase()}`);
    } 
    
    if (isEvent) {
        const confirmDelete = window.confirm(`📆 Evento Proyectado\n\n${info.event.title}\nInicia: ${info.event.start.toLocaleString('es-AR')}\n\n¿Deseas ELIMINAR este evento agendado?`);
        if(confirmDelete) {
           await deleteCalendarEvent(info.event.extendedProps.originalId, info.event.extendedProps.originalTitle);
        }
    }
  };

  const handleAddSubmit = async (e) => {
     e.preventDefault();
     setIsSubmitting(true);
     const formData = new FormData(e.target);
     
     // Construimos el Date string con la hora
     const dateInput = formData.get('date');
     const timeInput = formData.get('time');
     const dateStr = timeInput ? `${dateInput}T${timeInput}:00` : `${dateInput}T00:00:00`;
     
     await addCalendarEvent(
        formData.get('title'),
        new Date(dateStr).toISOString(),
        formData.get('type')
     );
     
     setShowModal(false);
     setIsSubmitting(false);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in block absolute inset-0 p-4 sm:p-8 bg-gray-50/30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shrink-0 border-b border-gray-200 pb-4 gap-4">
        <div>
           <h3 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight flex items-center gap-3">
             <CalendarBlank className="text-brand-600" weight="fill" /> Agenda Corporativa
           </h3>
           <p className="text-sm text-gray-500 font-medium">Cronograma inteligente. Cruza tus Tareas Kanban y tus Eventos extra.</p>
        </div>
        <button 
           onClick={() => setShowModal(true)}
           className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-200 hover:-translate-y-0.5"
        >
           <Plus weight="bold" className="text-lg" /> Añadir Cita/Evento
        </button>
      </div>
      
      <div className="flex-1 bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col transition-all">
         {/* Leyenda Visual */}
         <div className="flex flex-wrap gap-4 mb-4 border-b border-gray-100 pb-4 shrink-0">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#8B5CF6]"></span> Tarea Personal</span>
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#3B82F6]"></span> Tareas de Equipo</span>
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#10B981]"></span> Tareas Cliente B2B</span>
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F97316]"></span> Eventos Independientes</span>
         </div>

         <div className="flex-1 h-full min-h-0 w-full animate-fade-in custom-scrollbar relative">
           <FullCalendar
             plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
             initialView="dayGridMonth"
             headerToolbar={{
               left: 'prev,next today',
               center: 'title',
               right: 'dayGridMonth,timeGridWeek'
             }}
             events={events}
             eventClick={handleEventClick}
             height="100%"
             locale="es"
             dayMaxEvents={true}
             fixedWeekCount={false}
           />
         </div>
      </div>

      {/* MODAL PARA AÑADIR EVENTOS AL CALENDARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-fade-in overflow-hidden border border-brand-100">
            <div className="bg-brand-50 p-6 border-b border-brand-100 flex justify-between items-center">
              <h3 className="text-xl font-extrabold flex items-center gap-2 text-brand-900">
                 <CalendarBlank weight="fill" className="text-brand-600"/> Agendar Evento
              </h3>
              <button 
                 onClick={() => setShowModal(false)} 
                 className="text-brand-400 hover:text-brand-800 hover:bg-white p-1 rounded-lg transition-colors"
              >
                <X weight="bold" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Título de la cita</label>
                <input type="text" name="title" required placeholder="Ej: Reunión con Inversor..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold text-gray-900 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Día</label>
                   <input type="date" name="date" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold text-gray-900 transition-colors" />
                 </div>
                 <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Horario (Opcional)</label>
                   <input type="time" name="time" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold text-gray-900 transition-colors" />
                 </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Clase de Evento</label>
                <select name="type" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-bold text-gray-700 transition-colors">
                   <option value="meeting">🤝 Reunión Presencial / Meet</option>
                   <option value="call">📞 Llamada Telefónica</option>
                   <option value="reminder">🔔 Recordatorio</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors">Abortar</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-3 text-white rounded-xl font-extrabold transition-all shadow-lg bg-brand-600 hover:bg-brand-700 shadow-brand-200 disabled:opacity-50 hover:-translate-y-0.5">
                  Confirmar en Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
