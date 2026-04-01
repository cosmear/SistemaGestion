'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotePencil, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { deleteNote, saveNote } from '@/app/actions';
import { runServerAction } from '@/utils/client/runServerAction';

function buildDraft(note = null) {
  return {
    title: note?.title || '',
    content: note?.content || '',
    scope: note?.scope || 'personal',
    clientId: note?.client_id || '',
  };
}

export default function NotesClient({ initialNotes, availableClients, currentUserId }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState({ open: false, note: null });
  const [draft, setDraft] = useState(buildDraft());
  const [isSaving, setIsSaving] = useState(false);

  const visibleNotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return initialNotes.filter((note) => {
      const matchesFilter = filter === 'all' || note.scope === filter;
      const haystack = [note.title, note.content, note.client_name, note.author_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [filter, initialNotes, searchTerm]);

  const openCreateModal = () => {
    setModalState({ open: true, note: null });
    setDraft(buildDraft());
  };

  const openEditModal = (note) => {
    setModalState({ open: true, note });
    setDraft(buildDraft(note));
  };

  const closeModal = () => {
    setModalState({ open: false, note: null });
    setDraft(buildDraft());
    setIsSaving(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const result = await runServerAction(saveNote, modalState.note?.id || null, draft);

    if (!result.success) {
      alert(result.error || 'No se pudo guardar la nota.');
      setIsSaving(false);
      return;
    }

    closeModal();
    router.refresh();
  };

  const handleDelete = async (note) => {
    if (!window.confirm('Eliminar esta nota?')) {
      return;
    }

    const result = await runServerAction(deleteNote, note.id);

    if (!result.success) {
      alert(result.error || 'No se pudo borrar la nota.');
      return;
    }

    router.refresh();
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Workspace</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Notas</h3>
          <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
            Guarda recordatorios personales o contexto por cliente sin mezclarlo con tickets, calendario o tareas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Plus weight="bold" />
          Nueva nota
        </button>
      </div>

      <div className="mb-6 rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por titulo, cliente, autor o contenido..."
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500 lg:max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'personal', label: 'Personales' },
              { key: 'client', label: 'Clientes' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  filter === option.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleNotes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-[32px] border border-dashed border-gray-300 bg-white p-10 text-center">
          <div>
            <NotePencil className="mx-auto text-6xl text-gray-300" weight="thin" />
            <p className="mt-4 text-lg font-bold text-gray-800">No hay notas para este filtro</p>
            <p className="mt-2 text-sm font-medium text-gray-500">Prueba otro termino o crea una nueva nota.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {visibleNotes.map((note) => {
            const isOwner = note.created_by_user_id === currentUserId;

            return (
              <article
                key={note.id}
                className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${note.scope === 'client' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {note.scope === 'client' ? 'Cliente' : 'Personal'}
                      </span>
                      {note.client_name ? (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${note.client_status === 'inactive' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {note.client_name}
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-4 text-xl font-black tracking-tight text-gray-900">
                      {note.title || 'Nota sin titulo'}
                    </h4>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">{note.author_name}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      {new Date(note.updated_at || note.created_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>

                <p className="mt-5 whitespace-pre-wrap text-sm font-medium leading-7 text-gray-700">{note.content}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => openEditModal(note)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    <PencilSimple weight="bold" />
                    {isOwner ? 'Editar' : 'Actualizar'}
                  </button>

                  <button
                    onClick={() => handleDelete(note)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash weight="bold" />
                    Borrar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalState.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="text-2xl font-black tracking-tight text-gray-900">
                {modalState.note ? 'Editar nota' : 'Nueva nota'}
              </h3>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Decide si la nota es solo tuya o si pertenece al contexto operativo de un cliente.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Tipo</label>
                  <select
                    value={draft.scope}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        scope: event.target.value,
                        clientId: event.target.value === 'client' ? current.clientId : '',
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="personal">Personal</option>
                    <option value="client">Cliente</option>
                  </select>
                </div>

                {draft.scope === 'client' ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-gray-700">Cliente</label>
                    <select
                      required
                      value={draft.clientId}
                      onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Selecciona un cliente</option>
                      {availableClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}{client.status === 'inactive' ? ' (inactivo)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Titulo</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ej: Ideas para la reunion mensual"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Contenido</label>
                <textarea
                  required
                  rows="10"
                  value={draft.content}
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                  className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl px-5 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : modalState.note ? 'Guardar cambios' : 'Crear nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
