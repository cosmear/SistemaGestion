'use client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function CalendarClient({ events }) {
  const handleEventClick = (info) => {
    // Basic interaction for the prototype: Open native alert showing title
    alert(`Tarea: ${info.event.title}\nVencimiento: ${info.event.start.toLocaleDateString()}`);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in block">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="text-lg font-semibold">Calendario de Tareas</h3>
      </div>
      
      <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
         {/* FullCalendar se expandirá al 100% gracias al flex-1 */}
         <div className="flex-1 h-full min-h-0">
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
           />
         </div>
      </div>
    </div>
  );
}
