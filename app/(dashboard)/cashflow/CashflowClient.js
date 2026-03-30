'use client';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Trash, X, Wallet, TrendUp, TrendDown, MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import { addTransaction, deleteTransaction } from '@/app/actions';

export default function CashflowClient({ transactions, totalIn, totalOut, balance }) {
  const [modalType, setModalType] = useState(null); // 'income' or 'expense'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredTransactions = transactions?.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="animate-fade-in absolute inset-0 p-4 sm:p-8 flex flex-col h-full bg-gray-50/50">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 shrink-0 gap-4">
        <div>
           <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Flujo de Caja</h3>
           <p className="text-sm text-gray-500 font-medium mt-1">Monitorea los ingresos y gastos reales de la agencia.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModalType('income')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-0.5"
          >
            <ArrowDownLeft weight="bold" className="text-lg" /> Cobrado (+ingreso)
          </button>
          <button
            onClick={() => setModalType('expense')}
            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-200 hover:-translate-y-0.5"
          >
            <ArrowUpRight weight="bold" className="text-lg" /> Pagado (-egreso)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        {/* Balance */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 relative overflow-hidden group">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Wallet weight="duotone" className="text-brand-600 text-3xl" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Balance Actual</p>
            <h4 className={`text-3xl font-black tracking-tight ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatMoney(balance)}
            </h4>
          </div>
        </div>

        {/* Total Incomes */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 group">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <TrendUp weight="bold" className="text-emerald-500 text-3xl" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ingresos de Caja</p>
            <p className="text-2xl font-extrabold text-emerald-600">{formatMoney(totalIn)}</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 group">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <TrendDown weight="bold" className="text-rose-500 text-3xl" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Egresos de Caja</p>
            <p className="text-2xl font-extrabold text-rose-600">{formatMoney(totalOut)}</p>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="relative w-full sm:w-96">
              <MagnifyingGlass className="absolute left-4 top-3 text-gray-400 text-lg" />
              <input 
                type="text" 
                placeholder="Buscar por descripción o entidad..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition-all"
              />
           </div>
           <button className="flex items-center gap-2 text-sm font-bold text-gray-500 bg-white border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
             <Funnel weight="bold" /> Filtrar Mes
           </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100">
              <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-6">Registro</th>
                <th className="py-4 px-6">Detalle Operativo</th>
                <th className="py-4 px-6">Entidad Vinculada</th>
                <th className="py-4 px-6 text-right">Monto Procesado</th>
                <th className="py-4 px-6 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                       <Wallet weight="thin" className="text-6xl text-gray-200 mb-3" />
                       <p className="text-gray-500 font-bold text-lg">No hay transacciones registradas</p>
                       <p className="text-gray-400 text-sm mt-1">Registra un ingreso o egreso en los botones superiores.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="py-4 px-6 text-sm text-gray-400 font-bold">{new Date(txn.date).toLocaleDateString('es-AR', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                    <td className="py-4 px-6">
                       <p className="text-sm font-bold text-gray-900">{txn.description}</p>
                    </td>
                    <td className="py-4 px-6">
                       <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold border border-gray-200">
                          {txn.entity_name || 'Agencia Interna'}
                       </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-extrabold ${txn.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {txn.type === 'income' ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
                          {formatMoney(txn.amount)}
                       </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                         onClick={() => handleDelete(txn.id, txn.description)}
                         className="text-gray-300 hover:text-red-600 bg-white hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg p-2 transition-all opacity-0 group-hover:opacity-100" 
                         title="Eliminar registro">
                        <Trash weight="bold" className="text-lg" />
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-fade-in overflow-hidden">
            <div className={`p-6 border-b border-gray-100 ${modalType === 'income' ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  {modalType === 'income' ? <><ArrowDownLeft className="text-emerald-500"/> Declarar Cobro</> : <><ArrowUpRight className="text-rose-500"/> Declarar Pago</>}
                </h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-900 hover:bg-white p-1 rounded-lg transition-colors">
                  <X weight="bold" />
                </button>
              </div>
              <p className="text-sm text-gray-500 font-medium">Impactará inmediatamente en el Balance Actual</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <input type="hidden" name="type" value={modalType} />
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Importe Procesado ($)</label>
                <div className="relative">
                   <span className="absolute left-4 top-3 text-gray-400 font-bold">$</span>
                   <input type="number" name="amount" required min="0.01" step="0.01" placeholder="0.00" className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-black text-gray-900 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Concepto / Descripción</label>
                <input type="text" name="description" required placeholder="Ej: Pago de Servidor, Adelanto Web..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-semibold text-gray-900 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Entorno / Protagonista</label>
                <input type="text" name="entity_name" placeholder="Ej: Amazon Web Services, Cliente X..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white font-semibold text-gray-900 transition-colors" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setModalType(null)} className="px-5 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors">Cancelar Operación</button>
                <button type="submit" disabled={isSubmitting} className={`px-6 py-3 text-white rounded-xl font-extrabold transition-all shadow-lg ${modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'} disabled:opacity-50 hover:-translate-y-0.5`}>
                  Procesar Transacción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
