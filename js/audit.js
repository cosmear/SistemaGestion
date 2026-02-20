// audit.js - Render audit log view

window.AuditApp = {
    render() {
        const tbody = document.getElementById('audit-table-body');
        if (!tbody) return;

        const logs = Store.getAuditLogs();
        
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-gray-500">No hay movimientos registrados.</td></tr>`;
            return;
        }

        let html = '';
        logs.forEach(log => {
            const dateObj = new Date(log.timestamp);
            const dateStr = dateObj.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            
            // Color code users
            const isCosme = log.user && log.user.toLowerCase() === 'cosme';
            const userBadgeClass = isCosme 
                ? 'bg-blue-100 text-blue-700' 
                : (log.user === 'Sistema' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700');

            html += `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-6 text-gray-500">
                        ${dateStr} <span class="text-xs text-gray-400 ml-1">${timeStr}</span>
                    </td>
                    <td class="py-3 px-6">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${userBadgeClass}">
                            ${log.user}
                        </span>
                    </td>
                    <td class="py-3 px-6 text-gray-900 font-medium">
                        ${log.action}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }
};
