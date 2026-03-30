'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  CircleHalf,
  List,
  Plus,
  Trash,
  User,
  Users,
} from '@phosphor-icons/react';
import {
  addKanbanTask,
  deleteKanbanTask,
  updateKanbanTask,
  updateTaskColumn,
} from '@/app/actions';

function buildEmptyTaskDraft() {
  return {
    title: '',
    priority: 'low',
    deadline: '',
    subtasks: [],
  };
}

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) {
    return [];
  }

  return subtasks
    .map((subtask) => ({
      text: String(subtask?.text || ''),
      done: Boolean(subtask?.done),
    }))
    .filter((subtask) => subtask.text.trim().length > 0);
}

function buildTaskDraft(task) {
  if (!task) {
    return buildEmptyTaskDraft();
  }

  return {
    title: String(task.title || ''),
    priority: task.priority || 'low',
    deadline: toDateInputValue(task.deadline),
    subtasks: normalizeSubtasks(task.subtasks),
  };
}

function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

function formatDeadline(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

function getTaskProgress(task) {
  const subtasks = normalizeSubtasks(task?.subtasks);
  const total = subtasks.length;
  const done = subtasks.filter((subtask) => subtask.done).length;

  return { total, done };
}

export default function KanbanClient({ initialColumns, initialTasks, activeBoard, userName, allClients }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks || []);
  const [modalState, setModalState] = useState(null);
  const [taskDraft, setTaskDraft] = useState(buildEmptyTaskDraft);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [boardError, setBoardError] = useState(null);
  const [modalError, setModalError] = useState(null);

  const priorityStyles = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const priorityLabel = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
  };

  const resetModal = () => {
    setModalState(null);
    setTaskDraft(buildEmptyTaskDraft());
    setNewSubtaskText('');
    setModalError(null);
  };

  const openCreateModal = (columnId) => {
    setModalState({ type: 'create', columnId });
    setTaskDraft(buildEmptyTaskDraft());
    setNewSubtaskText('');
    setModalError(null);
  };

  const openEditModal = (task) => {
    setModalState({ type: 'edit', taskId: task.id });
    setTaskDraft(buildTaskDraft(task));
    setNewSubtaskText('');
    setModalError(null);
  };

  const updateDraftField = (field, value) => {
    setTaskDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateDraftSubtask = (index, updates) => {
    setTaskDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask, currentIndex) => (
        currentIndex === index
          ? {
              ...subtask,
              ...updates,
            }
          : subtask
      )),
    }));
  };

  const removeDraftSubtask = (index) => {
    setTaskDraft((current) => ({
      ...current,
      subtasks: current.subtasks.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const addDraftSubtask = () => {
    const text = newSubtaskText.trim();

    if (!text) {
      return;
    }

    setTaskDraft((current) => ({
      ...current,
      subtasks: [
        ...current.subtasks,
        {
          text,
          done: false,
        },
      ],
    }));
    setNewSubtaskText('');
  };

  const handleDragStart = (event, task) => {
    event.dataTransfer.setData('taskId', task.id);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = async (event, columnId) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('taskId');
    const previousTasks = tasks;
    const task = previousTasks.find((currentTask) => currentTask.id === taskId);

    if (!task || task.column_id === columnId) {
      return;
    }

    setBoardError(null);
    setTasks((current) => current.map((currentTask) => (
      currentTask.id === taskId
        ? {
            ...currentTask,
            column_id: columnId,
          }
        : currentTask
    )));

    const response = await updateTaskColumn(taskId, task.title, columnId);

    if (!response.success) {
      setTasks(previousTasks);
      setBoardError(response.error || 'No se pudo mover la tarea.');
    }
  };

  const handleDelete = async (taskId, title) => {
    if (!window.confirm(`Eliminar la tarea "${title}"?`)) {
      return;
    }

    const previousTasks = tasks;
    setBoardError(null);
    setTasks((current) => current.filter((task) => task.id !== taskId));

    const response = await deleteKanbanTask(taskId, title);

    if (!response.success) {
      setTasks(previousTasks);
      setBoardError(response.error || 'No se pudo eliminar la tarea.');
    }
  };

  const handleSaveTask = async (event) => {
    event.preventDefault();
    const normalizedTitle = taskDraft.title.trim();

    if (!normalizedTitle) {
      setModalError('El titulo de la tarea es obligatorio.');
      return;
    }

    setIsSaving(true);
    setModalError(null);
    setBoardError(null);

    const payload = {
      title: normalizedTitle,
      priority: taskDraft.priority,
      deadline: taskDraft.deadline || null,
      subtasks: taskDraft.subtasks,
    };

    let response;

    if (modalState?.type === 'create') {
      response = await addKanbanTask(modalState.columnId, payload.title, payload.priority, payload.deadline, {
        subtasks: payload.subtasks,
      });
    } else {
      response = await updateKanbanTask(modalState?.taskId, payload);
    }

    if (response?.success && response.task) {
      if (modalState?.type === 'create') {
        setTasks((current) => [response.task, ...current]);
      } else {
        setTasks((current) => current.map((task) => (
          task.id === response.task.id ? response.task : task
        )));
      }

      resetModal();
    } else {
      setModalError(response?.error || 'No se pudo guardar la tarea.');
    }

    setIsSaving(false);
  };

  const switchBoard = (boardId) => {
    setShowClientDropdown(false);
    setBoardError(null);
    router.push(`/tasks?board=${boardId}`);
  };

  const getColIcon = (index) => {
    if (index === 0) return <List className="text-gray-400" weight="bold" />;
    if (index === 1) return <CircleHalf className="text-blue-500 animate-pulse" weight="fill" />;
    return <CheckCircle className="text-green-500" weight="fill" />;
  };

  const getColBorder = (index) => {
    if (index === 0) return 'border-t-gray-400';
    if (index === 1) return 'border-t-blue-500';
    return 'border-t-green-500';
  };

  const isPersonal = activeBoard === `personal_${userName}`;
  const isTeam = activeBoard === 'team';
  const isClient = activeBoard.startsWith('client_');
  const activeClientName = isClient
    ? allClients.find((client) => `client_${client.id}` === activeBoard)?.name
    : null;
  const activeCreateColumn = modalState?.type === 'create'
    ? initialColumns?.find((column) => column.id === modalState.columnId)
    : null;
  const draftProgress = getTaskProgress(taskDraft);

  return (
    <div className="absolute inset-0 flex h-full flex-col p-8">
      <div className="mb-6 flex shrink-0 flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="mb-3 text-2xl font-extrabold tracking-tight text-gray-900">Tableros de tareas</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => switchBoard(`personal_${userName}`)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                  isPersonal
                    ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User weight={isPersonal ? 'fill' : 'bold'} />
                Personal ({userName})
              </button>
              <button
                onClick={() => switchBoard('team')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                  isTeam
                    ? 'bg-blue-600 text-white shadow-blue-200 ring-2 ring-blue-600 ring-offset-2'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users weight={isTeam ? 'fill' : 'bold'} />
                Equipo compartido
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowClientDropdown((current) => !current)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                    isClient
                      ? 'bg-emerald-600 text-white shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Briefcase weight={isClient ? 'fill' : 'bold'} />
                  {isClient && activeClientName ? `Cliente: ${activeClientName}` : 'Tableros de clientes'}
                  <CaretDown weight="bold" />
                </button>

                {showClientDropdown && (
                  <div className="absolute left-0 top-full z-20 mt-3 w-72 origin-top-left overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all">
                    <div className="border-b border-gray-100 bg-slate-50 p-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Selecciona un entorno
                    </div>
                    <div className="custom-scrollbar max-h-72 overflow-y-auto">
                      {allClients.length === 0 ? (
                        <div className="p-6 text-center text-sm font-medium text-gray-500">
                          No hay clientes activos
                        </div>
                      ) : (
                        allClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => switchBoard(`client_${client.id}`)}
                            className="flex w-full items-center gap-2 border-b border-gray-50 px-5 py-3.5 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 last:border-0"
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {client.name}
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

        {boardError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
            {boardError}
          </div>
        )}
      </div>

      <div className="custom-scrollbar flex flex-1 items-start gap-6 overflow-x-auto pb-6">
        {initialColumns?.map((column, index) => (
          <div
            key={column.id}
            className={`flex max-h-full w-80 flex-shrink-0 flex-col rounded-2xl border border-slate-200 border-t-4 bg-slate-100/90 shadow-md ${getColBorder(index)}`}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, column.id)}
          >
            <div className="flex shrink-0 items-center justify-between p-4 py-5">
              <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                {getColIcon(index)}
                {column.title}
              </h4>
              <span className="rounded-lg bg-slate-200/70 px-2.5 py-1 text-xs font-bold text-slate-600">
                {tasks.filter((task) => task.column_id === column.id).length}
              </span>
            </div>

            <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3 pt-0">
              {tasks.filter((task) => task.column_id === column.id).map((task) => {
                const progress = getTaskProgress(task);
                const deadlineLabel = formatDeadline(task.deadline);

                return (
                  <div
                    key={task.id}
                    draggable
                    onClick={() => openEditModal(task)}
                    onDragStart={(event) => handleDragStart(event, task)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openEditModal(task);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="group relative cursor-grab rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_15px_rgba(0,0,0,0.1)] active:cursor-grabbing"
                  >
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(task.id, task.title);
                      }}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-300 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      aria-label={`Eliminar ${task.title}`}
                    >
                      <Trash weight="bold" />
                    </button>

                    <h5 className="mb-4 pr-8 text-sm font-semibold leading-snug text-slate-800">{task.title}</h5>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-md border px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-sm ${priorityStyles[task.priority] || priorityStyles.low}`}>
                        {priorityLabel[task.priority] || priorityLabel.low}
                      </span>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {progress.total > 0 && (
                          <span className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold shadow-sm ${
                            progress.done === progress.total
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}>
                            <CheckCircle weight={progress.done === progress.total ? 'fill' : 'bold'} />
                            {progress.done}/{progress.total}
                          </span>
                        )}

                        {deadlineLabel && (
                          <span className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                            <CalendarBlank weight="bold" className="text-slate-400" />
                            {deadlineLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => openCreateModal(column.id)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-transparent py-3 text-sm font-bold text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-200/50 hover:text-slate-800"
              >
                <Plus weight="bold" />
                Anadir tarjeta
              </button>
            </div>
          </div>
        ))}

        <div className="flex w-80 flex-shrink-0 cursor-not-allowed items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 opacity-70">
          <p className="flex py-4 text-sm font-bold text-slate-500">
            El tablero usa columnas base fijas
          </p>
        </div>
      </div>

      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {modalState.type === 'edit' ? 'Editar tarea' : 'Nueva tarea'}
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                    {modalState.type === 'edit'
                      ? 'Actualiza prioridad, fecha y checklist en un solo paso'
                      : `Se creara en ${activeCreateColumn?.title || 'la columna seleccionada'}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-5 bg-slate-50/50 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Titulo de la tarea
                </label>
                <textarea
                  name="title"
                  required
                  rows="3"
                  value={taskDraft.title}
                  onChange={(event) => updateDraftField('title', event.target.value)}
                  placeholder="Ej: Revisar campana de ADS"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium shadow-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Prioridad
                  </label>
                  <select
                    name="priority"
                    value={taskDraft.priority}
                    onChange={(event) => updateDraftField('priority', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Vencimiento
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={taskDraft.deadline}
                    onChange={(event) => updateDraftField('deadline', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">Checklist de subtareas</p>
                    <p className="text-xs font-medium text-slate-500">
                      Divide la tarea en pasos concretos y marca lo resuelto.
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                    draftProgress.total > 0 && draftProgress.done === draftProgress.total
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    <CheckCircle weight={draftProgress.total > 0 && draftProgress.done === draftProgress.total ? 'fill' : 'bold'} />
                    {draftProgress.total > 0 ? `${draftProgress.done}/${draftProgress.total} completas` : 'Sin subtareas'}
                  </span>
                </div>

                <div className="space-y-2">
                  {taskDraft.subtasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-400">
                      Todavia no agregaste subtareas.
                    </div>
                  ) : (
                    taskDraft.subtasks.map((subtask, index) => (
                      <div key={`subtask-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={subtask.done}
                          onChange={(event) => updateDraftSubtask(index, { done: event.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={subtask.text}
                          onChange={(event) => updateDraftSubtask(index, { text: event.target.value })}
                          className={`min-w-0 flex-1 bg-transparent text-sm font-medium outline-none ${
                            subtask.done ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeDraftSubtask(index)}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(event) => setNewSubtaskText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addDraftSubtask();
                      }
                    }}
                    placeholder="Nueva subtarea"
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addDraftSubtask}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    Anadir subtarea
                  </button>
                </div>
              </div>

              {modalError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Guardando...' : modalState.type === 'edit' ? 'Guardar cambios' : 'Crear tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
