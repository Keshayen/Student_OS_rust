import { create } from 'zustand';
import { Api } from './api';
import type { Task, SchoolNote, SchoolGrade, SwimSession, SwimGala, QualifyingTime, SchoolFlashcard } from './api';

interface AppState {
  tasks: Task[];
  notes: SchoolNote[];
  grades: SchoolGrade[];
  swims: SwimSession[];
  galas: SwimGala[];
  qts: QualifyingTime[];
  flashcards: SchoolFlashcard[];
  searchQuery: string;
  isSidebarOpen: boolean;
  currentPage: 'dashboard' | 'notes' | 'tasks' | 'flashcards' | 'swims' | 'grades' | 'galas' | 'qts' | 'search' | 'editor';
  currentEntryId: string | null;
  currentEntryType: string;
  
  // Actions
  setCurrentPage: (page: AppState['currentPage']) => void;
  openEditor: (type?: string, id?: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  fetchData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: [],
  notes: [],
  grades: [],
  swims: [],
  galas: [],
  qts: [],
  flashcards: [],
  searchQuery: '',
  isSidebarOpen: true,
  currentPage: 'dashboard',
  currentEntryId: null,
  currentEntryType: 'school_notes',

  setCurrentPage: (page) => set({ currentPage: page }),
  openEditor: (type = 'school_notes', id: string | null = null) => set({ 
    currentPage: 'editor', 
    currentEntryType: type, 
    currentEntryId: id 
  }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  fetchData: async () => {
    try {
      const results = await Promise.allSettled([
        Api.getTasks(),
        Api.getNotes(),
        Api.getGrades(),
        Api.getSwimSessions(),
        Api.getSwimGalas(),
        Api.getQualifyingTimes(),
        Api.getFlashcards()
      ]);
      
      const getValue = <T>(res: PromiseSettledResult<T>, fallback: T): T => 
        res.status === 'fulfilled' ? res.value : fallback;

      set({ 
        tasks: getValue(results[0], []), 
        notes: getValue(results[1], []), 
        grades: getValue(results[2], []), 
        swims: getValue(results[3], []), 
        galas: getValue(results[4], []), 
        qts: getValue(results[5], []), 
        flashcards: getValue(results[6], []) 
      });
    } catch (e) {
      console.error("Fetch failed", e);
    }
  }
}));
