// tasks.js - Logic for Trello-like Boards

window.TasksApp = {
    currentBoardId: null,
    sortables: [],

    init() {
        this.bindGlobalEvents();
    },

    bindGlobalEvents() {
        const btnAddCol = document.getElementById('btn-add-column');
        if(btnAddCol) {
            btnAddCol.addEventListener('click', () => {
                const title = prompt('Nombre de la nueva columna:');
                if(title && title.trim()) {
                    Store.addColumn(this.currentBoardId, title.trim());
                    this.renderBoard();
                }
            });
        }
    },

    backToBoards() {
        this.currentBoardId = null;
        this.render();
    },

    selectBoard(boardId) {
        this.currentBoardId = boardId;
        this.render();
    },

    render() {
        const container = document.getElementById('view-tasks-content');
        if(!container) return; // Note: we need to wrap the contents in index.html into a container

        if (!this.currentBoardId) {
            this.renderSelector(container);
        } else {
            this.renderBoardContainer(container);
            this.renderBoard();
        }
    },

    switchTab(tab) {
        const btnBoards = document.getElementById('tab-btn-boards');
        const btnCalendar = document.getElementById('tab-btn-calendar');
        const viewBoards = document.getElementById('view-tasks-boards');
        const viewCalendar = document.getElementById('view-tasks-calendar');

        if (tab === 'boards') {
            btnBoards.className = 'px-6 py-3 border-b-2 text-sm font-semibold transition-colors border-brand-600 text-brand-600';
            btnCalendar.className = 'px-6 py-3 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors';
            viewBoards.classList.remove('hidden');
            viewCalendar.classList.add('hidden');
            this.render();
        } else if (tab === 'calendar') {
            btnCalendar.className = 'px-6 py-3 border-b-2 text-sm font-semibold transition-colors border-brand-600 text-brand-600';
            btnBoards.className = 'px-6 py-3 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors';
            viewCalendar.classList.remove('hidden');
            viewBoards.classList.add('hidden');
            
            // FullCalendar needs the container to be visible to calculate sizes correctly
            setTimeout(() => {
                this.renderCalendar();
            }, 50);
        }
    },

    renderSelector(container) {
        const currentUser = (window.Auth && window.Auth.getUser()) ? window.Auth.getUser() : 'Usuario';
        const personalBoardId = 'personal_' + currentUser;

        let html = `
            <div class="mb-6">
                <h3 class="text-xl font-bold text-gray-900 mb-2">Selecciona un Tablero</h3>
                <p class="text-gray-500 text-sm mb-6">Elige el tablero de LoopSmith o de un cliente activo para gestionar sus tareas.</p>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    
                    <!-- Personal Board Card -->
                    <div onclick="TasksApp.selectBoard('${personalBoardId}')" class="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-2xl shadow-md cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all text-white relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 opacity-10 scale-150 group-hover:scale-125 transition-transform"><i class="ph-fill ph-user text-8xl"></i></div>
                        <i class="ph ph-user-circle text-3xl mb-3"></i>
                        <h4 class="text-lg font-bold">Mi Pizarrón</h4>
                        <p class="text-indigo-100 text-sm mt-1">Privado - ${escapeHtml(currentUser)}</p>
                    </div>

                    <!-- LoopSmith Card -->
                    <div onclick="TasksApp.selectBoard('LoopSmith')" class="bg-gradient-to-br from-brand-500 to-brand-700 p-6 rounded-2xl shadow-md cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all text-white relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 opacity-10 scale-150 group-hover:scale-125 transition-transform"><i class="ph-fill ph-infinity text-8xl"></i></div>
                        <i class="ph ph-briefcase text-3xl mb-3"></i>
                        <h4 class="text-lg font-bold">LoopSmith Interno</h4>
                        <p class="text-brand-100 text-sm mt-1">Gestión interna de estudio</p>
                    </div>
        `;

        const clients = Store.getClients(true); // active only
        
        clients.forEach(c => {
            html += `
                <div onclick="TasksApp.selectBoard('client_${c.id}')" class="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-brand-300 transition-all group">
                    <div class="text-gray-400 group-hover:text-brand-500 mb-3 transition-colors"><i class="ph ph-user-circle text-3xl"></i></div>
                    <h4 class="text-lg font-bold text-gray-900">${escapeHtml(c.name)}</h4>
                    <p class="text-gray-500 text-xs mt-1 uppercase tracking-wider font-semibold">Pack ${c.pack}</p>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.sortables.forEach(s => s.destroy());
        this.sortables = [];
    },

    renderBoardContainer(container) {
        let boardName = 'LoopSmith Interno';
        if (this.currentBoardId.startsWith('client_')) {
            const cId = this.currentBoardId.split('_')[1];
            const client = Store.getClients(true).find(c => c.id === cId);
            if(client) boardName = client.name;
        } else if (this.currentBoardId.startsWith('personal_')) {
            boardName = 'Mi Pizarrón Personal';
        }

        container.innerHTML = `
          <div class="flex justify-between items-center mb-6 shrink-0 border-b border-gray-100 pb-4">
             <div class="flex items-center gap-4">
                 <button onclick="TasksApp.backToBoards()" class="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1 font-medium">
                     <i class="ph ph-caret-left"></i> Volver
                 </button>
                 <h3 class="text-xl font-bold text-gray-900">Tablero: <span class="text-brand-600">${escapeHtml(boardName)}</span></h3>
             </div>
             <button id="btn-add-column" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                 <i class="ph ph-plus"></i> Nueva Columna
             </button>
          </div>
          
          <div class="flex-1 overflow-x-auto overflow-y-hidden pb-4">
              <div id="board-columns-container" class="flex gap-6 h-full items-start min-h-[500px]">
                  <!-- Columns injected by renderBoard -->
              </div>
          </div>
        `;
        
        // Re-bind add column inside the fresh container
        const btnAddCol = document.getElementById('btn-add-column');
        if(btnAddCol) {
            btnAddCol.addEventListener('click', () => {
                const title = prompt('Nombre de la nueva columna:');
                if(title && title.trim()) {
                    Store.addColumn(this.currentBoardId, title.trim());
                    this.renderBoard();
                }
            });
        }
    },

    renderBoard() {
        if(!this.currentBoardId) return;
        const container = document.getElementById('board-columns-container');
        if(!container) return;

        const board = Store.getBoard(this.currentBoardId);
        // Destroy old sortables
        this.sortables.forEach(s => s.destroy());
        this.sortables = [];

        let html = '';
        board.columns.forEach(col => {
            html += `
                <div class="bg-gray-100 rounded-xl w-80 shrink-0 flex flex-col max-h-full border border-gray-200">
                    <div class="p-3 border-b border-gray-200 flex justify-between items-center group">
                        <h4 class="font-semibold text-sm text-gray-800 cursor-pointer hover:text-brand-600 transition-colors" onclick="TasksApp.renameColumn('${col.id}', '${escapeHtml(col.title)}')">
                            ${escapeHtml(col.title)}
                        </h4>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="TasksApp.showAddTaskModal('${col.id}')" class="p-1 text-gray-400 hover:text-brand-600 rounded bg-white shadow-sm" title="Agregar Tarea"><i class="ph ph-plus"></i></button>
                            <button onclick="TasksApp.removeColumn('${col.id}')" class="p-1 text-gray-400 hover:text-red-600 rounded bg-white shadow-sm" title="Eliminar Columna"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                    
                    <div class="p-3 flex-1 overflow-y-auto space-y-3 task-list" data-col-id="${col.id}">
                        ${this.renderTasksForColumn(board, col)}
                    </div>
                </div>
            `;
        });

        // Add dummy div to ensure scrolling reaches the end easily
        html += `<div class="w-8 shrink-0"></div>`;

        container.innerHTML = html;

        // Initialize SortableJS on every `.task-list` container
        const lists = container.querySelectorAll('.task-list');
        lists.forEach(el => {
            const sortable = new Sortable(el, {
                group: 'shared', // set both lists to same group
                animation: 150,
                ghostClass: 'opacity-50', // Class name for the drop placeholder
                dragClass: 'rotate-2', // Class name for the dragging item
                onEnd: (evt) => {
                    const taskId = evt.item.dataset.taskId;
                    const fromColId = evt.from.dataset.colId;
                    const toColId = evt.to.dataset.colId;
                    const newIndex = evt.newIndex;
                    
                    if (fromColId === toColId && evt.oldIndex === newIndex) return; // Didn't actually move
                    
                    Store.moveTask(this.currentBoardId, taskId, fromColId, toColId, newIndex);
                }
            });
            this.sortables.push(sortable);
        });
    },

    renderTasksForColumn(board, col) {
        if(!col.taskIds || col.taskIds.length === 0) return '';
        
        let html = '';
        col.taskIds.forEach(tId => {
            const task = board.tasks[tId];
            if(!task) return;

            // Priority colors
            let prioColor = 'bg-gray-100 text-gray-600';
            let prioText = 'Normal';
            if(task.priority === 'high') { prioColor = 'bg-red-100 text-red-700'; prioText = 'Alta'; }
            if(task.priority === 'medium') { prioColor = 'bg-orange-100 text-orange-700'; prioText = 'Media'; }

            // Subtasks progress
            const totalSub = task.subtasks.length;
            const doneSub = task.subtasks.filter(s => s.done).length;
            const progressHtml = totalSub > 0 
                ? `<div class="flex items-center gap-1 text-xs mt-2 ${doneSub === totalSub ? 'text-green-600' : 'text-gray-500'}">
                    <i class="ph ph-check-square"></i> ${doneSub}/${totalSub}
                   </div>` 
                : '';

            // Deadline logic
            let deadlineHtml = '';
            if (task.deadline) {
                const dlDate = new Date(task.deadline);
                const dlStr = dlDate.toLocaleDateString('es-AR', {day: 'numeric', month: 'short'});
                const today = new Date();
                const diffTime = dlDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let dlColor = 'text-gray-500 bg-gray-100';
                if (diffDays < 0) dlColor = 'text-red-700 bg-red-100 border border-red-300';
                else if (diffDays <= 2) dlColor = 'text-yellow-700 bg-yellow-100 border border-yellow-300';
                 else dlColor = 'text-brand-700 bg-brand-50 border border-brand-200';

                deadlineHtml = `<div class="text-xs px-2 py-0.5 rounded ${dlColor} mt-2 inline-flex items-center gap-1">
                                    <i class="ph ph-clock"></i> ${dlStr}
                                </div>`;
            }

            html += `
                <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-shadow relative" 
                     data-task-id="${task.id}" 
                     onclick="TasksApp.showEditTaskModal('${col.id}', '${task.id}')">
                    
                    <div class="flex justify-between items-start mb-1 gap-2">
                        <span class="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${prioColor}">${prioText}</span>
                        <button onclick="event.stopPropagation(); TasksApp.removeTask('${col.id}', '${task.id}')" class="text-gray-300 hover:text-red-500 transition-colors"><i class="ph ph-trash"></i></button>
                    </div>
                    
                    <h5 class="text-sm font-medium text-gray-900 leading-snug">${escapeHtml(task.title)}</h5>
                    
                    <div class="flex items-end justify-between">
                        ${deadlineHtml}
                        ${progressHtml}
                    </div>
                </div>
            `;
        });
        return html;
    },

    renameColumn(colId, oldTitle) {
        const newTitle = prompt('Nuevo nombre de la columna:', oldTitle);
        if(newTitle && newTitle.trim() && newTitle.trim() !== oldTitle) {
            Store.updateColumnTitle(this.currentBoardId, colId, newTitle.trim());
            this.renderBoard();
        }
    },

    removeColumn(colId) {
        if(confirm('¿Eliminar esta columna y todas sus tareas?')) {
            Store.removeColumn(this.currentBoardId, colId);
            this.renderBoard();
        }
    },

    removeTask(colId, taskId) {
        if(confirm('¿Eliminar esta tarea de forma permanente?')) {
            Store.removeTask(this.currentBoardId, colId, taskId);
            this.renderBoard();
        }
    },

    showAddTaskModal(colId) {
        const formHtml = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">Nueva Tarea</h3>
                    <button onclick="Modal.hide()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                </div>
                <form id="form-add-task" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Título de la tarea</label>
                        <input type="text" id="task-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Prioridad (Opcional)</label>
                            <select id="task-prio" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Límite (Opcional)</label>
                            <input type="date" id="task-deadline" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
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

        document.getElementById('form-add-task').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title').value;
            const prio = document.getElementById('task-prio').value;
            const dl = document.getElementById('task-deadline').value;

            Store.addTask(this.currentBoardId, colId, {
                title,
                priority: prio,
                deadline: dl ? new Date(dl).toISOString() : null
            });
            Modal.hide();
            this.renderBoard();
        });
    },

    showEditTaskModal(colId, taskId) {
        const board = Store.getBoard(this.currentBoardId);
        const task = board.tasks[taskId];
        if(!task) return;

        // Render subtasks
        let subHtml = '';
        task.subtasks.forEach((sub, idx) => {
            subHtml += `
                <div class="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded group">
                    <input type="checkbox" ${sub.done ? 'checked' : ''} class="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer" 
                           onchange="TasksApp.toggleSubtask('${taskId}', ${idx}, this.checked)">
                    <span class="text-sm flex-1 ${sub.done ? 'line-through text-gray-400' : 'text-gray-700'}">${escapeHtml(sub.text)}</span>
                    <button onclick="TasksApp.removeSubtask('${taskId}', ${idx})" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 px-1 transition-opacity"><i class="ph ph-x"></i></button>
                </div>
            `;
        });

        // Deadline formatting for input
        let dlStr = '';
        if(task.deadline) {
            dlStr = new Date(task.deadline).toISOString().split('T')[0];
        }

        const formHtml = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold text-gray-900 flex-1 mr-4 break-words" contenteditable="true" onblur="TasksApp.updateTaskTitle('${taskId}', this.innerText)">${escapeHtml(task.title)}</h3>
                    <button onclick="Modal.hide()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Prioridad</label>
                        <select onchange="TasksApp.updateTaskField('${taskId}', 'priority', this.value)" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baja</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Media</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tiempo Límite</label>
                        <input type="date" value="${dlStr}" onchange="TasksApp.updateTaskField('${taskId}', 'deadline', this.value)" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Subtareas (Checklist)</label>
                    <div id="modal-subtasks" class="mb-3 max-h-40 overflow-y-auto pr-1">
                        ${subHtml || '<p class="text-sm text-gray-400 italic">No hay subtareas.</p>'}
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="new-subtask-text" placeholder="Nueva subtarea..." class="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
                        <button onclick="TasksApp.addSubtask('${taskId}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">Añadir</button>
                    </div>
                </div>
                
                <div class="mt-8 pt-4 border-t border-gray-100 text-right">
                    <button onclick="Modal.hide()" class="px-4 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg font-medium transition-colors">Cerrar</button>
                </div>
            </div>
        `;
        Modal.show(formHtml);
    },

    updateTaskField(taskId, field, value) {
        if(field === 'deadline') {
            value = value ? new Date(value).toISOString() : null;
        }
        Store.updateTask(this.currentBoardId, taskId, { [field]: value });
        this.renderBoard();
        // Keep modal visually in sync if needed, but simple re-fetch on reopen is fine for now
    },

    updateTaskTitle(taskId, newTitle) {
        if(!newTitle || !newTitle.trim()) return;
        Store.updateTask(this.currentBoardId, taskId, { title: newTitle.trim() });
        this.renderBoard();
    },

    addSubtask(taskId) {
        const input = document.getElementById('new-subtask-text');
        const text = input.value.trim();
        if(!text) return;

        const board = Store.getBoard(this.currentBoardId);
        const task = board.tasks[taskId];
        if(!task) return;

        const newSubtasks = [...task.subtasks, { text: text, done: false }];
        Store.updateTask(this.currentBoardId, taskId, { subtasks: newSubtasks });
        
        // Re-render modal to show new subtask
        this.showEditTaskModal('dummy', taskId); // colId not needed for editing
        this.renderBoard();
    },

    removeSubtask(taskId, idx) {
        const board = Store.getBoard(this.currentBoardId);
        const task = board.tasks[taskId];
        if(!task) return;

        const newSubtasks = [...task.subtasks];
        newSubtasks.splice(idx, 1);
        Store.updateTask(this.currentBoardId, taskId, { subtasks: newSubtasks });
        
        this.showEditTaskModal('dummy', taskId);
        this.renderBoard();
    },

    toggleSubtask(taskId, idx, isDone) {
        const board = Store.getBoard(this.currentBoardId);
        const task = board.tasks[taskId];
        if(!task) return;

        const newSubtasks = [...task.subtasks];
        newSubtasks[idx].done = isDone;
        Store.updateTask(this.currentBoardId, taskId, { subtasks: newSubtasks });
        
        this.showEditTaskModal('dummy', taskId);
        this.renderBoard();
    },

    // --- Calendar Integration ---
    renderCalendar() {
        const calContainer = document.getElementById('calendar-container');
        if (!calContainer) return;
        
        // Wait for FullCalendar to be available
        if (typeof FullCalendar === 'undefined') {
            console.warn("FullCalendar cdn not loaded yet");
            setTimeout(() => this.renderCalendar(), 100);
            return;
        }

        calContainer.innerHTML = ''; // clear previous instance
        
        let events = [];
        const currentUser = (window.Auth && window.Auth.getUser()) ? window.Auth.getUser() : 'Usuario';
        
        // Aggregate all tasks with deadlines across all boards
        Object.keys(Store.data.boards).forEach(bId => {
            // Only aggregate if it's public (LoopSmith/client_) or it's MY personal board
            if (bId.startsWith('personal_') && bId !== ('personal_' + currentUser)) return;

            const board = Store.data.boards[bId];
            if(!board.tasks) return;
            
            Object.values(board.tasks).forEach(task => {
                if(task.deadline) {
                    let color = '#4F46E5'; // brand-600 default
                    if (task.priority === 'high') color = '#DC2626'; // red-600
                    if (task.priority === 'medium') color = '#D97706'; // amber-600
                    
                    let boardNameStr = 'LoopSmith';
                    if (bId.startsWith('client_')) {
                         const cid = bId.split('_')[1];
                         const cli = Store.data.clients.find(c => c.id === cid);
                         boardNameStr = cli ? cli.name : 'Cliente';
                    } else if (bId.startsWith('personal_')) {
                         boardNameStr = 'Mi Pizarrón';
                    }

                    // To figure out which column this belongs to (for removing/editing edge cases),
                    // we ideally want to pass the colId. 
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
                            colId: colId,
                            rawTitle: task.title
                        }
                    });
                }
            });
        });

        const calendar = new FullCalendar.Calendar(calContainer, {
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            events: events,
            eventClick: (info) => {
                const props = info.event.extendedProps;
                
                // Temporarily switch board context to edit task safely
                const previousBoardId = this.currentBoardId;
                this.currentBoardId = props.boardId;
                
                // We show modal, and when the user finishes, we have to reload the calendar to reflect changes natively.
                // It's a bit hacky, but tasks.js is designed mostly for board view.
                
                this.showEditTaskModal(props.colId, info.event.id);
                
                // We override the renderBoard temporally so edits refresh the calendar instead if we are in calendar tab
                const originalRenderBoard = this.renderBoard;
                this.renderBoard = () => {
                   this.renderCalendar(); 
                   this.currentBoardId = previousBoardId; // restore
                   this.renderBoard = originalRenderBoard; // detach override
                };
            }
        });
        
        calendar.render();
    }
};

// Utils
function escapeHtml(unsafe) {
    if(!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    TasksApp.init();
});
