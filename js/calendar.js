// calendar.js - Global Calendar View
window.CalendarApp = {
    calendar: null,

    init() {
        // Initialization if needed
    },

    render() {
        const calContainer = document.getElementById('view-calendar');
        if (!calContainer) return;
        
        let targetDiv = calContainer.querySelector('#calendar-container');
        if (!targetDiv) {
            targetDiv = document.createElement('div');
            targetDiv.id = 'calendar-container';
            targetDiv.className = 'flex-1 w-full min-h-[600px] mt-4';
            
            calContainer.innerHTML = `
              <div class="flex justify-between items-center mb-6">
                <div>
                  <h3 class="text-xl font-bold text-gray-900">Agenda Compartida</h3>
                  <p class="text-sm text-gray-500 mt-1">Haz clic en un día para agregar una tarea nueva.</p>
                </div>
              </div>
            `;
            calContainer.appendChild(targetDiv);
        } else {
             targetDiv.innerHTML = '';
        }

        // Wait for FullCalendar to be available
        if (typeof FullCalendar === 'undefined') {
            console.warn("FullCalendar cdn not loaded yet");
            setTimeout(() => this.render(), 100);
            return;
        }

        let events = [];
        const currentUser = (window.Auth && window.Auth.getUser()) ? window.Auth.getUser() : 'Usuario';
        
        // Aggregate all tasks with deadlines across all boards
        Object.keys(Store.data.boards).forEach(bId => {
            if (bId.startsWith('personal_') && bId !== ('personal_' + currentUser)) return;

            const board = Store.data.boards[bId];
            if(!board.tasks) return;
            
            Object.values(board.tasks).forEach(task => {
                if(task.deadline) {
                    let color = '#4F46E5'; 
                    if (task.priority === 'high') color = '#DC2626';
                    if (task.priority === 'medium') color = '#D97706';
                    
                    let boardNameStr = 'LoopSmith';
                    if (bId.startsWith('client_')) {
                         const cid = bId.split('_')[1];
                         const cli = Store.data.clients.find(c => c.id === cid);
                         boardNameStr = cli ? cli.name : 'Cliente';
                    } else if (bId.startsWith('personal_')) {
                         boardNameStr = 'Mi Pizarrón';
                    }

                    let colId = 'dummy';
                    board.columns.forEach(c => {
                        if (c.taskIds.includes(task.id)) colId = c.id;
                    });

                    events.push({
                        id: task.id,
                        title: `[${boardNameStr}] ${task.title}`,
                        start: task.deadline,
                        allDay: true,
                        backgroundColor: color,
                        borderColor: color,
                        extendedProps: {
                            boardId: bId,
                            colId: colId
                        }
                    });
                }
            });
        });

        this.calendar = new FullCalendar.Calendar(targetDiv, {
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            events: events,
            dateClick: (info) => {
                this.showCreateTaskGlobalModal(info.dateStr);
            },
            eventClick: (info) => {
                const props = info.event.extendedProps;
                
                // Temporarily redirect to TasksApp edit modal, 
                // but we need to ensure the calendar refreshes on close.
                // In a simpler architecture, we just piggyback off TasksApp 
                // and then manually re-render Calendar.
                const previousBoardId = TasksApp.currentBoardId;
                TasksApp.currentBoardId = props.boardId;
                
                TasksApp.showEditTaskModal(props.colId, info.event.id);
                
                // Hacky hook to detect modal close and re-render calendar
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'class') {
                            const modal = document.getElementById('modal-overlay');
                            if(modal && modal.classList.contains('hidden')) {
                                this.render();
                                TasksApp.currentBoardId = previousBoardId;
                                observer.disconnect();
                            }
                        }
                    });
                });
                
                const modalEl = document.getElementById('modal-overlay');
                if(modalEl) observer.observe(modalEl, { attributes: true });
            }
        });
        
        this.calendar.render();
    },

    showCreateTaskGlobalModal(dateStr) {
        const currentUser = (window.Auth && window.Auth.getUser()) ? window.Auth.getUser() : 'Usuario';
        const personalId = 'personal_' + currentUser;
        
        // Generate board options
        let optionsHtml = `<option value="${personalId}">Mi Pizarrón (Privado)</option>`;
        optionsHtml += `<option value="LoopSmith">LoopSmith Interno</option>`;
        
        const clients = Store.getClients(true);
        clients.forEach(c => {
            optionsHtml += `<option value="client_${c.id}">Cliente: ${escapeHtml(c.name)}</option>`;
        });

        const formHtml = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">Nueva Tarea (Calendario)</h3>
                    <button onclick="Modal.hide()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-add-global-task" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Título de la tarea</label>
                        <input type="text" id="g-task-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Asignar a Tablero</label>
                        <select id="g-task-board" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                            <select id="g-task-prio" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Límite</label>
                            <input type="date" id="g-task-deadline" value="${dateStr}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                        </div>
                    </div>
                    
                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" onclick="Modal.hide()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">Crear Tarea</button>
                    </div>
                </form>
            </div>
        `;
        Modal.show(formHtml);

        document.getElementById('form-add-global-task').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('g-task-title').value;
            const bId = document.getElementById('g-task-board').value;
            const prio = document.getElementById('g-task-prio').value;
            const dl = document.getElementById('g-task-deadline').value;

            // We need to inject it into the first column of the selected board
            const board = Store.getBoard(bId);
            if(board && board.columns && board.columns.length > 0) {
                Store.addTask(bId, board.columns[0].id, {
                    title,
                    priority: prio,
                    deadline: dl ? new Date(dl).toISOString() : null
                });
            } else {
                 alert("El tablero seleccionado no tiene columnas válidas.");
            }
            
            Modal.hide();
            this.render(); // refresh calendar
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    CalendarApp.init();
});
