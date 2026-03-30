'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash, CalendarBlank, CaretDown, User, Users, Briefcase, List, CircleHalf, CheckCircle } from '@phosphor-icons/react';
import { addKanbanTask, updateTaskColumn, deleteKanbanTask } from '@/app/actions';

export default function KanbanClient({ initialColumns, initialTasks, activeBoard, userName, allClients }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks || []);
  const [showModal, setShowModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    setTasks(initialTasks || []);
  }, [initialTasks, activeBoard]);

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.column_id === columnId) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column_id: columnId } : t));
    await updateTaskColumn(taskId, task.title, columnId);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const priority = formData.get('priority');
    const deadline = formData.get('deadline') || null;
    
    await addKanbanTask(showModal, title, priority, deadline);
    setIsSubmitting(false);
    setShowModal(null);
    router.refresh(); 
  };

  const handleDelete = async (taskId, title) => {
    if (window.confirm(`¿Eliminar la tarea "${title}"?`)) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await deleteKanbanTask(taskId, title);
    }
  };

  const switchBoard = (boardId) => {
    setShowClientDropdown(false);
    router.push(`/tasks?board=${boardId}`);
  };

  const priorityStyles = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  const priorityLabel = {
    low: '🟩 Baja',
    medium: '🟨 Media',
    high: '🟥 Alta'
  }

  // Column Visual Hints
  const getColIcon = (idx) => {
    if(idx === 0) return <List className="text-gray-400" weight="bold"/>;
    if(idx === 1) return <CircleHalf className="text-blue-500 animate-pulse" weight="fill"/>;
    return <CheckCircle className="text-green-500" weight="fill"/>;
  };
  
  const getColBorder = (idx) => {
    if(idx === 0) return 'border-t-gray-400';
    if(idx === 1) return 'border-t-blue-500';
    return 'border-t-green-500';
  };

  const isPersonal = activeBoard === `personal_${userName}`;
  const isTeam = activeBoard === 'team';
  const isClient = activeBoard.startsWith('client_');
  const activeClientName = isClient ? allClients.find(c => `client_${c.id}` === activeBoard)?.name : null;

  return (
    <div className="h-full flex flex-col absolute inset-0 p-8">
      {/* Board Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shrink-0 gap-4">
        <div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">Tableros de Tareas</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => switchBoard(`personal_${userName}`)} 
              className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-semibold transition-all shadow-sm ${isPersonal ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <User weight={isPersonal ? 'fill' : 'bold'} /> Personal ({userName})
            </button>
            <button 
              onClick={() => switchBoard('team')} 
              className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-semibold transition-all shadow-sm ${isTeam ? 'bg-blue-600 text-white shadow-blue-200 ring-2 ring-blue-600 ring-offset-2' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <Users weight={isTeam ? 'fill' : 'bold'} /> Equipo Compartido
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowClientDropdown(!showClientDropdown)} 
                className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-semibold transition-all shadow-sm ${isClient ? 'bg-emerald-600 text-white shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <Briefcase weight={isClient ? 'fill' : 'bold'} /> 
                {isClient && activeClientName ? `Cliente: ${activeClientName}` : 'Tableros de Clientes'}
                <CaretDown weight="bold" />
              </button>

              {showClientDropdown && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-fade-in transform origin-top-left transition-all">
                  <div className="p-4 bg-slate-50 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Selecciona un entorno
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {allClients.length === 0 ? (
                      <div className="p-6 text-sm text-gray-500 text-center font-medium">No hay clientes activos</div>
                    ) : (
                      allClients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => switchBoard(`client_${c.id}`)}
                          className="w-full text-left px-5 py-3.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-50 last:border-0 font-semibold flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          {c.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar items-start">
        {initialColumns?.map((column, idx) => (
          <div 
            key={column.id} 
            className={`flex-shrink-0 w-80 bg-slate-100/90 rounded-2xl flex flex-col max-h-full border-t-4 border border-slate-200 shadow-md ${getColBorder(idx)}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="p-4 py-5 flex justify-between items-center shrink-0">
              <h4 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
                {getColIcon(idx)} {column.title}
              </h4>
              <span className="bg-slate-200/70 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-bold">
                {tasks.filter(t => t.column_id === column.id).length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-3 custom-scrollbar">
              {tasks.filter(t => t.column_id === column.id).map(task => (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  className="bg-white p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-[0_8px_15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-200 group relative"
                >
                  <button onClick={() => handleDelete(task.id, task.title)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <Trash weight="bold" />
                  </button>
                  <h5 className="font-semibold text-slate-800 pr-8 text-sm mb-4 leading-snug">{task.title}</h5>
                  <div className="flex justify-between items-center mt-auto">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border tracking-wide shadow-sm ${priorityStyles[task.priority] || priorityStyles.low}`}>
                      {priorityLabel[task.priority] || priorityLabel.low}
                    </span>
                    {task.deadline && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-bold bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                         <CalendarBlank weight="bold" className="text-slate-400" /> 
                         {new Date(task.deadline).toLocaleDateString('es-AR', {month: 'short', day: 'numeric'})}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => setShowModal(column.id)}
                className="w-full mt-2 py-3 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all border-2 border-transparent hover:border-slate-300 font-bold"
              >
                <Plus weight="bold" /> Añadir tarjeta
              </button>
            </div>
          </div>
        ))}
        {/* Placeholder for "Add list" like trello */}
        <div className="flex-shrink-0 w-80 bg-white/50 border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100/50 transition-colors rounded-2xl flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100">
           <p className="py-4 text-sm font-bold text-slate-500 flex items-center gap-2"><Plus weight="bold" /> Añadir otra lista</p>
        </div>
      </div>

      {showModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-extrabold text-xl text-slate-800">Nueva Tarjeta</h3>
                <p className="text-xs text-indigo-600 font-bold mt-1 tracking-wide uppercase">Se enviará a tu tablero actual</p>
              </div>
              <form onSubmit={handleAddTask} className="p-6 space-y-5 bg-slate-50/50">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción de la Tarea</label>
                    <textarea name="title" required rows="3" placeholder="Ej: Revisar campaña de ADS..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm transition-all resize-none font-medium"></textarea>
                 </div>
                 <div className="grid grid-cols-2 gap-5">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Prioridad</label>
                      <select name="priority" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm font-medium bg-white">
                         <option value="low">🟩 Baja</option>
                         <option value="medium">🟨 Media</option>
                         <option value="high">🟥 Alta</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Vencimiento</label>
                      <input type="date" name="deadline" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm font-medium bg-white text-slate-600" />
                   </div>
                 </div>
                 <div className="flex justify-end gap-3 mt-8 pt-4">
                    <button type="button" onClick={() => setShowModal(null)} className="px-5 py-2.5 text-sm rounded-xl hover:bg-slate-200 text-slate-700 font-bold transition-all">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50">Guardar Tarjeta</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
