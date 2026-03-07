const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

// State
let currentState = {
    tasks: [],
    notes: [],
    grades: [],
    swims: [],
    galas: [],
    qts: [],
    goals: [],
    flashcards: [],
};

let currentCollection = 'all';
let searchQuery = "";
let pollInterval = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const dataContainer = document.getElementById('data-container');
const viewTitle = document.getElementById('view-title');
const searchInput = document.getElementById('search-input');
const syncBtn = document.getElementById('sync-btn');
const connectionBanner = document.getElementById('connection-banner');

// Initialize
async function init() {
    setupNavigation();
    setupSearch();
    setupSync();
    setupConnectionListener();
    await refreshAll();
    
    // Check initial connection status
    const isOffline = await invoke("get_connection_status");
    updateConnectionUI(isOffline);

    // Near real-time updates: poll every 30 seconds
    startPolling();
}

function setupConnectionListener() {
    listen('connection-status', (event) => {
        const isOffline = event.payload;
        updateConnectionUI(isOffline);
        if (!isOffline) {
            refreshAll(); // Auto refresh when coming back online
        }
    });
}

function updateConnectionUI(isOffline) {
    if (isOffline) {
        connectionBanner.textContent = "Offline Mode - Using Local Cache";
        connectionBanner.className = "connection-banner offline";
    } else {
        connectionBanner.textContent = "Connection Established - Synced with Trailbase";
        connectionBanner.className = "connection-banner online";
        // Hide banner after 3 seconds when online
        setTimeout(() => {
            if (connectionBanner.classList.contains('online')) {
                connectionBanner.classList.add('hidden');
            }
        }, 3000);
    }
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        console.log("Auto-syncing...");
        await silentRefresh();
    }, 30000);
}

function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const collection = item.getAttribute('data-collection');
            currentCollection = collection;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            viewTitle.textContent = item.textContent;
            renderData();
        });
    });
}

function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderData();
    });
}

function setupSync() {
    syncBtn.addEventListener('click', async () => {
        syncBtn.classList.add('loading');
        try {
            await invoke("refresh_data_command");
            await refreshAll();
        } catch (e) {
            console.error(e);
            alert("Sync failed: " + e);
        } finally {
            syncBtn.classList.remove('loading');
        }
    });
}

async function silentRefresh() {
    try {
        await invoke("refresh_data_command");
        const [tasks, notes, grades, swims, galas, qts, goals, flashcards] = await Promise.all([
            invoke("get_tasks"),
            invoke("get_notes"),
            invoke("get_grades"),
            invoke("get_swim_sessions"),
            invoke("get_swim_galas"),
            invoke("get_qualifying_times"),
            invoke("get_swim_goals"),
            invoke("get_flashcards")
        ]);
        currentState = { tasks, notes, grades, swims, galas, qts, goals, flashcards };
        renderData();
    } catch (e) {
        console.warn("Silent refresh failed:", e);
    }
}

async function refreshAll() {
    dataContainer.innerHTML = '<div class="loading-msg">Fetching data from Trailbase...</div>';
    try {
        const [tasks, notes, grades, swims, galas, qts, goals, flashcards] = await Promise.all([
            invoke("get_tasks"),
            invoke("get_notes"),
            invoke("get_grades"),
            invoke("get_swim_sessions"),
            invoke("get_swim_galas"),
            invoke("get_qualifying_times"),
            invoke("get_swim_goals"),
            invoke("get_flashcards")
        ]);

        currentState = { tasks, notes, grades, swims, galas, qts, goals, flashcards };
        renderData();
    } catch (error) {
        console.error("Failed to fetch data:", error);
        dataContainer.innerHTML = `<div class="loading-msg" style="color: #ef4444">Error: ${error}</div>`;
    }
}

function isHabitCompletedToday(habit) {
    if (!habit.completedDates) return false;
    let dates = habit.completedDates;
    if (typeof dates === 'string') {
        try { dates = JSON.parse(dates); } catch (e) { return false; }
    }
    if (!Array.isArray(dates)) return false;
    const today = new Date().toLocaleDateString('en-CA');
    return dates.some(d => {
        const dateStr = typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
        return dateStr === today;
    });
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0').substring(0, 2)}`;
}

function renderData() {
    dataContainer.innerHTML = "";
    let itemsToRender = [];

    // Tasks & Habits
    if (currentCollection === 'all' || currentCollection === 'tasks') {
        currentState.tasks.forEach(t => {
            const isHabit = t.taskType === 'task' || t.taskType === 'Task';
            const type = isHabit ? 'Habit' : 'School Task';
            const isCompleted = isHabit ? isHabitCompletedToday(t) : t.isCompleted;
            
            itemsToRender.push({
                type: type,
                title: t.title,
                content: t.subject || (isHabit ? `Streak: ${t.streak ?? 0} days` : ""),
                meta: [
                    { icon: 'calendar', text: t.dueDate || new Date(t.createdDate).toLocaleDateString() },
                    { icon: isCompleted ? 'check-circle' : 'circle', text: isCompleted ? 'Completed' : 'Pending' }
                ],
                isCompleted: isCompleted,
                raw: t
            });
        });
    }

    // Notes
    if (currentCollection === 'all' || currentCollection === 'notes') {
        currentState.notes.forEach(n => {
            itemsToRender.push({
                type: 'Note',
                title: n.title,
                content: n.content,
                meta: [
                    { icon: 'book', text: n.subject },
                    { icon: 'clock', text: new Date(n.createdAt).toLocaleDateString() }
                ],
                raw: n
            });
        });
    }

    // Grades
    if (currentCollection === 'all' || currentCollection === 'grades') {
        currentState.grades.forEach(g => {
            itemsToRender.push({
                type: 'Grade',
                title: `${g.subject}: ${g.title}`,
                content: `${g.score} / ${g.total} (${Math.round((g.score / g.total) * 100)}%)`,
                meta: [
                    { icon: 'award', text: g.cycle },
                    { icon: 'calendar', text: g.date }
                ],
                raw: g
            });
        });
    }

    // Swimming (Sessions, Galas, QTs, Goals)
    if (currentCollection === 'all' || currentCollection === 'swimming') {
        currentState.swims.forEach(s => {
            itemsToRender.push({
                type: 'Swim Session',
                title: `${s.distance}m ${s.stroke}`,
                content: s.notes || "No notes",
                meta: [
                    { icon: 'timer', text: `${Math.floor(s.duration / 60)}m ${s.duration % 60}s` },
                    { icon: 'calendar', text: s.date }
                ],
                raw: s
            });
        });
        currentState.galas.forEach(g => {
            itemsToRender.push({
                type: 'Swim Gala',
                title: g.name,
                content: g.location,
                meta: [
                    { icon: 'map-pin', text: g.course },
                    { icon: 'calendar', text: g.date }
                ],
                raw: g
            });
        });
        currentState.qts.forEach(q => {
            itemsToRender.push({
                type: 'Qualifying Time',
                title: q.eventName,
                content: `Target: ${formatDuration(q.targetTime)}`,
                meta: [
                    { icon: 'map-pin', text: q.course },
                    { icon: q.isAchieved ? 'check-circle' : 'circle', text: q.isAchieved ? 'Achieved' : 'Goal' }
                ],
                isCompleted: q.isAchieved,
                raw: q
            });
        });
        currentState.goals.forEach(g => {
            itemsToRender.push({
                type: 'Swim Goal',
                title: g.targetDescription,
                content: `Target: ${g.targetValue} (Current: ${g.currentValue})`,
                meta: [
                    { icon: 'target', text: g.goalType },
                    { icon: g.isAchieved ? 'check-circle' : 'circle', text: g.isAchieved ? 'Achieved' : 'In Progress' }
                ],
                isCompleted: g.isAchieved,
                raw: g
            });
        });
    }

    // Flashcards
    if (currentCollection === 'all' || currentCollection === 'flashcards') {
        currentState.flashcards.forEach(f => {
            itemsToRender.push({
                type: 'Flashcard',
                title: f.question,
                content: f.answer,
                meta: [
                    { icon: 'graduation-cap', text: f.subject },
                    // Fix: interval is serialized as srs_interval, handle 0
                    { icon: 'refresh-ccw', text: `Interval: ${f.srs_interval ?? 0}d` }
                ],
                raw: f
            });
        });
    }

    // Sort by type then title
    itemsToRender.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));

    // Apply search filter
    if (searchQuery) {
        itemsToRender = itemsToRender.filter(item => 
            item.title.toLowerCase().includes(searchQuery) || 
            item.content.toLowerCase().includes(searchQuery) ||
            item.type.toLowerCase().includes(searchQuery)
        );
    }

    if (itemsToRender.length === 0) {
        dataContainer.innerHTML = '<div class="loading-msg">No data found matching your criteria.</div>';
        return;
    }

    itemsToRender.forEach(item => {
        const card = document.createElement('div');
        card.className = 'data-card' + (item.isCompleted ? ' completed' : '');
        
        const metaHtml = item.meta.map(m => `
            <div class="meta-item">
                <i data-lucide="${m.icon}"></i>
                <span>${m.text}</span>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="card-type">${item.type}</div>
            <div class="card-title">${item.title}</div>
            <div class="card-content">${item.content}</div>
            <div class="card-meta">
                ${metaHtml}
            </div>
        `;
        dataContainer.appendChild(card);
    });

    lucide.createIcons();
}

window.addEventListener('DOMContentLoaded', init);
