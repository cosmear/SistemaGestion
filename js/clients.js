// clients.js - Logic for the Clients view

window.ClientsApp = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const btnAdd = document.getElementById('btn-add-client');
        if(btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.showAddClientModal();
            });
        }
    },

    render() {
        const tbody = document.getElementById('clients-table-body');
        if (!tbody) return;

        const clients = Store.getClients();
        
        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-gray-500">No hay clientes aún.</td></tr>`;
            return;
        }

        let html = '';
        clients.forEach(client => {
            const isActive = client.status === 'active';
            const badgeClass = `pack-badge-${client.pack || 0}`;
            
            html += `
                <tr class="hover:bg-gray-50 transition-colors ${!isActive ? 'opacity-50' : ''}">
                    <td class="py-4 px-6">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                                ${client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">${client.name}</p>
                                <p class="text-xs text-gray-500">Agregado: ${window.formatDate(client.createdAt)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-6">
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                            Pack ${client.pack}
                        </span>
                    </td>
                    <td class="py-4 px-6">
                        ${isActive 
                            ? `<span class="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md">Activo</span>`
                            : `<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">Inactivo</span>`
                        }
                    </td>
                    <td class="py-4 px-6 text-right space-x-2">
                        ${client.websiteUrl ? `
                            <a href="${client.websiteUrl}" target="_blank" class="text-gray-400 hover:text-brand-600 transition-colors" title="Visitar Web">
                                <i class="ph ph-globe text-xl"></i>
                            </a>
                        ` : ''}
                        
                        <button onclick="ClientsApp.showEditPackModal('${client.id}')" class="text-gray-400 hover:text-blue-600 transition-colors" title="Cambiar Pack">
                            <i class="ph ph-package text-xl"></i>
                        </button>

                        ${isActive ? `
                            <button onclick="ClientsApp.removeClient('${client.id}')" class="text-gray-400 hover:text-red-600 transition-colors" title="Desactivar">
                                <i class="ph ph-trash text-xl"></i>
                            </button>
                        ` : `
                            <button onclick="ClientsApp.reactivateClient('${client.id}')" class="text-gray-400 hover:text-green-600 transition-colors" title="Reactivar">
                                <i class="ph ph-arrow-counter-clockwise text-xl"></i>
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    showAddClientModal() {
        const formHtml = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">Agregar Cliente</h3>
                    <button onclick="Modal.hide()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-add-client" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente / Empresa</label>
                        <input type="text" id="client-name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Pack Asignado</label>
                        <select id="client-pack" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="0">Pack 0 (Gratis)</option>
                            <option value="1">Pack 1</option>
                            <option value="2">Pack 2</option>
                            <option value="3">Pack 3</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Sitio Web (Opcional)</label>
                        <input type="url" id="client-url" placeholder="https://" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" onclick="Modal.hide()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">Guardar</button>
                    </div>
                </form>
            </div>
        `;
        
        Modal.show(formHtml);

        document.getElementById('form-add-client').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('client-name').value;
            const pack = parseInt(document.getElementById('client-pack').value, 10);
            const url = document.getElementById('client-url').value;

            Store.addClient({ name, pack, websiteUrl: url });
            Modal.hide();
            this.render();
            // Re-render dashboard if needed (handled lazily on tab switch, but good practice here)
            if(window.Dashboard) Dashboard.render();
        });
    },

    showEditPackModal(clientId) {
        const client = Store.data.clients.find(c => c.id === clientId);
        if(!client) return;

        const formHtml = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">Modificar Pack: ${client.name}</h3>
                    <button onclick="Modal.hide()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-edit-pack" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nuevo Pack</label>
                        <select id="edit-pack-val" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="0" ${client.pack === 0 ? 'selected' : ''}>Pack 0 (Gratis)</option>
                            <option value="1" ${client.pack === 1 ? 'selected' : ''}>Pack 1</option>
                            <option value="2" ${client.pack === 2 ? 'selected' : ''}>Pack 2</option>
                            <option value="3" ${client.pack === 3 ? 'selected' : ''}>Pack 3</option>
                        </select>
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Actualizar Sitio Web</label>
                        <input type="url" id="edit-url-val" value="${client.websiteUrl || ''}" placeholder="https://" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" onclick="Modal.hide()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">Actualizar</button>
                    </div>
                </form>
            </div>
        `;
        
        Modal.show(formHtml);

        document.getElementById('form-edit-pack').addEventListener('submit', (e) => {
            e.preventDefault();
            const newPack = parseInt(document.getElementById('edit-pack-val').value, 10);
            const newUrl = document.getElementById('edit-url-val').value;
            Store.updateClient(clientId, { pack: newPack, websiteUrl: newUrl });
            Modal.hide();
            this.render();
        });
    },

    removeClient(clientId) {
        if(confirm('¿Estás seguro de que quieres desactivar este cliente? No aparecerá en los conteos de clientes actuales.')) {
            Store.removeClient(clientId);
            this.render();
        }
    },

    reactivateClient(clientId) {
        Store.updateClient(clientId, { status: 'active' });
        this.render();
    }
};

// Init events
document.addEventListener('DOMContentLoaded', () => {
    ClientsApp.init();
});
