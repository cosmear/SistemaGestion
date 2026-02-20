// app.js - Main application logic (Navigation, Modals)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navigation ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const headerTitle = document.getElementById('header-title');

    const viewTitles = {
        'dashboard': 'Dashboard',
        'clients': 'Gestión de Clientes',
        'cashflow': 'Cashflow Histórico',
        'budget': 'Presupuesto',
        'tasks': 'Tableros de Tareas',
        'audit': 'Historial de Movimientos'
    };

    function switchView(viewId) {
        // Update header
        headerTitle.textContent = viewTitles[viewId] || 'Loop Smith';

        // Update nav buttons
        navButtons.forEach(btn => {
            if (btn.dataset.view === viewId) {
                btn.classList.add('bg-brand-50', 'text-brand-700');
                btn.classList.remove('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
            } else {
                btn.classList.remove('bg-brand-50', 'text-brand-700');
                btn.classList.add('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
            }
        });

        // Hide all views, show selected
        viewSections.forEach(section => {
            section.classList.remove('block');
            section.classList.add('hidden');
        });

        const selectedView = document.getElementById(`view-${viewId}`);
        if(selectedView) {
            selectedView.classList.remove('hidden');
            selectedView.classList.add('block');
        }

        // Trigger view-specific render logic
        if (viewId === 'dashboard' && window.Dashboard) Dashboard.render();
        if (viewId === 'clients' && window.ClientsApp) ClientsApp.render();
        if (viewId === 'cashflow' && window.CashflowApp) CashflowApp.render();
        if (viewId === 'budget' && window.BudgetApp) BudgetApp.render();
        if (viewId === 'tasks' && window.TasksApp) TasksApp.render();
        if (viewId === 'audit' && window.AuditApp) AuditApp.render();
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = btn.dataset.view;
            switchView(viewId);
        });
    });

    // --- Modal System ---
    window.Modal = {
        container: document.getElementById('modal-container'),
        content: document.getElementById('modal-content'),
        
        show(htmlContent) {
            this.content.innerHTML = htmlContent;
            this.container.classList.remove('hidden');
            // Trigger reflow
            void this.container.offsetWidth; 
            this.container.classList.add('modal-show');
        },
        
        hide() {
            this.container.classList.remove('modal-show');
            setTimeout(() => {
                this.container.classList.add('hidden');
                this.content.innerHTML = '';
            }, 300); // Wait for transition
        }
    };

    // Close modal when clicking outside
    document.getElementById('modal-container').addEventListener('click', (e) => {
        if (e.target.id === 'modal-container') {
            window.Modal.hide();
        }
    });

    // Initialize initial view
    switchView('dashboard');
});

// Utility to format currency
window.formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

window.formatDate = (isoString) => {
    if(!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
};
