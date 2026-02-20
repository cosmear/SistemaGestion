// cashflow.js - Logic for the Cashflow view

window.CashflowApp = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const btnAddIncome = document.getElementById('btn-add-income');
        const btnAddExpense = document.getElementById('btn-add-expense');
        
        if(btnAddIncome) {
            btnAddIncome.addEventListener('click', () => {
                this.showTransactionModal('income');
            });
        }

        if(btnAddExpense) {
            btnAddExpense.addEventListener('click', () => {
                this.showTransactionModal('expense');
            });
        }
    },

    render() {
        const tbody = document.getElementById('cashflow-table-body');
        if (!tbody) return;

        const transactions = Store.getCashflow();
        
        // Calculate totals
        let totalIn = 0;
        let totalOut = 0;
        transactions.forEach(t => {
            if (t.type === 'income') totalIn += t.amount;
            else if (t.type === 'expense') totalOut += t.amount;
        });

        document.getElementById('cashflow-total-balance').textContent = window.formatCurrency(totalIn - totalOut);
        document.getElementById('cashflow-total-in').textContent = window.formatCurrency(totalIn);
        document.getElementById('cashflow-total-out').textContent = window.formatCurrency(totalOut);

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-500">No hay transacciones aún.</td></tr>`;
            return;
        }

        let html = '';
        transactions.forEach(t => {
            const isIncome = t.type === 'income';
            
            html += `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="py-4 px-6 text-sm text-gray-600">
                        ${window.formatDate(t.date)}
                    </td>
                    <td class="py-4 px-6">
                        <p class="text-sm font-medium text-gray-900">${t.description}</p>
                    </td>
                    <td class="py-4 px-6">
                        <div class="flex items-center gap-2 text-sm text-gray-500">
                            <span class="truncate max-w-[100px]" title="${t.from}">${t.from}</span>
                            <i class="ph ph-arrow-right text-xs"></i>
                            <span class="truncate max-w-[100px]" title="${t.to}">${t.to}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-right">
                        <span class="font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}">
                            ${isIncome ? '+' : '-'}${window.formatCurrency(t.amount)}
                        </span>
                    </td>
                    <td class="py-4 px-6 text-center">
                        <button onclick="CashflowApp.removeTransaction('${t.id}')" class="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                            <i class="ph ph-trash text-xl"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    showTransactionModal(type) {
        const isIncome = type === 'income';
        const title = isIncome ? 'Nuevo Ingreso' : 'Nueva Salida';
        const btnClass = isIncome ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
        
        // Helper to populate datalist with current clients to make picking "from/to" easier
        const clients = Store.getClients();
        let clientsDatalist = `<datalist id="clients-list">`;
        clients.forEach(c => clientsDatalist += `<option value="${c.name}">`);
        clientsDatalist += `</datalist>`;

        const formHtml = `
            <div class="p-6 border-t-4 ${isIncome ? 'border-green-500' : 'border-red-500'}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">${title}</h3>
                    <button onclick="Modal.hide()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-add-transaction" class="space-y-4">
                    <input type="hidden" id="trans-type" value="${type}">
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                        <input type="number" id="trans-amount" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${isIncome ? 'green' : 'red'}-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <input type="text" id="trans-desc" required placeholder="Ej: Pago de mantenimiento" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${isIncome ? 'green' : 'red'}-500">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Origen (De)</label>
                            <input type="text" id="trans-from" list="clients-list" required placeholder="Ej: Cliente X" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${isIncome ? 'green' : 'red'}-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Destino (Hacia)</label>
                            <input type="text" id="trans-to" list="clients-list" required placeholder="Ej: Banco" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${isIncome ? 'green' : 'red'}-500">
                        </div>
                    </div>
                    
                    ${clientsDatalist}

                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" onclick="Modal.hide()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" class="px-4 py-2 text-white rounded-lg font-medium ${btnClass}">Guardar</button>
                    </div>
                </form>
            </div>
        `;
        
        Modal.show(formHtml);

        document.getElementById('form-add-transaction').addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('trans-amount').value);
            const strType = document.getElementById('trans-type').value;
            const desc = document.getElementById('trans-desc').value;
            const from = document.getElementById('trans-from').value;
            const to = document.getElementById('trans-to').value;

            Store.addTransaction({
                type: strType,
                amount: amount,
                description: desc,
                from: from,
                to: to
            });

            Modal.hide();
            this.render();
            // Re-render dashboard behind the scenes if needed
            if(window.Dashboard) Dashboard.render();
        });
    },

    removeTransaction(id) {
        if(confirm('¿Estás seguro de que quieres eliminar esta transacción permententemente?')) {
            Store.removeTransaction(id);
            this.render();
            if(window.Dashboard) Dashboard.render();
        }
    }
};

// Init events
document.addEventListener('DOMContentLoaded', () => {
    CashflowApp.init();
});
