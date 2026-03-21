import './style.css'
import { Api } from './api.ts'
import type { Task, SchoolNote, SchoolGrade, SwimSession, SwimGala, QualifyingTime, SchoolFlashcard } from './api.ts'

// Constants
const SUBJECTS = [
    'Mathematics', 'English', 'Afrikaans', 'Physics', 
    'AP Math', 'EGD', 'Geography', 'Life Orientation', 
    'Information Technologies'
];

interface AppState {
    tasks: Task[];
    notes: SchoolNote[];
    grades: SchoolGrade[];
    swims: SwimSession[];
    galas: SwimGala[];
    qts: QualifyingTime[];
    flashcards: SchoolFlashcard[];
    searchQuery: string;
}

const state: AppState = {
    tasks: [],
    notes: [],
    grades: [],
    swims: [],
    galas: [],
    qts: [],
    flashcards: [],
    searchQuery: ''
};

// Utils: Toast System
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
             type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
             'bg-blue-500/10 border-blue-500/20 text-blue-400';
  
  toast.className = `${bg} border backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 translate-x-[-20px] opacity-0 pointer-events-auto cursor-pointer`;
  toast.innerHTML = `
    <div class="w-2 h-2 rounded-full ${type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}"></div>
    <span class="text-sm font-bold">${message}</span>
  `;

  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);

  const remove = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  };

  toast.onclick = remove;
  setTimeout(remove, 4000);
}

async function init() {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return;

  // Initial UI Setup
  app.innerHTML = `
    <div class="min-h-screen bg-slate-900 text-slate-200 font-sans pb-28 md:pb-24">
      <!-- Sticky Header -->
      <header class="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-3 md:p-4 shadow-xl">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-3 md:mb-4">
            <h1 class="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
              STUDENT OS
            </h1>
            <div class="flex items-center gap-2 md:gap-3">
              <button id="refresh-btn" class="p-2 text-slate-500 hover:text-blue-400 transition-colors bg-slate-800/50 rounded-lg md:bg-transparent" title="Sync Data">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              </button>
              <div id="connection-status" class="px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase border border-slate-700 bg-slate-800/50 text-slate-500">
                Checking...
              </div>
            </div>
          </div>
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input 
              type="text" 
              id="search-input" 
              placeholder="Search everything..." 
              class="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl py-2 md:py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm md:text-base placeholder:text-slate-600 shadow-inner"
            >
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-4xl mx-auto p-3 md:p-6">
        <div id="data-list" class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
           <!-- Loading skeleton -->
           <div class="animate-pulse space-y-4 col-span-full">
              <div class="h-24 bg-slate-800/30 rounded-2xl"></div>
              <div class="h-24 bg-slate-800/30 rounded-2xl"></div>
              <div class="h-24 bg-slate-800/30 rounded-2xl"></div>
           </div>
        </div>
      </main>

      <!-- Toast Container -->
      <div id="toast-container" class="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-50 flex flex-col items-center md:items-start gap-2 pointer-events-none w-full max-w-[90vw] md:max-w-md"></div>

      <!-- FAB -->
      <button id="add-btn" class="fixed bottom-6 right-6 w-16 h-16 md:w-14 md:h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-30">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" md:width="28" md:height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      </button>

      <!-- Modal Container -->
      <div id="modal-overlay" class="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 hidden items-center justify-center p-0 md:p-4">
        <div class="bg-slate-900 border-none md:border md:border-slate-800 w-full md:max-w-lg h-full md:h-auto md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div class="p-5 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
            <h2 class="text-xl font-black uppercase tracking-tight text-slate-100">New Entry</h2>
            <button id="close-modal" class="text-slate-500 hover:text-white p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="p-6 overflow-y-auto space-y-4">
            <div class="space-y-1" id="type-selection-container">
              <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Entry Type</label>
              <select id="entry-type" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="school_notes">Note</option>
                <option value="school_grades">Grade</option>
                <option value="tasks">School Task</option>
                <option value="habits">Habit</option>
                <option value="swim_sessions">Swim Session</option>
                <option value="swim_galas">Swim Gala</option>
                <option value="qualifying_times">Qualifying Time</option>
                <option value="flashcards">Flashcard</option>
              </select>
            </div>
            
            <div class="space-y-1" id="title-container">
              <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Title</label>
              <input type="text" id="entry-title" placeholder="What's this about?" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
            </div>

            <div id="dynamic-fields" class="space-y-4">
              <!-- JS injected fields -->
            </div>
          </div>
          <div class="p-6 bg-slate-900 border-t border-slate-800 flex gap-3 mt-auto md:mt-0 pb-10 md:pb-6">
            <button id="cancel-modal" class="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 md:bg-transparent rounded-xl">Cancel</button>
            <button id="save-btn" class="flex-[2] bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-3 md:py-2 text-sm font-black uppercase tracking-wide shadow-lg shadow-blue-600/30 transition-all">Create Entry</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div id="delete-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 hidden items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-6">
          <h2 class="text-xl font-bold mb-2">Confirm Deletion</h2>
          <p class="text-sm text-slate-400 mb-6">Are you sure you want to delete this <span id="delete-item-type" class="text-blue-400 font-bold italic">item</span>? This action cannot be undone.</p>
          <div class="flex gap-3">
            <button id="cancel-delete-btn" class="flex-1 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button id="confirm-delete-btn" class="flex-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-lg shadow-red-500/20 transition-all">Delete Forever</button>
          </div>
        </div>
      </div>
    </div>
  `

  const listEl = document.getElementById('data-list') as HTMLElement;
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const statusEl = document.getElementById('connection-status') as HTMLElement;
  const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
  const addBtn = document.getElementById('add-btn') as HTMLButtonElement;
  const modalOverlay = document.getElementById('modal-overlay') as HTMLElement;
  const closeModalBtn = document.getElementById('close-modal') as HTMLButtonElement;
  const cancelModalBtn = document.getElementById('cancel-modal') as HTMLButtonElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const entryTypeSelect = document.getElementById('entry-type') as HTMLSelectElement;
  const dynamicFields = document.getElementById('dynamic-fields') as HTMLElement;
  const typeSelectionContainer = document.getElementById('type-selection-container') as HTMLElement;
  const deleteModal = document.getElementById('delete-modal') as HTMLElement;
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn') as HTMLButtonElement;
  const deleteItemTypeSpan = document.getElementById('delete-item-type') as HTMLElement;

  let deleteId: string | null = null;
  let deleteCol: string | null = null;

  // -- Render Logic --

  let editingRecordId: string | null = null;
  let editingCollection: string | null = null;

  const getCollectionKey = (col: string) => {
    if (col === 'tasks' || col === 'habits') return 'tasks';
    if (col === 'school_notes') return 'notes';
    if (col === 'school_grades') return 'grades';
    if (col === 'swim_sessions') return 'swims';
    if (col === 'swim_galas') return 'galas';
    if (col === 'qualifying_times') return 'qts';
    return 'flashcards';
  };

  const render = () => {
    console.log("Rendering UI with query:", state.searchQuery);
    const query = state.searchQuery.toLowerCase();
    
    const items: { html: string, weight: number, title: string, content: string }[] = [];

    const getActionBtns = (id: string, col: string) => `
        <div class="absolute top-3 right-3 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
          <button class="p-2 rounded-xl bg-slate-900/90 border border-slate-700/50 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all shadow-md active:scale-90" data-action="edit" data-id="${id}" data-col="${col}" title="Edit">
            <svg class="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
          </button>
          <button class="p-2 rounded-xl bg-slate-900/90 border border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/50 transition-all shadow-md active:scale-90" data-action="delete" data-id="${id}" data-col="${col}" title="Delete">
            <svg class="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
    `;

    // Helper to check if item matches search
    const matches = (title: string, content: string = "") => {
      if (!query) return true;
      return title.toLowerCase().includes(query) || content.toLowerCase().includes(query);
    }

    // Notes
    state.notes.forEach(n => {
      if (matches(n.title, n.content + n.subject)) {
        items.push({
          weight: 1,
          title: n.title,
          content: n.content,
          html: `
            <div class="p-5 bg-blue-900/10 border border-blue-500/20 rounded-2xl group hover:border-blue-500/40 transition-all relative">
              ${getActionBtns(n.id, 'school_notes')}
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-blue-400">Note • ${n.subject}</span>
                <span class="text-[10px] text-slate-500 pr-20 md:pr-14">${new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 class="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors">${n.title}</h3>
              <p class="text-sm text-slate-400 line-clamp-3 mt-2 font-serif">${n.content}</p>
            </div>
          `
        });
      }
    });

    // Tasks & Habits
    state.tasks.forEach(t => {
      const isHabit = t.taskType === 'task';
      if (matches(t.title, (t.subject || ""))) {
        let isCompleted = t.isCompleted;
        if (isHabit && t.completedDates) {
          try {
            const dates = typeof t.completedDates === 'string' ? JSON.parse(t.completedDates) : t.completedDates;
            if (Array.isArray(dates)) {
              const today = new Date().toLocaleDateString('en-CA');
              isCompleted = dates.some(d => (typeof d === 'string' ? d : new Date(d).toISOString()).startsWith(today));
            }
          } catch (e) {}
        }

        items.push({
          weight: isHabit ? 0 : 2,
          title: t.title,
          content: t.subject || "",
          html: `
            <div data-task-id="${t.id}" class="cursor-pointer p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl relative overflow-hidden group hover:border-slate-500 transition-all active:scale-[0.98]">
               ${getActionBtns(t.id, t.taskType === 'task' ? 'habits' : 'tasks')}
               ${isHabit ? `<div class="absolute top-0 right-0 px-2 py-1 bg-emerald-500 text-[8px] font-black text-slate-900 uppercase">Habit</div>` : ''}
               <div class="flex justify-between items-start mb-2">
                 <span class="text-[10px] uppercase tracking-widest font-black ${isHabit ? 'text-emerald-400' : 'text-purple-400'}">
                   ${isHabit ? `🔥 ${t.streak ?? 0} Streak` : (t.schoolTaskType || 'Task')}
                 </span>
                 <span class="text-[10px] text-slate-500 ${isHabit ? 'pr-20 md:pr-14' : 'pr-0'}">${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Created ' + new Date(t.createdDate).toLocaleDateString()}</span>
               </div>
               <div class="flex items-center gap-3">
                 <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-500 text-transparent group-hover:border-blue-400 group-hover:text-blue-400/30'}">
                   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                 </div>
                 <h3 class="text-lg font-bold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}">${t.title}</h3>
               </div>
               ${t.subject ? `<p class="text-xs text-slate-500 mt-2 pl-8">${t.subject}</p>` : ''}
            </div>
          `
        });
      }
    });

    // Grades
    state.grades.forEach(g => {
      if (matches(g.title, g.subject)) {
        items.push({
          weight: 3,
          title: g.title,
          content: g.subject,
          html: `
            <div class="p-5 bg-amber-900/10 border border-amber-500/20 rounded-2xl group hover:border-amber-500/40 transition-all relative">
              ${getActionBtns(g.id, 'school_grades')}
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-amber-400">Grade • ${g.subject}</span>
                <span class="text-[10px] text-slate-500">${g.cycle}</span>
              </div>
              <div class="flex justify-between items-center">
                 <h3 class="text-lg font-bold text-slate-100">${g.title}</h3>
                 <div class="text-2xl font-black text-amber-500 pr-16">${Math.round((g.score/g.total)*100)}%</div>
              </div>
              <div class="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full" style="width: ${(g.score/g.total)*100}%"></div>
              </div>
            </div>
          `
        });
      }
    });

    // Swims
    state.swims.forEach(s => {
      if (matches(s.distance + "m " + s.stroke, s.notes)) {
        items.push({
          weight: 4,
          title: s.distance + "m " + s.stroke,
          content: s.notes,
          html: `
            <div class="p-5 bg-cyan-900/10 border border-cyan-500/20 rounded-2xl group hover:border-cyan-500/40 transition-all relative">
              ${getActionBtns(s.id, 'swim_sessions')}
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-cyan-400">Swim Session</span>
                <span class="text-[10px] text-slate-500 pr-20 md:pr-14">${new Date(s.date).toLocaleDateString()}</span>
              </div>
              <h3 class="text-lg font-bold text-slate-100">${s.distance}m ${s.stroke}</h3>
              <div class="flex gap-4 mt-3">
                 <div class="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
                    <div class="text-[8px] uppercase text-slate-500 font-bold">Duration</div>
                    <div class="text-xs font-bold">${Math.floor(s.duration/60)}m ${s.duration%60}s</div>
                 </div>
                 <div class="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
                    <div class="text-[8px] uppercase text-slate-500 font-bold">Effort</div>
                    <div class="text-xs font-bold text-cyan-400">${s.effortLevel}/10</div>
                 </div>
              </div>
            </div>
          `
        });
      }
    });

    // Galas
    state.galas.forEach(g => {
      if (matches(g.name, g.location)) {
        items.push({
          weight: 4,
          title: g.name,
          content: g.location,
          html: `
            <div class="p-5 bg-sky-900/10 border border-sky-500/20 rounded-2xl group hover:border-sky-500/40 transition-all relative">
              ${getActionBtns(g.id, 'swim_galas')}
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-sky-400">Swim Gala</span>
                <span class="text-[10px] text-slate-500 pr-20 md:pr-14">${new Date(g.date).toLocaleDateString()}</span>
              </div>
              <h3 class="text-lg font-bold text-slate-100">${g.name}</h3>
              <div class="flex items-center gap-2 mt-2 text-slate-400 pr-16">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sky-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span class="text-xs font-bold">${g.location}</span>
                <span class="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded uppercase font-black ml-auto">${g.course}</span>
              </div>
            </div>
          `
        });
      }
    });

    // QTs
    state.qts.forEach(q => {
      if (matches(q.eventName, q.name)) {
        const timeStr = `${Math.floor(q.targetTime / 1000)}.${(q.targetTime % 1000).toString().padStart(3, '0').substring(0, 2)}s`;
        items.push({
          weight: 4,
          title: q.eventName,
          content: q.name,
          html: `
            <div class="p-5 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl group hover:border-indigo-500/40 transition-all relative overflow-hidden">
              ${getActionBtns(q.id, 'qualifying_times')}
              ${q.isAchieved ? `<div class="absolute top-0 right-0 px-2 py-1 bg-indigo-500 text-[8px] font-black text-slate-900 uppercase">Achieved</div>` : ''}
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-indigo-400">Qualifying Time</span>
                <span class="text-[10px] text-slate-500 uppercase font-black pr-20 md:pr-14">${q.course}</span>
              </div>
              <h3 class="text-lg font-bold text-slate-100">${q.eventName}</h3>
              <p class="text-sm font-black text-indigo-400 mt-1 uppercase tracking-tighter">Target: ${timeStr}</p>
            </div>
          `
        });
      }
    });

    // Flashcards
    state.flashcards.forEach(f => {
      if (matches(f.question, f.answer + f.subject)) {
        // Calculate days relative to due date
        let dueStr = '';
        try {
            const dueDays = Math.round((new Date(f.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (dueDays < 0) dueStr = `<span class="text-red-400 font-bold">Overdue ${Math.abs(dueDays)}d</span>`;
            else if (dueDays === 0) dueStr = `<span class="text-amber-400 font-bold">Due Today</span>`;
            else dueStr = `Due in ${dueDays}d`;
        } catch (e) { dueStr = 'Unknown due'; }

        items.push({
          weight: 5,
          title: f.question,
          content: f.answer,
          html: `
            <div class="p-5 bg-violet-900/10 border border-violet-500/20 rounded-2xl group hover:border-violet-500/40 transition-all relative">
              ${getActionBtns(f.id, 'flashcards')}
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-violet-400">Flashcard • ${f.subject}</span>
                <span class="text-[10px] text-slate-500 pr-20 md:pr-14">
                   Int: ${Math.round(f.interval)}d • ${dueStr}
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-100 italic">"${f.question}"</h3>
              
              <!-- Review UI -->
              <div class="mt-4 border border-violet-500/30 rounded-xl overflow-hidden" data-flashcard-container="${f.id}">
                  <div class="p-3 bg-violet-500/10 text-sm text-slate-300 blur-sm transition-all cursor-pointer hover:blur-none" onclick="this.classList.remove('blur-sm'); this.nextElementSibling.classList.remove('hidden');" title="Click to reveal">
                    <span class="text-[10px] block font-black text-violet-400 mb-1 uppercase tracking-tighter">Answer</span>
                    ${f.answer}
                  </div>
                  <div class="hidden bg-slate-900 border-t border-violet-500/20 p-2 flex gap-2">
                      <button class="flex-1 text-[10px] py-2 bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-all uppercase" data-action="review" data-id="${f.id}" data-rating="1">Again</button>
                      <button class="flex-1 text-[10px] py-2 bg-amber-900/30 text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg font-bold transition-all uppercase" data-action="review" data-id="${f.id}" data-rating="2">Hard</button>
                      <button class="flex-1 text-[10px] py-2 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg font-bold transition-all uppercase" data-action="review" data-id="${f.id}" data-rating="3">Good</button>
                      <button class="flex-1 text-[10px] py-2 bg-blue-900/30 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg font-bold transition-all uppercase" data-action="review" data-id="${f.id}" data-rating="4">Easy</button>
                  </div>
              </div>
            </div>
          `
        });
      }
    });

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="py-20 flex flex-col items-center justify-center text-center opacity-50">
           <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
           <p class="text-lg">No matches found for "${query}"</p>
           <p class="text-sm">Try a different search or create something new.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = items
        .sort((a, b) => a.weight - b.weight || a.title.localeCompare(b.title))
        .map(i => i.html)
        .join('');
    }
  }

  const fetchData = async () => {
    try {
      const [tasks, notes, grades, swims, galas, qts, flashcards] = await Promise.all([
        Api.getTasks(),
        Api.getNotes(),
        Api.getGrades(),
        Api.getSwimSessions(),
        Api.getSwimGalas(),
        Api.getQualifyingTimes(),
        Api.getFlashcards()
      ]);
      state.tasks = tasks;
      state.notes = notes;
      state.grades = grades;
      state.swims = swims;
      state.galas = galas;
      state.qts = qts;
      state.flashcards = flashcards;
      render();
    } catch (e) {
      console.error("Fetch failed", e);
    }
  }

  // -- Modal Logic --

  const updateModalFields = () => {
    const type = entryTypeSelect.value;
    
    // Find current item if editing
    let item: any = null;
    if (editingRecordId && editingCollection) {
        const listKey = editingCollection === 'habits' ? 'tasks' : editingCollection;
        item = (state as any)[listKey]?.find((x: any) => x.id === editingRecordId);
    }
    
    // Toggle Title Visibility
    const titleContainer = document.getElementById('title-container');
    if (titleContainer) {
        if (type === 'swim_sessions' || type === 'flashcards') {
            titleContainer.classList.add('hidden');
        } else {
            titleContainer.classList.remove('hidden');
        }
    }

    let html = '';
    const subOptions = SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('');

    if (type === 'school_notes') {
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Subject</label>
                <select id="entry-subject" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">${subOptions}</select>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Content</label>
                <textarea id="entry-content" rows="4" placeholder="Your note here..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"></textarea>
            </div>
        `;
    } else if (type === 'school_grades') {
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Subject</label>
                <select id="entry-subject" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">${subOptions}</select>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Score</label>
                    <input type="number" id="entry-score" placeholder="15" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Total</label>
                    <input type="number" id="entry-total" placeholder="20" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Cycle</label>
                    <select id="entry-cycle" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value="Cycle 1">Cycle 1</option><option value="Cycle 2">Cycle 2</option><option value="Cycle 3">Cycle 3</option>
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Category</label>
                    <select id="entry-category" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value="CASS">CASS</option><option value="Summative">Summative</option>
                    </select>
                </div>
            </div>
        `;
    } else if (type === 'tasks') {
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Subject</label>
                <select id="entry-subject" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">${subOptions}</select>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Due Date</label>
                <input type="date" id="entry-due-date" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Task Type</label>
                <select id="entry-task-type" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="assignment">Assignment</option><option value="exam">Exam</option><option value="classTest">Class Test</option>
                </select>
            </div>
        `;
    } else if (type === 'habits') {
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Frequency</label>
                <select id="entry-frequency" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option>
                </select>
            </div>
        `;
    } else if (type === 'swim_sessions') {
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Date</label>
                <input type="date" id="entry-date" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Distance (m)</label>
                    <input type="number" id="entry-distance" placeholder="2500" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Stroke</label>
                    <select id="entry-stroke" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value="Mixed">Mixed</option><option value="Freestyle">Freestyle</option><option value="Breaststroke">Breaststroke</option><option value="Backstroke">Backstroke</option><option value="Butterfly">Butterfly</option><option value="IM">IM</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Duration (sec)</label>
                    <input type="number" id="entry-duration" placeholder="3600" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Pool Length</label>
                    <select id="entry-pool-length" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value="25">25m</option><option value="50">50m</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Average Heart Rate(Bpm)</label>
                    <input type="number" id="entry-avg-heart-rate" placeholder="90" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Max Heart Rate (Bpm)</label>
                    <input type="number" id="entry-max-heart-rate" placeholder="140" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                </div>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Effort (1-10)</label>
                <input type="range" id="entry-effort" min="1" max="10" step="1" value="5" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600">
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Notes</label>
                <textarea id="entry-notes" rows="2" placeholder="How did it feel?" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"></textarea>
            </div>
        `;
    } else if (type === 'swim_galas') {
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Date</label>
                <input type="date" id="entry-date" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Location</label>
                <input type="text" id="entry-location" placeholder="Kings Park, Durban" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Course</label>
                <select id="entry-course" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="lcm">LCM (50m)</option><option value="scm">SCM (25m)</option><option value="scy">SCY (25y)</option>
                </select>
            </div>
        `;
    } else if (type === 'qualifying_times') {
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Event Name</label>
                <input type="text" id="entry-event-name" placeholder="50m Freestyle" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Target Time (sec)</label>
                    <input type="number" step="0.01" id="entry-target-time" placeholder="28.50" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Course</label>
                    <select id="entry-course" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value="lcm">LCM (50m)</option><option value="scm">SCM (25m)</option>
                    </select>
                </div>
            </div>
        `;
    } else if (type === 'flashcards') {
        const subOptions = SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('');
        const currentSub = item ? item.subject : SUBJECTS[0];
        const itemNoteId = item?.linkedNoteIds?.[0] || "";
        const noteOptions = state.notes
            .filter(n => n.subject === currentSub)
            .map(n => `<option value="${n.id}" ${itemNoteId === n.id ? 'selected' : ''}>${n.title}</option>`)
            .join('');

        console.log(`[UI] Populating Flashcard Modal: ${state.notes.length} total notes.`);
        html = `
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Subject</label>
                <select id="entry-subject" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">${subOptions}</select>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Link to Note</label>
                <select id="entry-note-id" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">No Note Linked</option>
                    ${noteOptions}
                </select>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Question</label>
                <textarea id="entry-question" rows="2" placeholder="The question..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"></textarea>
            </div>
            <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Answer</label>
                <textarea id="entry-answer" rows="2" placeholder="The answer..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"></textarea>
            </div>
        `;
    }

    dynamicFields.innerHTML = html;

    // Attach dynamic listeners for flashcards
    if (type === 'flashcards') {
        const subjSelect = document.getElementById('entry-subject') as HTMLSelectElement;
        const noteSelect = document.getElementById('entry-note-id') as HTMLSelectElement;
        if (subjSelect && noteSelect) {
            subjSelect.addEventListener('change', () => {
                const s = subjSelect.value;
                const filtered = state.notes.filter(n => n.subject === s);
                noteSelect.innerHTML = '<option value="">No Note Linked</option>' + 
                    filtered.map(n => `<option value="${n.id}">${n.title}</option>`).join('');
            });
            if (item) subjSelect.value = item.subject;
        }
    }
  }

  const handleSave = async () => {
    const type = entryTypeSelect.value;
    const title = (document.getElementById('entry-title') as HTMLInputElement).value.trim();
    
    // Global Validation
    if (type !== 'swim_sessions' && type !== 'flashcards' && !title) {
        return showToast("Please enter a title", 'error');
    }

    const userId = "LRA8iDK1iBUKGCdVIOff7CjVhxT2";
    const collection = type === 'habits' ? 'tasks' : type;
    
    if (type === 'flashcards') {
        const q = (document.getElementById('entry-question') as HTMLTextAreaElement).value.trim();
        const a = (document.getElementById('entry-answer') as HTMLTextAreaElement).value.trim();
        if (!q || !a) return showToast("Flashcards require both a question and an answer.", 'error');
    }
    


    // Attempt to clone existing record if editing mode
    let baseRecord: any;
    if (editingRecordId && editingCollection) {
        const listKey = getCollectionKey(editingCollection);
        baseRecord = (state as any)[listKey]?.find((x: any) => x.id === editingRecordId);
    }

    let record: any = baseRecord ? { ...baseRecord } : { id: "", userId };
    
    if (type !== 'swim_sessions' && type !== 'flashcards') {
        record.title = title;
        if (type === 'swim_galas' || type === 'qualifying_times') record.name = title;
    }

    try {
        if (type === 'school_notes') {
            record.subject = (document.getElementById('entry-subject') as HTMLSelectElement).value;
            record.content = (document.getElementById('entry-content') as HTMLTextAreaElement).value.trim();
            record.createdAt = record.createdAt || new Date().toISOString();
        } else if (type === 'school_grades') {
            const score = parseFloat((document.getElementById('entry-score') as HTMLInputElement).value);
            const total = parseFloat((document.getElementById('entry-total') as HTMLInputElement).value);
            if (isNaN(score) || isNaN(total)) return showToast("Please enter a valid score and total.", 'error');
            if (total === 0) return showToast("Total cannot be zero.", 'error');

            record.subject = (document.getElementById('entry-subject') as HTMLSelectElement).value;
            record.score = score;
            record.total = total;
            record.cycle = (document.getElementById('entry-cycle') as HTMLSelectElement).value;
            record.category = (document.getElementById('entry-category') as HTMLSelectElement).value;
            record.date = record.date || new Date().toISOString();
            record.schoolYear = record.schoolYear || 2026;
        } else if (type === 'tasks') {
            const dueDate = (document.getElementById('entry-due-date') as HTMLInputElement).value;
            if (!dueDate && !baseRecord) return showToast("Please select a due date.", 'error');

            record.taskType = 'school';
            record.subject = (document.getElementById('entry-subject') as HTMLSelectElement).value;
            record.dueDate = dueDate ? dueDate + "T00:00:00.000" : record.dueDate;
            record.schoolTaskType = (document.getElementById('entry-task-type') as HTMLSelectElement).value;
            if (!baseRecord) {
                record.isCompleted = false;
                record.createdDate = new Date().toISOString();
                record.reminderEnabled = false;
            }
        } else if (type === 'habits') {
            record.taskType = 'task';
            record.frequency = (document.getElementById('entry-frequency') as HTMLSelectElement).value;
            if (!baseRecord) {
                record.streak = 0;
                record.isCompleted = false;
                record.createdDate = new Date().toISOString();
                record.reminderEnabled = false;
            }
        } else if (type === 'swim_sessions') {
            const dist = parseFloat((document.getElementById('entry-distance') as HTMLInputElement).value);
            const dur = parseInt((document.getElementById('entry-duration') as HTMLInputElement).value);
            if (dist <= 0 || dur <= 0) return showToast("Distance and duration must be positive", 'error');

            const dateVal = (document.getElementById('entry-date') as HTMLInputElement).value;
            record.date = dateVal.includes('T') ? dateVal : dateVal + "T12:00:00.000000";
            record.distance = dist;
            record.duration = dur;
            record.stroke = (document.getElementById('entry-stroke') as HTMLSelectElement).value;
            record.effortLevel = parseInt((document.getElementById('entry-effort') as HTMLInputElement).value) || 5;
            record.poolLength = parseFloat((document.getElementById('entry-pool-length') as HTMLSelectElement).value) || 25;
            record.notes = (document.getElementById('entry-notes') as HTMLTextAreaElement).value.trim();
            record.sets = record.sets || "[]";
            record.workoutEffect = record.workoutEffect || "Training";
            record.heartRateAvg = parseInt((document.getElementById('entry-avg-heart-rate') as HTMLInputElement).value) || record.heartRateAvg || 0;
            record.heartRateMax = parseInt((document.getElementById('entry-max-heart-rate') as HTMLInputElement).value) || record.heartRateMax || 0;
        } else if (type === 'swim_galas') {
            const dateVal = (document.getElementById('entry-date') as HTMLInputElement).value;
            record.date = dateVal.includes('T') ? dateVal : dateVal + "T12:00:00.000000";
            record.location = (document.getElementById('entry-location') as HTMLInputElement).value.trim() || "Unknown";
            record.course = (document.getElementById('entry-course') as HTMLSelectElement).value;
            record.events = record.events || "[]";
        } else if (type === 'qualifying_times') {
            const target = parseFloat((document.getElementById('entry-target-time') as HTMLInputElement).value);
            if (target <= 0) return showToast("Target time must be positive", 'error');

            record.eventName = (document.getElementById('entry-event-name') as HTMLInputElement).value.trim() || title;
            record.targetTime = Math.floor(target * 1000);
            record.course = (document.getElementById('entry-course') as HTMLSelectElement).value;
            record.isAchieved = record.isAchieved || false;
        } else if (type === 'flashcards') {
            record.subject = (document.getElementById('entry-subject') as HTMLSelectElement).value;
            const noteIdStr = (document.getElementById('entry-note-id') as HTMLSelectElement).value;
            if (noteIdStr) {
                record.linkedNoteIds = [noteIdStr];
            } else {
                record.linkedNoteIds = null;
            }
            record.question = (document.getElementById('entry-question') as HTMLTextAreaElement).value;
            record.answer = (document.getElementById('entry-answer') as HTMLTextAreaElement).value;
            
            // FSRS Fields config
            if (!baseRecord) {
                record.stability = 0.0;
                record.difficulty = 0.0;
                record.interval = 0.0;
                record.lapses = 0;
                record.due = new Date().toISOString();
                record.createdAt = new Date().toISOString();
            }
            // Remove old fields if they exist
            delete record.noteId;
            delete record.easeFactor;
            delete record.repetitions;
            delete record.nextReview;
            delete record.srs_interval;
        }
        record.createdAt = record.createdAt || new Date().toISOString().replace('Z', '000');
        

        saveBtn.disabled = true;
        saveBtn.innerText = editingRecordId ? "Updating..." : "Saving...";
        
        if (editingRecordId) {
            await Api.updateRecord(collection, record);
            showToast("Entry updated successfully", 'success');
        } else {
            await Api.createRecord(collection, record);
            showToast("Entry created successfully", 'success');
        }
        
        modalOverlay.classList.add('hidden');
        (document.getElementById('entry-title') as HTMLInputElement).value = '';
        editingRecordId = null;
        editingCollection = null;
        document.querySelector('h2')!.innerText = "New Entry";
        saveBtn.innerText = "Create Entry";
        
        await fetchData();
    } catch (e) {
        showToast("Save failed: " + e, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = editingRecordId ? "Update Entry" : "Create Entry";
    }
  }

  // -- Event Listeners --

  searchInput.oninput = (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    render();
  };

  listEl.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    
    // Check if Edit/Delete action button clicked First
    const actionBtn = target.closest('[data-action]');
    if (actionBtn) {
       e.stopPropagation();
       const action = actionBtn.getAttribute('data-action');
       const id = actionBtn.getAttribute('data-id');
       const col = actionBtn.getAttribute('data-col');
       
       console.log(`[UI] Action: ${action}, ID: ${id}, Original Col: ${col}`);
       
       if (!id || !col) return;
              if (action === 'delete') {
           deleteId = id;
           deleteCol = col;
           deleteItemTypeSpan.innerText = col.replace('school_', '').replace('_', ' ');
           deleteModal.classList.remove('hidden');
           deleteModal.classList.add('flex');
           return;
       } else if (action === 'review') {
           const rating = parseInt(actionBtn.getAttribute('data-rating') || '1');
           actionBtn.setAttribute('disabled', 'true');
           try {
               await Api.reviewFlashcard(id, rating, 0.9);
               showToast("Card reviewed!", 'success');
               await fetchData();
           } catch (e) {
               showToast("Review failed: " + e, 'error');
               actionBtn.removeAttribute('disabled');
           }
           return;
       } else if (action === 'edit') {
           editingRecordId = id;
           editingCollection = col;
           // Determine the corresponding UI type correctly
           const isHabit = col === 'tasks' && state.tasks.find(t => t.id === id)?.taskType === 'task';
           const typeStr = isHabit ? 'habits' : col;
           
           entryTypeSelect.value = typeStr;
           typeSelectionContainer.classList.add('hidden'); // Hide type selector when editing
           updateModalFields();
           
           // Fetch full base record
           const listKey = getCollectionKey(editingCollection);
           
           const item = (state as any)[listKey]?.find((x: any) => x.id === id);
           if (!item) return;

           // Helper utility safely inject value
           const setVal = (elmId: string, val: any) => {
               const el = document.getElementById(elmId);
               if (el) (el as any).value = val;
           }

           document.querySelector('h2')!.innerText = "Edit Entry";
           saveBtn.innerText = "Update Entry";
           entryTypeSelect.disabled = true; // Prevent morphing object schemas
           setVal('entry-title', item.title || item.name || item.eventName || "");
           
           if (typeStr === 'school_notes') {
               setVal('entry-subject', item.subject);
               setVal('entry-content', item.content);
           } else if (typeStr === 'school_grades') {
               setVal('entry-subject', item.subject);
               setVal('entry-score', item.score);
               setVal('entry-total', item.total);
               setVal('entry-cycle', item.cycle);
               setVal('entry-category', item.category);
           } else if (typeStr === 'tasks') {
               setVal('entry-subject', item.subject);
               if (item.dueDate) setVal('entry-due-date', item.dueDate.split('T')[0]);
               setVal('entry-task-type', item.schoolTaskType);
           } else if (typeStr === 'habits') {
               setVal('entry-frequency', item.frequency);
           } else if (typeStr === 'swim_sessions') {
               if (item.date) setVal('entry-date', item.date.split('T')[0]);
               setVal('entry-distance', item.distance);
               setVal('entry-stroke', item.stroke);
               setVal('entry-duration', item.duration);
               setVal('entry-pool-length', item.poolLength);
               setVal('entry-avg-heart-rate', item.heartRateAvg);
               setVal('entry-max-heart-rate', item.heartRateMax);
               setVal('entry-effort', item.effortLevel);
               setVal('entry-notes', item.notes);
           } else if (typeStr === 'swim_galas') {
               if (item.date) setVal('entry-date', item.date.split('T')[0]);
               setVal('entry-location', item.location);
               setVal('entry-course', item.course);
           } else if (typeStr === 'qualifying_times') {
               setVal('entry-event-name', item.eventName);
                setVal('entry-target-time', parseFloat((item.targetTime / 1000).toFixed(2)));
                setVal('entry-course', item.course);
            } else if (typeStr === 'flashcards') {
                setVal('entry-subject', item.subject);
                setVal('entry-note-id', item.noteId);
                setVal('entry-question', item.question);
                setVal('entry-answer', item.answer);
            }
           
           modalOverlay.classList.remove('hidden');
           modalOverlay.classList.add('flex');
           return;
       }
    }

    // Toggle Task Complete Status Logic
    const taskEl = target.closest('[data-task-id]');
    if (taskEl) {
      const taskId = taskEl.getAttribute('data-task-id');
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        if (task.taskType === 'task') {
          let dates: string[] = [];
          if (task.completedDates) {
            try { 
                const parsed = typeof task.completedDates === 'string' ? JSON.parse(task.completedDates) : task.completedDates;
                if (Array.isArray(parsed)) dates = parsed;
            } catch(err) {}
          }
          const today = new Date().toLocaleDateString('en-CA');
          let isCompletedToday = dates.some(d => (typeof d === 'string' ? d : new Date(d).toISOString()).startsWith(today));
          
          if (isCompletedToday) {
             dates = dates.filter(d => !(typeof d === 'string' ? d : new Date(d).toISOString()).startsWith(today));
             task.streak = Math.max(0, (task.streak || 1) - 1);
          } else {
             dates.push(new Date().toISOString());
             task.streak = (task.streak || 0) + 1;
          }
          task.completedDates = JSON.stringify(dates);
        } else {
           task.isCompleted = !task.isCompleted;
        }
        
        // Optimistic UI update
        render();
        
        try {
            await Api.updateRecord('tasks', task);
        } catch (error) {
            console.error("Failed to toggle task", error);
            showToast("Habit sync error: " + error, 'error');
            // Revert changes on failure by refetching
            await fetchData();
        }
      }
    }
  });

  addBtn.onclick = () => {
    editingRecordId = null;
    editingCollection = null;
    entryTypeSelect.disabled = false; // Re-enable for new entries
    (document.getElementById('entry-title') as HTMLInputElement).value = '';
    document.querySelector('h2')!.innerText = "New Entry";
    saveBtn.innerText = "Create Entry";
    
    typeSelectionContainer.classList.remove('hidden'); // Show type selector for new entries
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
    updateModalFields();
  };

  const close = () => {
    editingRecordId = null;
    editingCollection = null;
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('flex');
  };

  closeModalBtn.onclick = close;
  cancelModalBtn.onclick = close;
  entryTypeSelect.onchange = updateModalFields;
  saveBtn.onclick = handleSave;

  const closeDeleteModal = () => {
    deleteId = null;
    deleteCol = null;
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
  };

  cancelDeleteBtn.onclick = closeDeleteModal;

  confirmDeleteBtn.onclick = async () => {
    if (!deleteId || !deleteCol) return;
    
    try {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerText = "Deleting...";
        
        const apiCol = deleteCol === 'habits' ? 'tasks' : deleteCol;
        console.log(`[UI] Modal Confirm: Deleting ${deleteId} from ${apiCol}`);
        
        await Api.deleteRecord(apiCol, deleteId);
        console.log(`[UI] Modal Confirm: Deletion success`);
        
        closeDeleteModal();
        await fetchData();
    } catch (err) {
        console.error("[UI] Delete failed:", err);
        showToast("Failed to delete record: " + err, 'error');
    } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.innerText = "Delete Forever";
    }
  };

  refreshBtn.onclick = async () => {
    refreshBtn.classList.add('animate-spin');
    try {
        await Api.refreshData();
        await fetchData();
        showToast("Cloud sync complete", 'success');
    } catch (e) {
        showToast("Sync failed: " + e, 'error');
    } finally {
        refreshBtn.classList.remove('animate-spin');
    }
  };

  // -- Connection Status --

  const updateConnection = (isOffline: boolean) => {
    statusEl.textContent = isOffline ? 'OFFLINE' : 'ONLINE';
    statusEl.className = `px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-colors ${
      isOffline ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-green-500/10 border-green-500/20 text-green-500'
    }`;
  }

  const isOffline = await Api.getConnectionStatus();
  updateConnection(isOffline);
  Api.onConnectionChange((isOffline) => {
    updateConnection(isOffline); 
    if (!isOffline) showToast("System Online", 'success');
    else showToast("System Offline", 'info');
  });

  Api.onSyncStatusChange((status) => {
    if (status === 'complete') showToast("Background sync complete", 'success');
    else if (status === 'error') showToast("Background sync failed", 'error');
    else if (status === 'syncing') console.log("[Sync] Background sync in progress...");
  });

  Api.onDataChanged(() => {
    console.log("[Data] Remote changes detected, refreshing...");
    fetchData();
  });

  // Initial Fetch
  await fetchData();
}

init();
