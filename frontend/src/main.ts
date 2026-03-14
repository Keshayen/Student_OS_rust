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

async function init() {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return;

  // Initial UI Setup
  app.innerHTML = `
    <div class="min-h-screen bg-slate-900 text-slate-200 font-sans pb-24">
      <!-- Sticky Header -->
      <header class="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Student OS
            </h1>
            <div class="flex items-center gap-3">
              <button id="refresh-btn" class="p-2 text-slate-500 hover:text-blue-400 transition-colors" title="Sync Data">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              </button>
              <div id="connection-status" class="px-3 py-1 rounded-full text-[10px] font-black uppercase border border-slate-800 bg-slate-800/50 text-slate-500">
                Checking...
              </div>
            </div>
          </div>
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input 
              type="text" 
              id="search-input" 
              placeholder="Search your life..." 
              class="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
            >
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-4xl mx-auto p-4 mt-4">
        <div id="data-list" class="space-y-4">
           <!-- Loading skeleton -->
           <div class="animate-pulse space-y-4">
              <div class="h-24 bg-slate-800/30 rounded-2xl"></div>
              <div class="h-24 bg-slate-800/30 rounded-2xl"></div>
              <div class="h-24 bg-slate-800/30 rounded-2xl"></div>
           </div>
        </div>
      </main>

      <!-- FAB -->
      <button id="add-btn" class="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-500/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      </button>

      <!-- Modal Container -->
      <div id="modal-overlay" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 hidden items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div class="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 class="text-xl font-bold">New Entry</h2>
            <button id="close-modal" class="text-slate-500 hover:text-white p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="p-6 overflow-y-auto space-y-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold uppercase text-slate-500 ml-1">Entry Type</label>
              <select id="entry-type" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="school_notes">Note</option>
                <option value="school_grades">Grade</option>
                <option value="tasks">School Task</option>
                <option value="habits">Habit</option>
                <option value="swim_sessions">Swim Session</option>
                <option value="swim_galas">Swim Gala</option>
                <option value="qualifying_times">Qualifying Time</option>
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
          <div class="p-6 bg-slate-800/30 border-t border-slate-800 flex gap-3">
            <button id="cancel-modal" class="flex-1 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button id="save-btn" class="flex-[2] bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">Create Entry</button>
          </div>
        </div>
      </div>
    </div>
  `

  const listEl = document.getElementById('data-list')!;
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const statusEl = document.getElementById('connection-status')!;
  const refreshBtn = document.getElementById('refresh-btn')!;
  const addBtn = document.getElementById('add-btn')!;
  const modalOverlay = document.getElementById('modal-overlay')!;
  const closeModalBtn = document.getElementById('close-modal')!;
  const cancelModalBtn = document.getElementById('cancel-modal')!;
  const saveBtn = document.getElementById('save-btn')!;
  const entryTypeSelect = document.getElementById('entry-type') as HTMLSelectElement;
  const dynamicFields = document.getElementById('dynamic-fields')!;

  // -- Render Logic --

  const render = () => {
    console.log("Rendering UI with query:", state.searchQuery);
    const query = state.searchQuery.toLowerCase();
    
    const items: { html: string, weight: number, title: string, content: string }[] = [];

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
            <div class="p-5 bg-blue-900/10 border border-blue-500/20 rounded-2xl group hover:border-blue-500/40 transition-all">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-blue-400">Note • ${n.subject}</span>
                <span class="text-[10px] text-slate-500">${new Date(n.createdAt).toLocaleDateString()}</span>
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
            <div class="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl relative overflow-hidden group hover:border-slate-600 transition-all">
               ${isHabit ? `<div class="absolute top-0 right-0 px-2 py-1 bg-emerald-500 text-[8px] font-black text-slate-900 uppercase">Habit</div>` : ''}
               <div class="flex justify-between items-start mb-2">
                 <span class="text-[10px] uppercase tracking-widest font-black ${isHabit ? 'text-emerald-400' : 'text-purple-400'}">
                   ${isHabit ? `🔥 ${t.streak ?? 0} Day Streak` : (t.schoolTaskType || 'School Task')}
                 </span>
                 <span class="text-[10px] text-slate-500">${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Created ' + new Date(t.createdDate).toLocaleDateString()}</span>
               </div>
               <h3 class="text-lg font-bold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}">${t.title}</h3>
               ${t.subject ? `<p class="text-xs text-slate-500 mt-2">${t.subject}</p>` : ''}
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
            <div class="p-5 bg-amber-900/10 border border-amber-500/20 rounded-2xl group hover:border-amber-500/40 transition-all">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-amber-400">Grade • ${g.subject}</span>
                <span class="text-[10px] text-slate-500">${g.cycle}</span>
              </div>
              <div class="flex justify-between items-center">
                 <h3 class="text-lg font-bold text-slate-100">${g.title}</h3>
                 <div class="text-2xl font-black text-amber-500">${Math.round((g.score/g.total)*100)}%</div>
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
            <div class="p-5 bg-cyan-900/10 border border-cyan-500/20 rounded-2xl group hover:border-cyan-500/40 transition-all">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-cyan-400">Swim Session</span>
                <span class="text-[10px] text-slate-500">${new Date(s.date).toLocaleDateString()}</span>
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
            <div class="p-5 bg-sky-900/10 border border-sky-500/20 rounded-2xl group hover:border-sky-500/40 transition-all">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-sky-400">Swim Gala</span>
                <span class="text-[10px] text-slate-500">${new Date(g.date).toLocaleDateString()}</span>
              </div>
              <h3 class="text-lg font-bold text-slate-100">${g.name}</h3>
              <div class="flex items-center gap-2 mt-2 text-slate-400">
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
              ${q.isAchieved ? `<div class="absolute top-0 right-0 px-2 py-1 bg-indigo-500 text-[8px] font-black text-slate-900 uppercase">Achieved</div>` : ''}
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-indigo-400">Qualifying Time</span>
                <span class="text-[10px] text-slate-500 uppercase font-black">${q.course}</span>
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
        items.push({
          weight: 5,
          title: f.question,
          content: f.answer,
          html: `
            <div class="p-5 bg-violet-900/10 border border-violet-500/20 rounded-2xl group hover:border-violet-500/40 transition-all">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] uppercase tracking-widest font-black text-violet-400">Flashcard • ${f.subject}</span>
                <span class="text-[10px] text-slate-500">Interval: ${f.srs_interval}d</span>
              </div>
              <h3 class="text-lg font-bold text-slate-100 italic">"${f.question}"</h3>
              <div class="mt-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-sm text-slate-300 blur-sm hover:blur-none transition-all cursor-help">
                <span class="text-[10px] block font-black text-violet-400 mb-1 uppercase tracking-tighter">Click to reveal answer</span>
                ${f.answer}
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
    
    // Toggle Title Visibility
    const titleContainer = document.getElementById('title-container');
    if (titleContainer) {
        if (type === 'swim_sessions') {
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
    }

    dynamicFields.innerHTML = html;
  }

  const handleSave = async () => {
    const type = entryTypeSelect.value;
    const title = (document.getElementById('entry-title') as HTMLInputElement).value;
    
    // Validation
    if (type !== 'swim_sessions' && !title) return alert("Please enter a title");

    const userId = "LRA8iDK1iBUKGCdVIOff7CjVhxT2";
    let record: any = { id: "", userId };
    if (type !== 'swim_sessions') {
        record.title = title;
    }

    try {
        if (type === 'school_notes') {
            record.subject = (document.getElementById('entry-subject') as HTMLSelectElement).value;
            record.content = (document.getElementById('entry-content') as HTMLTextAreaElement).value;
            record.createdAt = new Date().toISOString();
        } else if (type === 'school_grades') {
            record.subject = (document.getElementById('entry-subject') as HTMLSelectElement).value;
            record.score = parseFloat((document.getElementById('entry-score') as HTMLInputElement).value) || 0;
            record.total = parseFloat((document.getElementById('entry-total') as HTMLInputElement).value) || 100;
            record.cycle = (document.getElementById('entry-cycle') as HTMLSelectElement).value;
            record.category = (document.getElementById('entry-category') as HTMLSelectElement).value;
            record.date = new Date().toISOString();
            record.schoolYear = 2026;
        } else if (type === 'tasks') {
            record.taskType = 'school';
            record.subject = (document.getElementById('entry-subject') as HTMLSelectElement).value;
            record.dueDate = (document.getElementById('entry-due-date') as HTMLInputElement).value || new Date().toISOString();
            record.schoolTaskType = (document.getElementById('entry-task-type') as HTMLSelectElement).value;
            record.isCompleted = false;
            record.createdDate = new Date().toISOString();
            record.reminderEnabled = false;
        } else if (type === 'habits') {
            record.taskType = 'task';
            record.frequency = (document.getElementById('entry-frequency') as HTMLSelectElement).value;
            record.streak = 0;
            record.isCompleted = false;
            record.createdDate = new Date().toISOString();
            record.reminderEnabled = false;
        } else if (type === 'swim_sessions') {
            record.date = (document.getElementById('entry-date') as HTMLInputElement).value + "T12:00:00.000000";
            record.distance = parseFloat((document.getElementById('entry-distance') as HTMLInputElement).value) || 0;
            record.duration = parseInt((document.getElementById('entry-duration') as HTMLInputElement).value) || 0;
            record.stroke = (document.getElementById('entry-stroke') as HTMLSelectElement).value;
            record.effortLevel = parseInt((document.getElementById('entry-effort') as HTMLInputElement).value) || 5;
            record.poolLength = parseFloat((document.getElementById('entry-pool-length') as HTMLSelectElement).value) || 25;
            record.notes = (document.getElementById('entry-notes') as HTMLTextAreaElement).value || "";
            record.sets = "[]"; // Valid JSON string required by Rust
            record.workoutEffect = "Training";
            record.heartRateAvg = parseInt((document.getElementById('entry-avg-heart-rate') as HTMLInputElement).value) || 0;
            record.heartRateMax = parseInt((document.getElementById('entry-max-heart-rate') as HTMLInputElement).value) || 0;
        } else if (type === 'swim_galas') {
            record.date = (document.getElementById('entry-date') as HTMLInputElement).value + "T12:00:00.000000";
            record.location = (document.getElementById('entry-location') as HTMLInputElement).value || "Unknown";
            record.course = (document.getElementById('entry-course') as HTMLSelectElement).value;
            record.name = title;
            record.events = "[]";
        } else if (type === 'qualifying_times') {
            record.eventName = (document.getElementById('entry-event-name') as HTMLInputElement).value || title;
            record.targetTime = Math.floor(parseFloat((document.getElementById('entry-target-time') as HTMLInputElement).value) * 1000) || 0;
            record.course = (document.getElementById('entry-course') as HTMLSelectElement).value;
            record.name = title;
            record.isAchieved = false;
        }

        const collection = type === 'habits' ? 'tasks' : type;
        
        saveBtn.disabled = true;
        saveBtn.innerText = "Saving...";
        
        await Api.createRecord(collection, record);
        
        modalOverlay.classList.add('hidden');
        (document.getElementById('entry-title') as HTMLInputElement).value = '';
        await fetchData();
    } catch (e) {
        alert("Save failed: " + e);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Create Entry";
    }
  }

  // -- Event Listeners --

  searchInput.oninput = (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    render();
  };

  addBtn.onclick = () => {
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
    updateModalFields();
  };

  const close = () => {
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('flex');
  };

  closeModalBtn.onclick = close;
  cancelModalBtn.onclick = close;
  entryTypeSelect.onchange = updateModalFields;
  saveBtn.onclick = handleSave;

  refreshBtn.onclick = async () => {
    refreshBtn.classList.add('animate-spin');
    await Api.refreshData();
    await fetchData();
    refreshBtn.classList.remove('animate-spin');
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
  Api.onConnectionChange(updateConnection);

  // Initial Fetch
  await fetchData();
}

init();
