'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash, CalendarBlank, CaretDown, User, Users, Briefcase } from '@phosphor-icons/react';
import { addKanbanTask, updateTaskColumn, deleteKanbanTask } from '@/app/actions';

export default function KanbanClient({ initialColumns, initialTasks, activeBoard, userName, allClients }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks || []);
  const [showModal, setShowModal] = useState(null); // column_id
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Sync prop changes from Server to Client when board changes
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

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column_id: columnId } : t));
    
    // Server Sync
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
    // Refresh to get fresh tasks for this board from server
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

  const priorityColors = {
    low: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200'
  };

  // Determine current active tab
  const isPersonal = activeBoard === `personal_${userName}`;
  const isTeam = activeBoard === 'team';
  const isClient = activeBoard.startsWith('client_');
  const activeClientName = isClient ? allClients.find(c => `client_${c.id}` === activeBoard)?.name : null;

  return (
    <div className="h-full flex flex-col">
      {/* Board Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shrink-0 gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">Tableros de Tareas</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => switchBoard(`personal_${userName}`)} 
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium transition-colors ${isPersonal ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'}`}
            >
              <User weight={isPersonal ? 'fill' : 'regular'} /> Personal ({userName})
            </button>
            <button 
              onClick={() => switchBoard('team')} 
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium transition-colors ${isTeam ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'}`}
            >
              <Users weight={isTeam ? 'fill' : 'regular'} /> Equipo Compartido
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowClientDropdown(!showClientDropdown)} 
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium transition-colors shadow-sm ${isClient ? 'bg-brand-600 text-white border-brand-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Briefcase weight={isClient ? 'fill' : 'regular'} /> 
                {isClient && activeClientName ? `Cliente: ${activeClientName}` : 'Tableros de Clientes'}
                <CaretDown />
              </button>

              {showClientDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                    Selecciona un cliente
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {allClients.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">No hay clientes activos</div>
                    ) : (
                      allClients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => switchBoard(`client_${c.id}`)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-gray-50 last:border-0 font-medium"
                        >
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

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {initialColumns?.map(column => (
          <div 
            key={column.id} 
            className="flex-shrink-0 w-80 bg-gray-100/80 backdrop-blur-sm rounded-xl flex flex-col max-h-full border border-gray-200 shadow-sm"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={`p-4 flex justify-between items-center border-b border-gray-200 shrink-0 rounded-t-xl ${isClient ? 'bg-brand-50/50' : 'bg-white/50'}`}>
              <h4 className="font-semibold text-gray-800">{column.title}</h4>
              <span className="bg-white text-gray-500 text-xs px-2 py-1 rounded-full shadow-sm font-bold">
                {tasks.filter(t => t.column_id === column.id).length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {tasks.filter(t => t.column_id === column.id).map(task => (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative"
                >
                  <button onClick={() => handleDelete(task.id, task.title)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash />
                  </button>
                  <h5 className="font-medium text-gray-900 pr-6 text-sm mb-3 leading-snug">{task.title}</h5>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${priorityColors[task.priority] || priorityColors.low}`}>
                      {task.priority === 'low' ? 'Baja' : task.priority === 'medium' ? 'Media' : 'Alta'}
                    </span>
                    {task.deadline && (
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100 shadow-sm">
                         <CalendarBlank /> {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => setShowModal(column.id)}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors border-2 border-dashed border-gray-300 hover:border-gray-400 font-medium"
              >
                <Plus weight="bold" /> Agregar Tarea
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
         <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in border-t-4 border-gray-900">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-900">Nueva Tarea</h3>
                <p className="text-xs text-brand-600 font-medium mt-1">Se agregará al tablero vigente</p>
              </div>
              <form onSubmit={handleAddTask} className="p-5 space-y-4 bg-gray-50/50">
                 <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Título / Descripción</label>
                    <input type="text" name="title" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Prioridad</label>
                      <select name="priority" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm">
                         <option value="low">Baja</option>
                         <option value="medium">Media</option>
                         <option value="high">Alta</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Vencimiento</label>
                      <input type="date" name="deadline" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm text-gray-600" />
                   </div>
                 </div>
                 <div className="pt-4 flex justify-end gap-2 border-t border-gray-200 mt-6 pt-5">
                    <button type="button" onClick={() => setShowModal(null)} className="px-4 py-2 text-sm rounded-xl hover:bg-gray-200 text-gray-700 font-medium transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm rounded-xl font-bold bg-gray-900 text-white hover:bg-black transition-colors disabled:opacity-50">Crear Tarea</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
