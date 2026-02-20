// auth.js - Handles Login & Session

const USERS = [
    { username: 'Cosme', pass: 'Cosme2002' },
    { username: 'Nacho', pass: 'Nacho2001' }
];

window.Auth = {
    currentUser: null,

    init() {
        const storedUser = localStorage.getItem('loop_smith_user');
        if (storedUser) {
            this.currentUser = storedUser;
            this.hideLoginOverlay();
            this.updateSidebarUI();
            this.bindLogout();
        } else {
            this.showLoginOverlay();
            this.bindLogin();
        }
    },

    bindLogin() {
        const form = document.getElementById('form-login');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const userIn = document.getElementById('login-user').value.trim();
            const passIn = document.getElementById('login-pass').value.trim();
            const errorDiv = document.getElementById('login-error');

            const validUser = USERS.find(u => u.username.toLowerCase() === userIn.toLowerCase() && u.pass === passIn);

            if (validUser) {
                // Success
                errorDiv.classList.add('hidden');
                this.currentUser = validUser.username;
                localStorage.setItem('loop_smith_user', validUser.username);
                this.hideLoginOverlay();
                this.updateSidebarUI();
                
                // Track login
                if(window.Store) {
                    Store.logAction('Inició sesión');
                }

                // Wait a tick and then re-render whatever view is active
                setTimeout(() => {
                    const activeViewBtn = document.querySelector('.nav-btn.bg-brand-50');
                    if(activeViewBtn) {
                        const viewId = activeViewBtn.dataset.view;
                        if (viewId === 'dashboard' && window.Dashboard) Dashboard.render();
                        if (viewId === 'clients' && window.ClientsApp) ClientsApp.render();
                        if (viewId === 'cashflow' && window.CashflowApp) CashflowApp.render();
                        if (viewId === 'budget' && window.BudgetApp) BudgetApp.render();
                        if (viewId === 'tasks' && window.TasksApp) TasksApp.render();
                        if (viewId === 'audit' && window.AuditApp) AuditApp.render();
                    }
                }, 50);

                this.bindLogout();
            } else {
                // Fail
                errorDiv.classList.remove('hidden');
            }
        });
    },

    bindLogout() {
        const btn = document.getElementById('btn-logout');
        if (!btn) return;
        
        // Remove old listeners to prevent stacking if init is called multiple times
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            if(window.Store) Store.logAction('Cerró sesión');
            localStorage.removeItem('loop_smith_user');
            this.currentUser = null;
            document.getElementById('form-login').reset();
            this.showLoginOverlay();
            this.bindLogin();
        });
    },

    showLoginOverlay() {
        const overlay = document.getElementById('login-overlay');
        if(overlay) {
            overlay.classList.remove('hidden');
            // Trigger reflow
            void overlay.offsetWidth;
            overlay.classList.add('opacity-100');
            overlay.classList.remove('opacity-0', 'pointer-events-none');
        }
    },

    hideLoginOverlay() {
        const overlay = document.getElementById('login-overlay');
        if(overlay) {
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 500); // Wait for transition
        }
    },

    updateSidebarUI() {
        const avatar = document.getElementById('sidebar-user-avatar');
        const name = document.getElementById('sidebar-user-name');
        
        if (avatar && this.currentUser) {
            avatar.textContent = this.currentUser.charAt(0).toUpperCase();
            if(this.currentUser.toLowerCase() === 'cosme') {
                avatar.className = 'w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold overflow-hidden shadow-inner flex items-center justify-center';
            } else {
                avatar.className = 'w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold overflow-hidden shadow-inner flex items-center justify-center';
            }
        }
        if (name && this.currentUser) {
            name.textContent = this.currentUser;
        }
    },

    getUser() {
        return this.currentUser || 'Sistema';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
