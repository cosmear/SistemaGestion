// budget.js - Logic for the Presupuesto view

window.BudgetApp = {
    months: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],

    init() {
        // Initialization if needed
    },

    render() {
        const container = document.getElementById('budget-container');
        if (!container) return;

        let data = Store.getBudget();
        if (!data || !data.incomes || !data.expenses) {
            data = { incomes: [], expenses: [] };
        }
        
        // Calculate totals for incomes
        const incomeTotalsPerMonth = new Array(12).fill(0);
        let incomeGrandTotal = 0;
        data.incomes.forEach(inc => {
            inc.values.forEach((v, i) => {
                incomeTotalsPerMonth[i] += v;
                incomeGrandTotal += v;
            });
        });

        // Calculate totals for expenses
        const expenseTotalsPerMonth = new Array(12).fill(0);
        let expenseGrandTotal = 0;
        data.expenses.forEach(exp => {
            exp.values.forEach((v, i) => {
                expenseTotalsPerMonth[i] += v;
                expenseGrandTotal += v;
            });
        });

        // Calculate Saldo arrays
        const saldoAnterior = new Array(12).fill(0);
        const saldoEsteMes = new Array(12).fill(0);
        let runningBalance = 0;

        for (let i = 0; i < 12; i++) {
            saldoAnterior[i] = runningBalance;
            const netForMonth = incomeTotalsPerMonth[i] - expenseTotalsPerMonth[i];
            runningBalance += netForMonth;
            saldoEsteMes[i] = runningBalance;
        }

        let html = '';

        // --- INGRESOS TABLE ---
        html += this.buildTableHTML('Ingresos', data.incomes, incomeTotalsPerMonth, incomeGrandTotal, 'income');

        // --- EGRESOS TABLE ---
        html += this.buildTableHTML('Egresos', data.expenses, expenseTotalsPerMonth, expenseGrandTotal, 'expense', {
            incomeTotals: incomeTotalsPerMonth,
            saldoAnterior: saldoAnterior,
            saldoEsteMes: saldoEsteMes
        });

        container.innerHTML = html;
        this.bindCellEvents();
    },

    buildTableHTML(title, itemsList, totalsPerMonth, grandTotal, type, extraRows = null) {
        const isIncome = type === 'income';
        const colorClass = isIncome ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
        
        let headerRow = `<th class="py-2 px-4 border border-gray-200">ITEM</th>`;
        this.months.forEach(m => {
            headerRow += `<th class="py-2 px-2 border border-gray-200 text-center text-xs w-24">${m}</th>`;
        });
        headerRow += `<th class="py-2 px-4 border border-gray-200 text-right bg-gray-100">TOTALES</th>`;

        let rowsHTML = '';
        itemsList.forEach(item => {
            let rowTotal = item.values.reduce((a, b) => a + b, 0);
            let cellsHTML = `<td class="py-1 px-3 border border-gray-200 font-medium relative group">
                ${item.name}
                <button onclick="BudgetApp.removeRow('${type}', '${item.id}')" class="absolute left-0 -ml-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar fila">
                    <i class="ph ph-trash"></i>
                </button>
            </td>`;
            
            item.values.forEach((val, i) => {
                cellsHTML += `
                    <td class="py-1 px-1 border border-gray-200 text-right">
                        <input type="number" 
                               class="budget-cell w-full text-right outline-none bg-transparent hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand-500 rounded px-1" 
                               data-type="${type}" 
                               data-id="${item.id}" 
                               data-month="${i}" 
                               value="${val}" 
                               step="0.01">
                    </td>`;
            });
            cellsHTML += `<td class="py-1 px-3 border border-gray-200 text-right font-semibold bg-gray-50 text-gray-700">${window.formatCurrency(rowTotal)}</td>`;
            
            rowsHTML += `<tr class="hover:bg-gray-50">${cellsHTML}</tr>`;
        });

        // Total Row (for incomes or expenses)
        let totalCellsHTML = `<td class="py-2 px-3 border border-gray-200 font-bold ${colorClass}">Total de ${title.toLowerCase()}</td>`;
        totalsPerMonth.forEach(val => {
            totalCellsHTML += `<td class="py-2 px-2 border border-gray-200 text-right font-bold ${colorClass} text-xs truncate" title="${window.formatCurrency(val)}">${window.formatCurrency(val)}</td>`;
        });
        totalCellsHTML += `<td class="py-2 px-3 border border-gray-200 text-right font-bold ${colorClass}">${window.formatCurrency(grandTotal)}</td>`;

        let extraRowsHTML = '';
        if (extraRows) {
            // Saldo mes anterior
            let smCells = `<td class="py-2 px-3 border border-gray-200 font-medium text-gray-600 bg-gray-50">Saldo mes anterior</td>`;
            extraRows.saldoAnterior.forEach(val => {
                smCells += `<td class="py-2 px-2 border border-gray-200 text-right text-xs bg-gray-50 truncate" title="${window.formatCurrency(val)}">${window.formatCurrency(val)}</td>`;
            });
            smCells += `<td class="py-2 px-3 border border-gray-200 bg-gray-50"></td>`;
            extraRowsHTML += `<tr>${smCells}</tr>`;

            // Ingresos Total
            let itCells = `<td class="py-2 px-3 border border-gray-200 font-medium text-gray-600 bg-gray-50">Ingresos Total</td>`;
            extraRows.incomeTotals.forEach(val => {
                itCells += `<td class="py-2 px-2 border border-gray-200 text-right text-xs bg-gray-50 truncate" title="${window.formatCurrency(val)}">${window.formatCurrency(val)}</td>`;
            });
            const globalIncomeTotal = extraRows.incomeTotals.reduce((a,b)=>a+b,0);
            itCells += `<td class="py-2 px-3 border border-gray-200 text-right font-semibold bg-gray-50 text-gray-700">${window.formatCurrency(globalIncomeTotal)}</td>`;
            extraRowsHTML += `<tr>${itCells}</tr>`;

            // Saldo este mes
            let semCells = `<td class="py-2 px-3 border border-gray-200 font-bold text-gray-900 bg-gray-100">Saldo este mes</td>`;
            let finalSaldo = 0;
            extraRows.saldoEsteMes.forEach((val, idx) => {
                semCells += `<td class="py-2 px-2 border border-gray-200 text-right font-bold text-xs bg-gray-100 truncate" title="${window.formatCurrency(val)}">${window.formatCurrency(val)}</td>`;
                if(idx === 11) finalSaldo = val;
            });
            semCells += `<td class="py-2 px-3 border border-gray-200 text-right font-bold text-gray-900 bg-gray-300">${window.formatCurrency(finalSaldo)}</td>`;
            extraRowsHTML += `<tr>${semCells}</tr>`;
        }


        return `
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                <div class="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h4 class="text-md font-bold text-gray-800 uppercase tracking-wide">${title}</h4>
                    <button onclick="BudgetApp.showAddItemModal('${type}')" class="text-sm bg-white border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded disabled:opacity-50 transition-colors flex items-center gap-1">
                        <i class="ph ph-plus"></i> Agregar Fila
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wider">
                                ${headerRow}
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${rowsHTML}
                            <tr class="bg-gray-50">
                                ${totalCellsHTML}
                            </tr>
                            ${extraRowsHTML}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    bindCellEvents() {
        const cells = document.querySelectorAll('.budget-cell');
        cells.forEach(cell => {
            cell.addEventListener('change', (e) => {
                const target = e.target;
                const type = target.dataset.type;
                const id = target.dataset.id;
                const monthInfo = parseInt(target.dataset.month, 10);
                const val = target.value;
                
                Store.updateBudgetCell(type, id, monthInfo, val);
                // Re-render to update all totals immediately
                this.render();
            });
        });
    },

    showAddItemModal(type) {
        const title = type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Egreso';
        const formHtml = `
            <div class="p-6 border-t-4 ${type === 'income' ? 'border-green-500' : 'border-red-500'}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">${title} (Fila de Presupuesto)</h3>
                    <button onclick="Modal.hide()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-add-budget-row" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del ítem</label>
                        <input type="text" id="budget-item-name" required placeholder="Ej: Pago Hosting Anual" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" onclick="Modal.hide()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">Agregar</button>
                    </div>
                </form>
            </div>
        `;
        
        Modal.show(formHtml);

        document.getElementById('form-add-budget-row').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('budget-item-name').value;
            Store.addBudgetItem(type, name);
            Modal.hide();
            this.render();
        });
    },

    removeRow(type, id) {
        if(confirm('¿Estás seguro de que quieres eliminar esta fila del presupuesto? Se perderán los montos de todos los meses de esta fila.')) {
            Store.removeBudgetItem(type, id);
            this.render();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    BudgetApp.init();
});
