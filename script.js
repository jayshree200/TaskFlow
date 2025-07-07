
        // Global variables
        let tasks = [];
        let draggedTask = null;
        const STORAGE_KEY = 'taskflow_tasks';

        // DOM elements
        const taskInput = document.getElementById('taskInput');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const todoTasks = document.getElementById('todoTasks');
        const inprogressTasks = document.getElementById('inprogressTasks');
        const doneTasks = document.getElementById('doneTasks');
        const todoCount = document.getElementById('todoCount');
        const inprogressCount = document.getElementById('inprogressCount');
        const doneCount = document.getElementById('doneCount');

        // Initialize the application
        function init() {
            loadTasksFromStorage();
            renderAllTasks();
            setupEventListeners();
        }

        // Event listeners setup
        function setupEventListeners() {
            addTaskBtn.addEventListener('click', addTask);
            taskInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addTask();
                }
            });

            // Setup drag and drop for columns
            const columns = document.querySelectorAll('.column');
            columns.forEach(column => {
                column.addEventListener('dragover', handleDragOver);
                column.addEventListener('drop', handleDrop);
                column.addEventListener('dragenter', handleDragEnter);
                column.addEventListener('dragleave', handleDragLeave);
            });
        }

        // Add new task
        function addTask() {
            const taskText = taskInput.value.trim();
            
            if (taskText === '') {
                alert('Please enter a task description');
                return;
            }

            const newTask = {
                id: Date.now(),
                text: taskText,
                status: 'todo',
                createdAt: new Date().toISOString()
            };

            tasks.push(newTask);
            saveTasksToStorage();
            renderAllTasks();
            taskInput.value = '';
            taskInput.focus();
        }

        // Delete task
        function deleteTask(taskId) {
            if (confirm('Are you sure you want to delete this task?')) {
                tasks = tasks.filter(task => task.id !== taskId);
                saveTasksToStorage();
                renderAllTasks();
            }
        }

        // Edit task
        function editTask(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
            const taskTextElement = taskCard.querySelector('.task-text');
            const taskMetaElement = taskCard.querySelector('.task-meta');
            
            // Create edit input
            const editInput = document.createElement('textarea');
            editInput.className = 'task-edit-input';
            editInput.value = task.text;
            editInput.rows = 3;
            
            // Create edit actions
            const editActions = document.createElement('div');
            editActions.className = 'edit-actions';
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn';
            saveBtn.textContent = 'Save';
            saveBtn.onclick = () => saveTaskEdit(taskId, editInput.value);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => cancelTaskEdit(taskId);
            
            editActions.appendChild(saveBtn);
            editActions.appendChild(cancelBtn);
            
            // Replace task text with edit input
            taskTextElement.style.display = 'none';
            taskMetaElement.style.display = 'none';
            taskCard.insertBefore(editInput, taskTextElement);
            taskCard.insertBefore(editActions, taskTextElement);
            
            // Focus and select text
            editInput.focus();
            editInput.select();
            
            // Handle Enter key to save
            editInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveTaskEdit(taskId, editInput.value);
                }
                if (e.key === 'Escape') {
                    cancelTaskEdit(taskId);
                }
            });
        }

        // Save task edit
        function saveTaskEdit(taskId, newText) {
            const trimmedText = newText.trim();
            
            if (trimmedText === '') {
                alert('Task description cannot be empty');
                return;
            }
            
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.text = trimmedText;
                task.lastModified = new Date().toISOString();
                saveTasksToStorage();
                renderAllTasks();
            }
        }

        // Cancel task edit
        function cancelTaskEdit(taskId) {
            renderAllTasks();
        }

        // Update task status
        function updateTaskStatus(taskId, newStatus) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = newStatus;
                saveTasksToStorage();
                renderAllTasks();
            }
        }

        // Render all tasks
        function renderAllTasks() {
            renderTasksInColumn('todo', todoTasks);
            renderTasksInColumn('inprogress', inprogressTasks);
            renderTasksInColumn('done', doneTasks);
            updateTaskCounts();
        }

        // Render tasks in specific column
        function renderTasksInColumn(status, container) {
            const filteredTasks = tasks.filter(task => task.status === status);
            
            if (filteredTasks.length === 0) {
                container.innerHTML = getEmptyStateHTML(status);
                return;
            }

            container.innerHTML = filteredTasks.map(task => createTaskCardHTML(task)).join('');
            
            // Add event listeners to newly created task cards
            const taskCards = container.querySelectorAll('.task-card');
            taskCards.forEach(card => {
                setupTaskCardEvents(card);
            });
        }

        // Create task card HTML
        function createTaskCardHTML(task) {
            return `
                <div class="task-card ${task.status} fade-in" draggable="true" data-task-id="${task.id}">
                    <div class="task-text">${escapeHtml(task.text)}</div>
                    <div class="task-meta">
                        <span class="task-id">ID: ${task.id}</span>
                        <div class="task-actions">
                            <button class="edit-btn" onclick="editTask(${task.id})">Edit</button>
                            <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Get empty state HTML
        function getEmptyStateHTML(status) {
            const messages = {
                todo: 'No tasks yet. Add one above!',
                inprogress: 'Drag tasks here when you start working on them',
                done: 'Completed tasks will appear here'
            };
            return `<div class="empty-state">${messages[status]}</div>`;
        }

        // Setup task card events
        function setupTaskCardEvents(card) {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        }

        // Drag and drop handlers
        function handleDragStart(e) {
            draggedTask = this;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');
            draggedTask = null;
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }

        function handleDragEnter(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        }

        function handleDragLeave(e) {
            if (!this.contains(e.relatedTarget)) {
                this.classList.remove('drag-over');
            }
        }

        function handleDrop(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            if (draggedTask) {
                const taskId = parseInt(draggedTask.dataset.taskId);
                const newStatus = this.dataset.status;
                const currentTask = tasks.find(t => t.id === taskId);
                
                if (currentTask && currentTask.status !== newStatus) {
                    updateTaskStatus(taskId, newStatus);
                }
            }
        }

        // Update task counts
        function updateTaskCounts() {
            const counts = {
                todo: tasks.filter(t => t.status === 'todo').length,
                inprogress: tasks.filter(t => t.status === 'inprogress').length,
                done: tasks.filter(t => t.status === 'done').length
            };
            
            todoCount.textContent = counts.todo;
            inprogressCount.textContent = counts.inprogress;
            doneCount.textContent = counts.done;
        }

        // Local storage functions
        function saveTasksToStorage() {
            try {
                const tasksJson = JSON.stringify(tasks);
                localStorage.setItem(STORAGE_KEY, tasksJson);
            } catch (error) {
                console.error('Error saving tasks to localStorage:', error);
            }
        }

        function loadTasksFromStorage() {
            try {
                const tasksJson = localStorage.getItem(STORAGE_KEY);
                if (tasksJson) {
                    tasks = JSON.parse(tasksJson);
                }
            } catch (error) {
                console.error('Error loading tasks from localStorage:', error);
                tasks = [];
            }
        }

        // Utility functions
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Initialize the application when DOM is loaded
        document.addEventListener('DOMContentLoaded', init);
    


        