'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LinkSimple, Plus, Trash } from '@phosphor-icons/react';
import {
  createTaskForExecutionEntity,
  linkTaskToExecutionEntity,
  unlinkTaskFromExecutionEntity,
} from '@/app/execution-actions';
import { getTaskStatusFromColumnTitle } from '@/utils/execution';
import { runServerAction } from '@/utils/client/runServerAction';

export default function LinkedTasksPanel({
  entityType,
  entityId,
  linkedTasks,
  availableTasks,
  boardOptions,
  assignableUsers,
  title = 'Tareas vinculadas',
  emptyLabel = 'Todavia no hay tareas vinculadas.',
}) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [draft, setDraft] = useState({
    boardId: boardOptions?.[0]?.value || '',
    title: '',
    priority: 'medium',
    deadline: '',
    assignedUserId: '',
  });
  const [isLinking, setIsLinking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const linkedTaskIds = new Set((linkedTasks || []).map((task) => task.id));
  const linkableTasks = (availableTasks || []).filter((task) => !linkedTaskIds.has(task.id));

  const handleLink = async () => {
    if (!selectedTaskId) {
      return;
    }

    setIsLinking(true);
    const result = await runServerAction(linkTaskToExecutionEntity, entityType, entityId, selectedTaskId);

    if (!result.success) {
      alert(result.error || 'No se pudo vincular la tarea.');
      setIsLinking(false);
      return;
    }

    setSelectedTaskId('');
    setIsLinking(false);
    router.refresh();
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setIsCreating(true);

    const result = await runServerAction(createTaskForExecutionEntity, entityType, entityId, draft);

    if (!result.success) {
      alert(result.error || 'No se pudo crear la tarea.');
      setIsCreating(false);
      return;
    }

    setDraft({
      boardId: boardOptions?.[0]?.value || '',
      title: '',
      priority: 'medium',
      deadline: '',
      assignedUserId: '',
    });
    setIsCreating(false);
    router.refresh();
  };

  const handleUnlink = async (taskId) => {
    const result = await runServerAction(unlinkTaskFromExecutionEntity, entityType, entityId, taskId);

    if (!result.success) {
      alert(result.error || 'No se pudo desvincular la tarea.');
      return;
    }

    router.refresh();
  };

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">{title}</p>
          <p className="mt-1 text-sm font-medium text-gray-500">Vincula tareas existentes o crea nuevas desde este contexto.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {linkedTasks.length}
        </span>
      </div>

      {linkedTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm font-medium text-gray-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {linkedTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-gray-900">{task.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                      {getTaskStatusFromColumnTitle(task.kanban_columns?.title || '')}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                      {task.priority || 'medium'}
                    </span>
                    {task.deadline ? (
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {new Date(task.deadline).toLocaleDateString('es-AR')}
                      </span>
                    ) : null}
                    {task.assigned_user_name ? (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700">
                        {task.assigned_user_name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={() => handleUnlink(task.id)}
                  className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                  title="Desvincular tarea"
                >
                  <Trash weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900">
            <LinkSimple weight="bold" /> Vincular existente
          </p>
          <div className="flex flex-col gap-3">
            <select
              value={selectedTaskId}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Selecciona una tarea</option>
              {linkableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleLink}
              disabled={!selectedTaskId || isLinking}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {isLinking ? 'Vinculando...' : 'Vincular tarea'}
            </button>
          </div>
        </div>

        <form onSubmit={handleCreate} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900">
            <Plus weight="bold" /> Crear tarea nueva
          </p>
          <div className="grid gap-3">
            <select
              value={draft.boardId}
              onChange={(event) => setDraft((current) => ({ ...current, boardId: event.target.value }))}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
            >
              {boardOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              required
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Titulo de la tarea"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={draft.priority}
                onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>

              <input
                type="date"
                value={draft.deadline}
                onChange={(event) => setDraft((current) => ({ ...current, deadline: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
              />

              <select
                value={draft.assignedUserId}
                onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Sin asignar</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {isCreating ? 'Creando...' : 'Crear y vincular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
