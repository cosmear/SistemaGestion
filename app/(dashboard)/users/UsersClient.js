'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, PencilSimple, Plus, Prohibit, UserCircle } from '@phosphor-icons/react';
import { saveInternalUser, setInternalUserStatus } from '@/app/actions';
import { runServerAction } from '@/utils/client/runServerAction';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Empleado' },
];

function buildDraft(user = null, clientIds = []) {
  return {
    username: user?.username || '',
    fullName: user?.full_name || '',
    role: user?.role || 'employee',
    password: '',
    clientIds: [...clientIds],
  };
}

export default function UsersClient({ initialUsers, clients, assignmentMap, currentUserId }) {
  const router = useRouter();
  const [modalState, setModalState] = useState({ open: false, user: null });
  const [draft, setDraft] = useState(buildDraft());
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const openCreateModal = () => {
    setModalState({ open: true, user: null });
    setDraft(buildDraft());
  };

  const openEditModal = (user) => {
    setModalState({ open: true, user });
    setDraft(buildDraft(user, assignmentMap[user.id] || []));
  };

  const closeModal = () => {
    setModalState({ open: false, user: null });
    setDraft(buildDraft());
    setIsSaving(false);
  };

  const toggleClientSelection = (clientId) => {
    setDraft((current) => ({
      ...current,
      clientIds: current.clientIds.includes(clientId)
        ? current.clientIds.filter((value) => value !== clientId)
        : [...current.clientIds, clientId],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const result = await runServerAction(saveInternalUser, modalState.user?.id || null, draft);

    if (!result.success) {
      alert(result.error || 'No se pudo guardar el usuario interno.');
      setIsSaving(false);
      return;
    }

    closeModal();
    router.refresh();
  };

  const handleStatusChange = async (user) => {
    setPendingUserId(user.id);

    const result = await runServerAction(setInternalUserStatus, user.id, !user.is_active);

    if (!result.success) {
      alert(result.error || 'No se pudo actualizar el usuario.');
    } else {
      router.refresh();
    }

    setPendingUserId(null);
  };

  return (
    <div className="absolute inset-0 flex h-full flex-col overflow-y-auto bg-gray-50 p-4 sm:p-8 custom-scrollbar">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Administracion</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Usuarios internos</h3>
          <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
            Crea empleados, define su rol y limita exactamente que clientes pueden ver en clientes, tareas, calendario y notas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Plus weight="bold" />
          Nuevo usuario
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {initialUsers.map((user) => {
          const assignedClientIds = assignmentMap[user.id] || [];
          const assignedClients = clients.filter((client) => assignedClientIds.includes(client.id));
          const isCurrentUser = user.id === currentUserId;

          return (
            <article
              key={user.id}
              className={`rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)] ${user.is_active ? '' : 'opacity-75'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-50 p-2.5 text-brand-600">
                    <UserCircle className="text-3xl" weight="fill" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black tracking-tight text-gray-900">{user.full_name}</h4>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      @{user.username}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Clientes visibles</p>
                {assignedClients.length === 0 ? (
                  <p className="mt-3 text-sm font-medium text-gray-500">
                    {user.role === 'employee' ? 'Todavia no tiene clientes asignados.' : 'Acceso global por rol.'}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {assignedClients.map((client) => (
                      <span
                        key={client.id}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${client.status === 'inactive' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
                      >
                        {client.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => openEditModal(user)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <PencilSimple weight="bold" />
                  Editar
                </button>

                <button
                  onClick={() => handleStatusChange(user)}
                  disabled={pendingUserId === user.id || isCurrentUser}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                    user.is_active
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  } disabled:opacity-50`}
                >
                  {user.is_active ? <Prohibit weight="bold" /> : <CheckCircle weight="bold" />}
                  {isCurrentUser ? 'Cuenta actual' : user.is_active ? 'Desactivar' : 'Reactivar'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {modalState.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white shadow-2xl custom-scrollbar">
            <div className="border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="text-2xl font-black tracking-tight text-gray-900">
                {modalState.user ? 'Editar usuario interno' : 'Nuevo usuario interno'}
              </h3>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Los empleados ven clientes, tareas, calendario y notas solo de los clientes que les asignes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Usuario</label>
                  <input
                    type="text"
                    required
                    value={draft.username}
                    onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Nombre visible</label>
                  <input
                    type="text"
                    value={draft.fullName}
                    onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Rol</label>
                  <select
                    value={draft.role}
                    onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">
                    {modalState.user ? 'Nueva contrasena (opcional)' : 'Contrasena inicial'}
                  </label>
                  <input
                    type="password"
                    value={draft.password}
                    onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {draft.role === 'employee' ? (
                <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-black text-gray-900">Clientes asignados</p>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    Este usuario solo podra ver estos clientes y sus tableros/notas relacionados.
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {clients.map((client) => {
                      const isChecked = draft.clientIds.includes(client.id);

                      return (
                        <label
                          key={client.id}
                          className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                            isChecked
                              ? 'border-brand-300 bg-brand-50 text-brand-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <p>{client.name}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                              {client.status === 'inactive' ? 'Inactivo' : 'Activo'}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleClientSelection(client.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

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
                  {isSaving ? 'Guardando...' : modalState.user ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
