// dashboard.js - Logic for the Dashboard view

window.Dashboard = {
    render() {
        const container = document.getElementById('dashboard-stats-container');
        if(!container) return;

        const clients = Store.getClients();
        const activeClients = clients.filter(c => c.status === 'active').length;
        const totalHistoricClients = clients.length;

        // Calculate total balance
        const cashflow = Store.getCashflow();
        let totalBalance = 0;
        cashflow.forEach(t => {
            if (t.type === 'income') totalBalance += t.amount;
            else if (t.type === 'expense') totalBalance -= t.amount;
        });

        container.innerHTML = `
            <!-- Stat Card -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <i class="ph ph-users text-2xl"></i>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Clientes Actuales</h4>
                    <p class="text-2xl font-bold text-gray-900">${activeClients}</p>
                </div>
            </div>
            <!-- Stat Card -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i class="ph ph-users-three text-2xl"></i>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Clientes Históricos</h4>
                    <p class="text-2xl font-bold text-gray-900">${totalHistoricClients}</p>
                </div>
            </div>
            <!-- Stat Card -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                    <i class="ph ph-bank text-2xl"></i>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Balance Total</h4>
                    <p class="text-2xl font-bold text-gray-900">${window.formatCurrency(totalBalance)}</p>
                </div>
            </div>
        `;

        this.renderRecentActivity();
    },

    renderRecentActivity() {
        const container = document.getElementById('recent-activity-container');
        if(!container) return;

        const cashflow = Store.getCashflow();
        const recent = cashflow.slice(0, 5); // top 5

        if (recent.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">No hay actividad reciente.</p>`;
            return;
        }

        let html = '';
        recent.forEach(t => {
            const isIncome = t.type === 'income';
            html += `
                <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}">
                            <i class="ph ${isIncome ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${t.description}</p>
                            <p class="text-xs text-gray-500">${window.formatDate(t.date)}</p>
                        </div>
                    </div>
                    <span class="text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}">
                        ${isIncome ? '+' : '-'}${window.formatCurrency(t.amount)}
                    </span>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
};

// Auto-render if it's the active view on load
if (document.getElementById('view-dashboard').classList.contains('block')) {
    Dashboard.render();
}
