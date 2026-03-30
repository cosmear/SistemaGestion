'use client';
import { useState } from 'react';
import { Plus, X, Trash, Play, Pause } from '@phosphor-icons/react';
import { insertClient, updateClientStatus } from '@/app/actions';

export default function ClientList({ clients }) {
  const [showModal, setShowModal] = useState(false);
  const [packType, setPackType] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  const getPackBadge = (type) => {
    switch(type) {
      case '0': return <span className="pack-badge-0 px-2 py-1 rounded-md text-xs font-medium">Sitio Web</span>;
      case '1': return <span className="pack-badge-1 px-2 py-1 rounded-md text-xs font-medium">Pack 1</span>;
      case '2': return <span className="pack-badge-2 px-2 py-1 rounded-md text-xs font-medium">Pack 2</span>;
      case '3': return <span className="pack-badge-3 px-2 py-1 rounded-md text-xs font-medium">Pack 3</span>;
      case 'custom': return <span className="pack-badge-custom px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap">Pack Personalizado</span>;
      default: return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">Desconocido</span>;
    }
  };

  const handleStatusToggle = async (client) => {
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    await updateClientStatus(client.id, newStatus, client.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    await insertClient(formData);
    setIsSubmitting(false);
    setShowModal(false);
    setPackType('1'); // reset
  };

  return (
    <div className="animate-fade-in block h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="text-lg font-semibold">Lista de Clientes</h3>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus weight="bold" /> Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Cliente</th>
                <th className="py-3 px-6">Pack</th>
                <th className="py-3 px-6">Datos Financieros (Si es Pers.)</th>
                <th className="py-3 px-6">Estado</th>
                <th className="py-3 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-500">
                    Aún no hay clientes registrados.
                  </td>
                </tr>
              ) : (
                clients?.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${c.status === 'inactive' ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-6 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-6">{getPackBadge(c.pack_type)}</td>
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {c.pack_type === 'custom' ? (
                        <div>
                          <p><span className="font-medium">Alta:</span> {formatMoney(c.pack_dev_fee)}</p>
                          <p><span className="font-medium">Renovación:</span> {formatMoney(c.pack_monthly_fee)}/mes</p>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button 
                        onClick={() => handleStatusToggle(c)} 
                        className={`text-gray-400 hover:text-gray-700 transition-colors p-1 ${c.status === 'active' ? 'hover:text-red-500' : 'hover:text-green-500'}`} 
                        title={c.status === 'active' ? 'Desactivar' : 'Activar'}>
                        {c.status === 'active' ? <Pause className="inline" /> : <Play className="inline" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in">
            <div className="p-6 border-t-4 border-green-500 rounded-t-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Nuevo Cliente</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X weight="bold" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                  <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pack</label>
                  <select 
                    name="pack_type" 
                    value={packType} 
                    onChange={(e) => setPackType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="0">Solo Sitio Web</option>
                    <option value="1">Pack 1</option>
                    <option value="2">Pack 2</option>
                    <option value="3">Pack 3</option>
                    <option value="custom" className="font-bold text-green-700">⭐ Pack Personalizado (Auto-Presupuesto)</option>
                  </select>
                </div>

                {packType === 'custom' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3 animate-fade-in">
                    <p className="text-xs text-green-800 font-medium pb-2 border-b border-green-200">
                      ℹ️ Estos valores se sumarán automáticamente y al instante en la vista de Presupuesto.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-green-900 mb-1">Cobro Único de Desarrollo ($)</label>
                      <input type="number" name="pack_dev_fee" min="0" defaultValue="0" step="0.01" className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-900 mb-1">Cobro Mensual Recurrente ($)</label>
                      <input type="number" name="pack_monthly_fee" min="0" defaultValue="0" step="0.01" className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600" />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                    Crear y Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
