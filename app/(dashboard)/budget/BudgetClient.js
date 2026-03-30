'use client';
import { useState } from 'react';
import { Plus, Trash, X } from '@phosphor-icons/react';
import { addBudgetItem, removeBudgetItem, updateBudgetCell } from '@/app/actions';

export default function BudgetClient({ items }) {
  const [showModal, setShowModal] = useState(null); // 'income' or 'expense'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  const incomes = items?.filter(i => i.type === 'income') || [];
  const expenses = items?.filter(i => i.type === 'expense') || [];

  // Totales
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

  // Saldos
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
    await addBudgetItem(showModal, name);
    setIsSubmitting(false);
    setShowModal(null);
  };

  const handleRemove = async (id, name) => {
    if (window.confirm(`¿Seguro quieres eliminar la fila "${name}" del presupuesto?`)) {
      await removeBudgetItem(id, name);
    }
  };

  const handleCellBlur = async (id, monthIndex, value) => {
    await updateBudgetCell(id, monthIndex, value);
  };

  const renderTable = (title, list, type, totals, grandTotal, colorClass, extraRows = null) => {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8 animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <h4 className="text-md font-bold text-gray-800 uppercase tracking-wide">{title}</h4>
          <button onClick={() => setShowModal(type)} className="text-sm bg-white border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1">
            <Plus weight="bold" /> Agregar Fila
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs border-b border-gray-200 divide-x divide-gray-200">
                <th className="py-2 px-4 w-48">ITEM</th>
                {months.map(m => <th key={m} className="py-2 px-2 text-center w-24">{m}</th>)}
                <th className="py-2 px-4 text-right bg-gray-100 w-32">TOTALES</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-gray-500">No hay filas de presupuesto registradas.</td>
                </tr>
              ) : (
                list.map(item => {
                  let rowTotal = 0;
                  for(let i=0; i<12; i++) rowTotal += Number(item[`m${i}`]);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 divide-x divide-gray-200">
                      <td className="py-1 px-3 font-medium relative group">
                        {item.name}
                        <button onClick={() => handleRemove(item.id, item.name)} className="absolute left-1 top-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar fila">
                          <Trash weight="bold" />
                        </button>
                      </td>
                      {[...Array(12)].map((_, i) => (
                        <td key={i} className="py-1 px-1 text-right">
                          <input 
                            type="number" 
                            defaultValue={item[`m${i}`]}
                            onBlur={(e) => handleCellBlur(item.id, i, e.target.value)}
                            className="w-full text-right outline-none bg-transparent hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand-500 px-1" 
                            step="0.01" 
                          />
                        </td>
                      ))}
                      <td className="py-1 px-3 text-right font-semibold bg-gray-50 text-gray-700">{formatMoney(rowTotal)}</td>
                    </tr>
                  )
                })
              )}
              {/* Row: Total de Ingresos/Egresos */}
              <tr className="bg-gray-50 divide-x divide-gray-200 border-t-2 border-gray-200">
                <td className={`py-2 px-3 font-bold ${colorClass}`}>Total de {title.toLowerCase()}</td>
                {totals.map((v, i) => (
                  <td key={i} className={`py-2 px-2 text-right font-bold text-xs truncate ${colorClass}`} title={formatMoney(v)}>
                    {formatMoney(v)}
                  </td>
                ))}
                <td className={`py-2 px-3 text-right font-bold ${colorClass}`}>{formatMoney(grandTotal)}</td>
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
        <tr className="divide-x divide-gray-200 border-t border-gray-100">
          <td className="py-2 px-3 font-medium text-gray-600 bg-gray-50">Saldo mes anterior</td>
          {saldoAnterior.map((val, i) => (
            <td key={i} className="py-2 px-2 text-right text-xs bg-gray-50 truncate" title={formatMoney(val)}>{formatMoney(val)}</td>
          ))}
          <td className="py-2 px-3 border border-gray-200 bg-gray-50"></td>
        </tr>
        <tr className="divide-x divide-gray-200">
          <td className="py-2 px-3 font-medium text-green-700 bg-green-50/50">Ingresos Total</td>
          {incomeTotals.map((val, i) => (
            <td key={i} className="py-2 px-2 text-right text-xs bg-green-50/50 text-green-700 truncate font-semibold" title={formatMoney(val)}>{formatMoney(val)}</td>
          ))}
           <td className="py-2 px-3 text-right font-semibold bg-green-50/50 text-green-800">{formatMoney(incomeGrandTotal)}</td>
        </tr>
        <tr className="divide-x divide-gray-200">
          <td className="py-2 px-3 font-bold text-gray-900 bg-gray-100">Saldo este mes</td>
          {saldoEsteMes.map((val, i) => (
            <td key={i} className="py-2 px-2 text-right font-bold text-xs bg-gray-100 truncate" title={formatMoney(val)}>{formatMoney(val)}</td>
          ))}
          <td className="py-2 px-3 text-right font-bold text-gray-900 bg-gray-300">{formatMoney(saldoEsteMes[11])}</td>
        </tr>
      </>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {renderTable('Ingresos', incomes, 'income', incomeTotals, incomeGrandTotal, 'text-green-700')}
      {renderTable('Egresos', expenses, 'expense', expenseTotals, expenseGrandTotal, 'text-red-700', renderEgresosExtraRows())}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in">
            <div className={`p-6 border-t-4 ${showModal === 'income' ? 'border-green-500' : 'border-red-500'} rounded-t-2xl`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Registrar {showModal === 'income' ? 'Ingreso' : 'Egreso'} Estimado
                </h3>
                <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X weight="bold" />
                </button>
              </div>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la fila</label>
                  <input type="text" name="name" required placeholder="Ej: Renovación Dominio" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${showModal === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                    Guardar Fila
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
