import { Api } from './api.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.state = {
            tasks: [],
            notes: [],
            grades: [],
            swims: [],
            galas: [],
            qts: [],
            goals: [],
            flashcards: [],
        };
        this.currentCollection = 'all';
        this.searchQuery = "";
        this.isSyncing = false;
        this.pendingDelete = null;
    }

    async init() {
        this.setupEventListeners();
        await this.checkInitialStatus();
        await this.refreshAll();
        this.startBackgroundPolling();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.currentCollection = item.getAttribute('data-collection');
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                UI.elements.viewTitle.textContent = item.textContent;
                this.render();
            });
        });

        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.render();
        });

        // Manual Sync
        UI.elements.syncBtn.addEventListener('click', async () => {
            UI.elements.syncBtn.classList.add('loading');
            try {
                await Api.refreshData();
                await this.refreshAll();
            } finally {
                UI.elements.syncBtn.classList.remove('loading');
            }
        });

        // Creation Modal
        document.getElementById('add-btn').onclick = () => UI.showModal();
        document.getElementById('close-modal').onclick = () => UI.hideModal();
        UI.elements.entryType.onchange = () => UI.updateModalFields();
        document.getElementById('save-entry-btn').onclick = () => this.handleSave();

        // Delete Modal
        document.getElementById('cancel-delete-btn').onclick = () => this.closeDeleteModal();
        document.getElementById('confirm-delete-btn').onclick = () => this.confirmDelete();

        // Close modals on outside click
        window.onclick = (e) => { 
            if (e.target == UI.elements.modalOverlay) UI.hideModal(); 
            if (e.target == UI.elements.deleteModal) this.closeDeleteModal();
        };

        // Connection Changes
        Api.onConnectionChange((isOffline) => {
            UI.updateConnection(isOffline);
            if (!isOffline) this.refreshAll();
        });
    }

    async checkInitialStatus() {
        const isOffline = await Api.getConnectionStatus();
        UI.updateConnection(isOffline);
    }

    async refreshAll(isSilent = false) {
        if (!isSilent) UI.setLoading(true);
        try {
            const [tasks, notes, grades, swims, galas, qts, goals, flashcards] = await Promise.all([
                Api.getTasks(),
                Api.getNotes(),
                Api.getGrades(),
                Api.getSwimSessions(),
                Api.getSwimGalas(),
                Api.getQualifyingTimes(),
                Api.getSwimGoals(),
                Api.getFlashcards()
            ]);

            this.state = { tasks, notes, grades, swims, galas, qts, goals, flashcards };
            this.render();
        } catch (error) {
            console.error("Refresh failed:", error);
        }
    }

    startBackgroundPolling() {
        setInterval(() => this.refreshAll(true), 30000);
    }

    render() {
        const items = this.prepareDataForRender();
        UI.renderList(items, this.searchQuery);
    }

    prepareDataForRender() {
        let items = [];
        const coll = this.currentCollection;

        // Notes
        if (coll === 'all' || coll === 'notes') {
            this.state.notes.forEach(n => items.push({
                id: n.id, type: 'Note', title: n.title, content: n.content,
                meta: [{ icon: 'book', text: n.subject }, { icon: 'clock', text: new Date(n.createdAt).toLocaleDateString() }]
            }));
        }

        // Tasks & Habits
        if (coll === 'all' || coll === 'tasks') {
            this.state.tasks.forEach(t => {
                const isHabit = t.taskType === 'task';
                const isCompleted = isHabit ? this.isHabitDoneToday(t) : t.isCompleted;
                items.push({
                    id: t.id, type: isHabit ? 'Habit' : 'School Task', title: t.title,
                    content: t.subject || (isHabit ? `Streak: ${t.streak ?? 0} days` : ""),
                    isCompleted,
                    meta: [{ icon: 'calendar', text: t.dueDate || new Date(t.createdDate).toLocaleDateString() }]
                });
            });
        }

        // Grades
        if (coll === 'all' || coll === 'grades') {
            this.state.grades.forEach(g => items.push({
                id: g.id, type: 'Grade', title: `${g.subject}: ${g.title}`,
                content: `${g.score}/${g.total} (${Math.round((g.score/g.total)*100)}%)`,
                meta: [{ icon: 'award', text: g.cycle }]
            }));
        }

        // Swimming
        if (coll === 'all' || coll === 'swimming') {
            this.state.swims.forEach(s => items.push({
                id: s.id, type: 'Swim Session', title: `${s.distance}m ${s.stroke}`, content: s.notes || "No notes",
                meta: [{ icon: 'timer', text: `${Math.floor(s.duration/60)}m` }, { icon: 'calendar', text: s.date }]
            }));
            this.state.galas.forEach(g => items.push({
                id: g.id, type: 'Swim Gala', title: g.name, content: g.location,
                meta: [{ icon: 'map-pin', text: g.course.toUpperCase() }, { icon: 'calendar', text: g.date }]
            }));
            this.state.qts.forEach(q => items.push({
                id: q.id, type: 'Qualifying Time', title: q.eventName, content: `Target: ${this.formatDuration(q.targetTime)}`,
                isCompleted: q.isAchieved,
                meta: [{ icon: 'map-pin', text: q.course.toUpperCase() }]
            }));
            this.state.goals.forEach(g => items.push({
                id: g.id, type: 'Swim Goal', title: g.targetDescription, content: `Current: ${g.currentValue} / Target: ${g.targetValue}`,
                isCompleted: g.isAchieved,
                meta: [{ icon: 'target', text: g.goalType }]
            }));
        }

        // Flashcards
        if (coll === 'all' || coll === 'flashcards') {
            this.state.flashcards.forEach(f => items.push({
                id: f.id, type: 'Flashcard', title: f.question, content: f.answer,
                meta: [{ icon: 'refresh-ccw', text: `Interval: ${f.srs_interval ?? f.interval ?? 0}d` }]
            }));
        }

        return items.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
    }

    async handleSave() {
        const type = UI.elements.entryType.value;
        const title = document.getElementById('entry-title').value;
        if (!title) return alert("Title required");

        let record = {
            id: "", 
            userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2", 
            title: title,
        };

        if (type === 'school_notes') {
            record.content = document.getElementById('entry-content').value;
            record.subject = document.getElementById('entry-subject').value;
            record.createdAt = new Date().toISOString();
        } else if (type === 'tasks') {
            record.taskType = "school";
            record.isCompleted = 0;
            record.createdDate = new Date().toISOString();
            record.subject = document.getElementById('entry-subject').value;
            record.dueDate = document.getElementById('entry-due-date').value || null;
            record.schoolTaskType = document.getElementById('entry-priority').value;
        } else if (type === 'habits') {
            record.taskType = "task";
            record.isCompleted = 0;
            record.createdDate = new Date().toISOString();
            record.subject = null;
            record.dueDate = null;
            record.schoolTaskType = null;
            record.linkedNoteIds = null;
            record.streak = 0;
            record.completedDates = "[]"; 
            record.frequency = document.getElementById('entry-frequency').value;
            record.interval = 1;
            record.intervalUnit = "days";
            
            const reminderEnabled = document.getElementById('entry-reminder-enabled').checked;
            record.reminderEnabled = reminderEnabled ? 1 : 0;
            record.reminderType = "specificTime"; 
            
            if (reminderEnabled) {
                const timeVal = document.getElementById('entry-reminder-time').value;
                if (timeVal) {
                    const [h, m] = timeVal.split(':');
                    record.reminderHour = parseInt(h);
                    record.reminderMinute = parseInt(m);
                } else {
                    record.reminderHour = null;
                    record.reminderMinute = null;
                }
            } else {
                record.reminderHour = null;
                record.reminderMinute = null;
            }
        } else if (type === 'swim_sessions') {
            record.date = document.getElementById('entry-date').value + "T12:00:00.000000";
            record.distance = parseFloat(document.getElementById('entry-distance').value) || 0;
            record.duration = parseInt(document.getElementById('entry-duration').value) || 0;
            record.stroke = document.getElementById('entry-stroke').value;
            record.notes = document.getElementById('entry-notes').value || "";
            record.effortLevel = 5; 
            record.poolLength = 25.0; 
            record.sets = "[]"; 
            record.workoutEffect = document.getElementById('entry-workout-effect').value || ""; 
            record.heartRateAvg = parseInt(document.getElementById('entry-hr-avg').value) || 0;
            record.heartRateMax = parseInt(document.getElementById('entry-hr-max').value) || 0;
            record.caloriesBurned = null;
            record.location = null;
        }
 else if (type === 'swim_galas') {
            record.date = document.getElementById('entry-date').value + "T12:00:00.000000";
            record.location = document.getElementById('entry-location').value;
            record.course = document.getElementById('entry-course').value;
            record.events = "[]";
            record.name = title;
        } else if (type === 'qualifying_times') {
            record.eventName = document.getElementById('entry-event-name').value;
            // Convert user-entered seconds to milliseconds for DB
            record.targetTime = (parseFloat(document.getElementById('entry-target-time').value) || 0) * 1000;
            record.course = document.getElementById('entry-course').value;
            record.isAchieved = 0;
            record.name = title; 
        } else if (type === 'swim_goals') {
            record.goalType = document.getElementById('entry-goal-type').value;
            record.targetValue = parseFloat(document.getElementById('entry-target-value').value) || 0;
            record.currentValue = parseFloat(document.getElementById('entry-current-value').value) || 0;
            const dateVal = document.getElementById('entry-target-date').value;
            record.targetDate = dateVal ? dateVal + "T12:00:00.000000" : new Date().toISOString().replace('Z', '000');
            record.isAchieved = 0;
            record.targetDescription = title;
        }

        const collection = type === 'habits' ? 'tasks' : type;

        try {
            await Api.createRecord(collection, record);
            UI.hideModal();
            document.getElementById('entry-title').value = "";
            await this.refreshAll();
        } catch (e) {
            alert("Save failed: " + e);
        }
    }

    handleDelete(type, id) {
        this.pendingDelete = { type, id };
        UI.elements.deleteItemType.textContent = type;
        UI.elements.deleteModal.classList.remove('hidden');
    }

    closeDeleteModal() {
        UI.elements.deleteModal.classList.add('hidden');
        this.pendingDelete = null;
    }

    async confirmDelete() {
        if (!this.pendingDelete) return;
        
        const { type, id } = this.pendingDelete;
        const typeMap = {
            'Habit': 'tasks', 
            'School Task': 'tasks', 
            'Note': 'school_notes',
            'Grade': 'school_grades', 
            'Swim Session': 'swim_sessions',
            'Swim Gala': 'swim_galas',
            'Swim Goal': 'swim_goals',
            'Qualifying Time': 'qualifying_times', 
            'Flashcard': 'flashcards'
        };

        try {
            await Api.deleteRecord(typeMap[type], id);
            this.closeDeleteModal();
            await this.refreshAll();
        } catch (e) { 
            alert("Delete failed: " + e); 
            this.closeDeleteModal();
        }
    }

    isHabitDoneToday(habit) {
        if (!habit.completedDates) return false;
        let dates = typeof habit.completedDates === 'string' ? JSON.parse(habit.completedDates) : habit.completedDates;
        if (!Array.isArray(dates)) return false;
        const today = new Date().toLocaleDateString('en-CA');
        return dates.some(d => (typeof d === 'string' ? d : new Date(d).toISOString()).startsWith(today));
    }

    formatDuration(ms) {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;
    }
}

window.app = new App();
window.addEventListener('DOMContentLoaded', () => window.app.init());
