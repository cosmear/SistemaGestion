'use client';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Trash, X } from '@phosphor-icons/react';
import { addTransaction, deleteTransaction } from '@/app/actions';

export default function CashflowClient({ transactions, totalIn, totalOut, balance }) {
  const [modalType, setModalType] = useState(null); // 'income' or 'expense'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    await addTransaction(formData);
    setIsSubmitting(false);
    setModalType(null); // close modal
  }

  const handleDelete = async (id, desc) => {
    if(window.confirm('¿Seguro quieres eliminar esta transacción?')) {
      await deleteTransaction(id, desc);
    }
  }

  return (
    <div className="animate-fade-in block h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="text-lg font-semibold">Transacciones</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setModalType('income')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <ArrowDownLeft weight="bold" /> Ingreso
          </button>
          <button
            onClick={() => setModalType('expense')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <ArrowUpRight weight="bold" /> Salida
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex justify-between items-center shrink-0">
        <div>
          <p className="text-sm text-gray-500 font-medium">Balance Total</p>
          <h4 className={`text-3xl font-bold mt-1 ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatMoney(balance)}
          </h4>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500 font-medium">Ingresos Totales</p>
            <p className="text-xl font-semibold text-green-600">{formatMoney(totalIn)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Salidas Totales</p>
            <p className="text-xl font-semibold text-red-600">{formatMoney(totalOut)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Fecha</th>
                <th className="py-3 px-6">Descripción</th>
                <th className="py-3 px-6">De/Hacia</th>
                <th className="py-3 px-6 text-right">Monto</th>
                <th className="py-3 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-500">
                    No hay transacciones guardadas.
                  </td>
                </tr>
              ) : (
                transactions?.map(txn => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="py-3 px-6 text-sm text-gray-500">{new Date(txn.date).toLocaleDateString('es-AR')}</td>
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{txn.description}</td>
                    <td className="py-3 px-6 text-sm text-gray-500">{txn.entity_name}</td>
                    <td className={`py-3 px-6 text-sm text-right font-medium ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.type === 'income' ? '+ ' : '- '}
                      {formatMoney(txn.amount)}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button 
                         onClick={() => handleDelete(txn.id, txn.description)}
                         className="text-gray-400 hover:text-red-600 transition-colors p-1" 
                         title="Eliminar">
                        <Trash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in">
            <div className={`p-6 border-t-4 ${modalType === 'income' ? 'border-green-500' : 'border-red-500'} rounded-t-2xl`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Registrar {modalType === 'income' ? 'Ingreso' : 'Egreso'}
                </h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600">
                  <X weight="bold" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="type" value={modalType} />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                  <input type="number" name="amount" required min="0.01" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input type="text" name="description" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entidad (De/Hacia quién)</label>
                  <input type="text" name="entity_name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${modalType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                    Guardar
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
