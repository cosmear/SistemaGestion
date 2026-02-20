// store.js - Handles LocalStorage persistence

const STORE_KEY = 'loop_smith_data';

const initialData = {
    clients: [
        { id: '1', name: 'Game Over', pack: 1, websiteUrl: '', status: 'active', createdAt: new Date().toISOString() },
        { id: '2', name: 'Maria Paula', pack: 2, websiteUrl: '', status: 'active', createdAt: new Date().toISOString() },
        { id: '3', name: 'Parroquia SMT', pack: 0, websiteUrl: '', status: 'active', createdAt: new Date().toISOString() }
    ],
    cashflow: [
        // Example initial transaction
        // { id: 't1', type: 'income', amount: 50000, from: 'Game Over', to: 'Banco', date: new Date().toISOString(), description: 'Pago inicial' }
    ],
    budget: {
        incomes: [
            { id: 'b_i1', name: 'Desarrollos', values: [0, 300000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { id: 'b_i2', name: 'Game over mensual', values: [0, 10700, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000] },
            { id: 'b_i3', name: 'Maria Paula', values: [0, 20000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000] },
        ],
        expenses: [
            { id: 'b_e1', name: 'Hostinger 60 pags', values: [240000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { id: 'b_e2', name: 'Pago comision cliente web', values: [0, 60000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { id: 'b_e3', name: 'Retiros Nacho-Cosme', values: [0, 90000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        ]
    },
    auditLog: []
};

const Store = {
    data: null,

    init() {
        const stored = localStorage.getItem(STORE_KEY);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing stored data", e);
                this.data = JSON.parse(JSON.stringify(initialData));
            }
        } else {
            this.data = JSON.parse(JSON.stringify(initialData));
            this.save();
        }
        
        // Ensure arrays exist
        if (!this.data.clients) this.data.clients = [];
        if (!this.data.cashflow) this.data.cashflow = [];
        if (!this.data.budget) this.data.budget = { incomes: [], expenses: [] };
        if (!this.data.auditLog) this.data.auditLog = [];
        if (!this.data.boards) this.data.boards = {};
    },

    save() {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    },

    // --- Audit Log ---
    logAction(actionDesc) {
        // If Auth module isn't loaded yet or user isn't logged in, fallback to Sistema
        const user = (window.Auth && window.Auth.getUser()) ? window.Auth.getUser() : 'Sistema';
        
        this.data.auditLog.unshift({
            id: 'log_' + Date.now().toString(),
            user: user,
            action: actionDesc,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 200 logs to prevent bloat
        if (this.data.auditLog.length > 200) {
            this.data.auditLog = this.data.auditLog.slice(0, 200);
        }
        
        this.save();
    },

    getAuditLogs() {
        return this.data.auditLog;
    },

    // --- Clients ---
    getClients(activeOnly = false) {
        if (activeOnly) {
             return this.data.clients.filter(c => c.status === 'active');
        }
        return this.data.clients;
    },
    
    addClient(client) {
        client.id = Date.now().toString();
        client.createdAt = new Date().toISOString();
        if(!client.status) client.status = 'active';
        this.data.clients.push(client);
        this.logAction(`Agregó el cliente "${client.name}" con Pack ${client.pack}`);
        this.save();
        return client;
    },

    updateClient(id, updates) {
        const index = this.data.clients.findIndex(c => c.id === id);
        if (index !== -1) {
            const oldName = this.data.clients[index].name;
            this.data.clients[index] = { ...this.data.clients[index], ...updates };
            
            let updateDesc = `Actualizó el cliente "${oldName}"`;
            if (updates.status === 'inactive') updateDesc = `Desactivó el cliente "${oldName}"`;
            if (updates.status === 'active') updateDesc = `Reactivó el cliente "${oldName}"`;
            
            this.logAction(updateDesc);
            this.save();
            return true;
        }
        return false;
    },

    removeClient(id) {
        // Soft delete (change status to inactive) to preserve history
        return this.updateClient(id, { status: 'inactive' });
    },

    // --- Cashflow ---
    getCashflow() {
        return this.data.cashflow.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    addTransaction(transaction) {
        transaction.id = Date.now().toString();
        if (!transaction.date) transaction.date = new Date().toISOString();
        this.data.cashflow.push(transaction);
        
        const typeStr = transaction.type === 'income' ? 'Ingreso' : 'Egreso';
        this.logAction(`Registró un ${typeStr} de $${transaction.amount} (${transaction.description})`);
        
        this.save();
        return transaction;
    },
    
    removeTransaction(id) {
        const initialLen = this.data.cashflow.length;
        const target = this.data.cashflow.find(t => t.id === id);
        this.data.cashflow = this.data.cashflow.filter(t => t.id !== id);
        
        if(this.data.cashflow.length !== initialLen) {
            if(target) this.logAction(`Eliminó transacción: ${target.description}`);
            this.save();
            return true;
        }
        return false;
    },

    // --- Budget ---
    getBudget() {
        return this.data.budget;
    },

    updateBudgetCell(type, id, monthIndex, value) {
        const list = type === 'income' ? this.data.budget.incomes : this.data.budget.expenses;
        const item = list.find(i => i.id === id);
        if(item) {
            const oldVal = item.values[monthIndex];
            item.values[monthIndex] = parseFloat(value) || 0;
            
            if(oldVal !== item.values[monthIndex]) {
                const mesStr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][monthIndex];
                this.logAction(`Editó Presupuesto (${item.name} - ${mesStr}): de $${oldVal} a $${item.values[monthIndex]}`);
                this.save();
            }
            return true;
        }
        return false;
    },

    addBudgetItem(type, name) {
        const list = type === 'income' ? this.data.budget.incomes : this.data.budget.expenses;
        const newItem = {
            id: 'b_' + Date.now().toString(),
            name: name,
            values: [0,0,0,0,0,0,0,0,0,0,0,0]
        };
        list.push(newItem);
        this.logAction(`Agregó ítem de presupuesto: ${name}`);
        this.save();
        return newItem;
    },

    removeBudgetItem(type, id) {
        let name = '';
        if(type === 'income') {
            const item = this.data.budget.incomes.find(i => i.id === id);
            if(item) name = item.name;
            this.data.budget.incomes = this.data.budget.incomes.filter(i => i.id !== id);
        } else {
             const item = this.data.budget.expenses.find(i => i.id === id);
            if(item) name = item.name;
            this.data.budget.expenses = this.data.budget.expenses.filter(i => i.id !== id);
        }
        if(name) this.logAction(`Eliminó fila de presupuesto: ${name}`);
        this.save();
    },

    // --- Tasks (Trello) ---
    getBoard(boardId) {
        if (!this.data.boards[boardId]) {
            // Initialize empty board with default columns
            this.data.boards[boardId] = {
                columns: [
                    { id: 'col_1', title: 'Por Hacer', taskIds: [] },
                    { id: 'col_2', title: 'En Proceso', taskIds: [] },
                    { id: 'col_3', title: 'Terminado', taskIds: [] }
                ],
                tasks: {} // id -> task object
            };
            this.save();
        }
        return this.data.boards[boardId];
    },

    addColumn(boardId, title) {
        const board = this.getBoard(boardId);
        const colId = 'col_' + Date.now();
        board.columns.push({ id: colId, title, taskIds: [] });
        this.logAction(`Agregó columna "${title}" al tablero ${boardId}`);
        this.save();
        return colId;
    },

    updateColumnTitle(boardId, colId, newTitle) {
        const board = this.data.boards[boardId];
        if(!board) return;
        const col = board.columns.find(c => c.id === colId);
        if(col) {
            col.title = newTitle;
            this.save();
        }
    },

    removeColumn(boardId, colId) {
        const board = this.data.boards[boardId];
        if(!board) return;
        const col = board.columns.find(c => c.id === colId);
        if(col) {
            // remove tasks in this column
            col.taskIds.forEach(tId => delete board.tasks[tId]);
            board.columns = board.columns.filter(c => c.id !== colId);
            this.logAction(`Eliminó columna "${col.title}" del tablero ${boardId}`);
            this.save();
        }
    },

    addTask(boardId, colId, taskParams) {
        const board = this.data.boards[boardId];
        if(!board) return;
        
        const taskId = 'task_' + Date.now();
        const task = {
            id: taskId,
            title: taskParams.title || 'Nueva Tarea',
            priority: taskParams.priority || 'low', // low, medium, high
            deadline: taskParams.deadline || null, // iso string
            subtasks: taskParams.subtasks || [], // { text: string, done: boolean }
            createdAt: new Date().toISOString()
        };

        board.tasks[taskId] = task;
        
        const col = board.columns.find(c => c.id === colId);
        if(col) {
            col.taskIds.push(taskId);
            this.logAction(`Agregó tarea "${task.title}" al tablero ${boardId}`);
            this.save();
        }
        return taskId;
    },

    updateTask(boardId, taskId, updates) {
        const board = this.data.boards[boardId];
        if(!board || !board.tasks[taskId]) return;
        
        board.tasks[taskId] = { ...board.tasks[taskId], ...updates };
        this.save();
    },

    removeTask(boardId, colId, taskId) {
        const board = this.data.boards[boardId];
        if(!board) return;

        const col = board.columns.find(c => c.id === colId);
        if(col) {
            col.taskIds = col.taskIds.filter(id => id !== taskId);
        }
        const taskTitle = board.tasks[taskId]?.title || 'Tarea';
        delete board.tasks[taskId];
        
        this.logAction(`Eliminó tarea "${taskTitle}" del tablero ${boardId}`);
        this.save();
    },

    moveTask(boardId, taskId, sourceColId, destColId, newIndex) {
        const board = this.data.boards[boardId];
        if(!board) return;

        const sourceCol = board.columns.find(c => c.id === sourceColId);
        const destCol = board.columns.find(c => c.id === destColId);
        
        if(!sourceCol || !destCol) return;

        // Remove from source
        sourceCol.taskIds = sourceCol.taskIds.filter(id => id !== taskId);
        
        // Add to dest at index
        destCol.taskIds.splice(newIndex, 0, taskId);
        
        this.save();
    }
};

// Initialize store on script load
Store.init();
