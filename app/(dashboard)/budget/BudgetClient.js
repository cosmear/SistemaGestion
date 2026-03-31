'use client';
import { useState } from 'react';
import { Plus, Trash, X, ChartLineUp, HandDeposit, HandWithdraw, Coins } from '@phosphor-icons/react';
import { addBudgetItem, removeBudgetItem, updateBudgetCell } from '@/app/actions';
import { runServerAction } from '@/utils/client/runServerAction';

export default function BudgetClient({ items }) {
  const [showModal, setShowModal] = useState(null); // 'income' or 'expense'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const incomes = items?.filter(i => i.type === 'income') || [];
  const expenses = items?.filter(i => i.type === 'expense') || [];

  // Totales Anuales
  const incomeTotals = Array(12).fill(0);
  let incomeGrandTotal = 0;
  incomes.forEach(inc => {
    for (let i = 0; i < 12; i++) {
        const val = Number(inc[`m${i}`]);
        incomeTotals[i] += val;
        incomeGrandTotal += val;
    }
  });

  const expenseTotals = Array(12).fill(0);
  let expenseGrandTotal = 0;
  expenses.forEach(exp => {
    for (let i = 0; i < 12; i++) {
        const val = Number(exp[`m${i}`]);
        expenseTotals[i] += val;
        expenseGrandTotal += val;
    }
  });

  // Cashflow & Saldos Mensuales
  const saldoAnterior = Array(12).fill(0);
  const saldoEsteMes = Array(12).fill(0);
  let runningBalance = 0;

  for (let i = 0; i < 12; i++) {
    saldoAnterior[i] = runningBalance;
    const netForMonth = incomeTotals[i] - expenseTotals[i];
    runningBalance += netForMonth;
    saldoEsteMes[i] = runningBalance;
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const name = e.target.name.value;
    await runServerAction(addBudgetItem, showModal, name);
    setIsSubmitting(false);
    setShowModal(null);
  };

  const handleRemove = async (id, name) => {
    if (window.confirm(`¿Seguro quieres eliminar la fila contable "${name}"?`)) {
      await runServerAction(removeBudgetItem, id, name);
    }
  };

  const handleCellBlur = async (id, monthIndex, value) => {
    await runServerAction(updateBudgetCell, id, monthIndex, value);
  };

  const renderTable = (title, list, type, totals, grandTotal, colorTheme, extraRows = null) => {
    const isIncome = type === 'income';
    
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mb-8 animate-fade-in flex-shrink-0">
        <div className={`flex justify-between items-center p-5 border-b border-gray-100 ${isIncome ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {isIncome ? <HandDeposit weight="fill" className="text-xl" /> : <HandWithdraw weight="fill" className="text-xl" />}
             </div>
             <div>
                <h4 className={`text-xl font-extrabold tracking-tight ${colorTheme.textDark}`}>{title}</h4>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{list.length} Conceptos Activos</p>
             </div>
          </div>
          
          <button 
             onClick={() => setShowModal(type)} 
             className={`text-sm font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-sm ${isIncome ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'}`}
          >
             <Plus weight="bold" /> Añadir Fila
          </button>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-white text-gray-400 uppercase tracking-widest text-[10px] font-black border-b border-gray-100">
                <th className="py-4 px-5 w-56">Categoría / Item</th>
                {months.map(m => <th key={m} className="py-4 px-2 text-center w-24 border-l border-dashed border-gray-100">{m}</th>)}
                <th className="py-4 px-5 text-right bg-gray-50/50 w-36 border-l border-gray-200">Total Anual</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-gray-400 font-bold">No hay filas presupuestarias registradas aquí.</td>
                </tr>
              ) : (
                list.map(item => {
                  let rowTotal = 0;
                  for(let i=0; i<12; i++) rowTotal += Number(item[`m${i}`]);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="py-2.5 px-5 font-bold text-gray-700 relative flex items-center h-full">
                        <button onClick={() => handleRemove(item.id, item.name)} className="mr-3 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all" title="Eliminar fila">
                          <Trash weight="bold" />
                        </button>
                        <span className="truncate flex-1">{item.name}</span>
                      </td>
                      {[...Array(12)].map((_, i) => (
                        <td key={i} className="py-2.5 px-1 border-l border-dashed border-gray-100 relative">
                          <input 
                            type="number" 
                            defaultValue={item[`m${i}`] === 0 ? '' : item[`m${i}`]}
                            placeholder="-"
                            onBlur={(e) => handleCellBlur(item.id, i, e.target.value)}
                            className={`w-full text-center text-xs font-semibold outline-none bg-transparent hover:bg-white focus:bg-white focus:shadow-sm focus:ring-2 rounded-md py-1.5 px-1 transition-all placeholder:text-gray-300 ${isIncome ? 'focus:ring-emerald-500 text-emerald-800' : 'focus:ring-rose-500 text-rose-800'}`} 
                            step="0.01" 
                          />
                        </td>
                      ))}
                      <td className="py-2.5 px-5 text-right font-black bg-gray-50/80 text-gray-900 border-l border-gray-100">{formatMoney(rowTotal)}</td>
                    </tr>
                  )
                })
              )}
              {/* Row: Subtotales */}
              <tr className={`border-t bg-gray-50/50`}>
                <td className={`py-4 px-5 font-black uppercase tracking-widest text-[11px] ${colorTheme.text}`}>🎯 Subtotal Operativo</td>
                {totals.map((v, i) => (
                  <td key={i} className={`py-4 px-2 text-center font-extrabold text-xs border-l border-dashed border-gray-200 truncate ${v > 0 ? colorTheme.textDark : 'text-gray-400'}`} title={formatMoney(v)}>
                    {formatMoney(v)}
                  </td>
                ))}
                <td className={`py-4 px-5 text-right font-black border-l border-gray-200 text-lg ${colorTheme.textDark}`}>{formatMoney(grandTotal)}</td>
              </tr>
              {extraRows}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEgresosExtraRows = () => {
    return (
      <>
        {/* Espaciador visual */}
        <tr><td colSpan={14} className="bg-gray-100/50 h-3 border-y border-gray-200"></td></tr>
        
        {/* Acumulados Financieros */}
        <tr className="bg-white">
          <td className="py-4 px-5 font-bold text-gray-500 text-xs">🏦 Saldo Mes Anterior</td>
          {saldoAnterior.map((val, i) => (
            <td key={i} className="py-4 px-2 text-center text-[11px] font-bold text-gray-500 border-l border-dashed border-gray-100 truncate" title={formatMoney(val)}>{formatMoney(val)}</td>
          ))}
          <td className="py-4 px-5 border-l border-gray-100 bg-gray-50"></td>
        </tr>

        <tr className="bg-emerald-50/30">
          <td className="py-4 px-5 font-extrabold text-emerald-700 text-xs">📈 Ventas Consolidadas</td>
          {incomeTotals.map((val, i) => (
            <td key={i} className="py-4 px-2 text-center text-[11px] font-black text-emerald-600 border-l border-dashed border-emerald-100 truncate" title={formatMoney(val)}>+{formatMoney(val)}</td>
          ))}
           <td className="py-4 px-5 text-right font-black bg-emerald-100 text-emerald-800 border-l border-emerald-200">{formatMoney(incomeGrandTotal)}</td>
        </tr>

        <tr className="bg-gray-900 border-b-0">
          <td className="py-5 px-5 font-black text-white text-sm uppercase tracking-widest flex items-center gap-2"><Coins className="text-yellow-400 text-2xl" weight="fill" /> CAJA FINAL</td>
          {saldoEsteMes.map((val, i) => (
            <td key={i} className={`py-5 px-2 text-center font-black text-sm border-l border-gray-800 truncate ${val >= 0 ? 'text-green-400' : 'text-rose-400'}`} title={formatMoney(val)}>{formatMoney(val)}</td>
          ))}
          <td className={`py-5 px-5 text-right font-black text-xl border-l border-gray-800 ${saldoEsteMes[11] >= 0 ? 'text-green-400' : 'text-rose-400'}`}>{formatMoney(saldoEsteMes[11])}</td>
        </tr>
      </>
    );
  };

  return (
    <div className="animate-fade-in absolute inset-0 p-4 sm:p-8 flex flex-col h-full bg-gray-50/50 overflow-y-auto custom-scrollbar">
      {/* Header General */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 shrink-0 pb-4">
        <div>
           <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3"><ChartLineUp className="text-brand-600" weight="fill" /> Presupuesto Anual</h3>
           <p className="text-sm text-gray-500 font-medium mt-1">Estimación de ventas vs gastos por mes. Los packs de clientes auto-completan ingresos.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
         {renderTable('Proyección de Ingresos', incomes, 'income', incomeTotals, incomeGrandTotal, { text: 'text-emerald-500', textDark: 'text-emerald-700' })}
         {renderTable('Estimación de Egresos', expenses, 'expense', expenseTotals, expenseGrandTotal, { text: 'text-rose-500', textDark: 'text-rose-700' }, renderEgresosExtraRows())}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-fade-in overflow-hidden">
            <div className={`p-6 border-b border-gray-100 ${showModal === 'income' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'} rounded-t-3xl`}>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                   {showModal === 'income' ? <HandDeposit weight="fill" /> : <HandWithdraw weight="fill" />} 
                   Añadir Planificación
                </h3>
                <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-900 hover:bg-white p-1 rounded-lg transition-colors">
                  <X weight="bold" />
                </button>
              </div>
              <p className="text-sm opacity-80 font-medium">Asignará una fila en 0 durante todo el año</p>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nombre o Concepto</label>
                <input type="text" name="name" required placeholder="Ej: Pago de Servidor, Adelanto Web..." className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:bg-white font-semibold text-gray-900 transition-colors ${showModal === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-rose-500'}`} />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(null)} className="px-5 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className={`px-6 py-3 text-white rounded-xl font-extrabold transition-all shadow-lg ${showModal === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'} disabled:opacity-50 hover:-translate-y-0.5`}>
                  Guardar Fila
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
