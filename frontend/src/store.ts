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
  currentPage: 'dashboard' | 'notes' | 'tasks' | 'flashcards' | 'swims';
  
  // Actions
  setCurrentPage: (page: AppState['currentPage']) => void;
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

  setCurrentPage: (page) => set({ currentPage: page }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  fetchData: async () => {
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
      set({ tasks, notes, grades, swims, galas, qts, flashcards });
    } catch (e) {
      console.error("Fetch failed", e);
    }
  }
}));
