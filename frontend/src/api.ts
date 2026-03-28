import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// --- Types (JSON Keys matching Rust Renames) ---

export type TaskType = 'task' | 'school';
export type SchoolTaskType = 'exam' | 'ssa' | 'classTest' | 'assignment';
export type TaskFrequency = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type IntervalUnit = 'days' | 'weeks' | 'months' | 'years';

export interface Task {
    id: string;
    userId: string;
    taskType: TaskType;
    title: string;
    isCompleted: boolean;
    createdDate: string;
    subject?: string;
    dueDate?: string;
    schoolTaskType?: SchoolTaskType;
    linkedNoteIds?: any;
    frequency?: TaskFrequency;
    interval?: number;
    intervalUnit?: IntervalUnit;
    streak?: number;
    completedDates?: any;
    reminderEnabled: boolean;
    reminderType?: string;
    reminderHour?: number;
    reminderMinute?: number;
}

export interface SchoolNote {
    id: string;
    userId: string;
    subject: string;
    title: string;
    content: string;
    createdAt: string;
}

export interface SchoolFlashcard {
  id: string;
  userId: string;
  subject: string;
  question: string;
  answer: string;

  // FSRS scheduling fields
  stability: number;
  difficulty: number;
  due: string;
  interval: number;
  lapses: number;
  lastReview?: string | null;

  // Organization
  linkedNoteIds?: string[] | null;
  tags?: string[] | null;

  createdAt: string;
  imageUrl?: string | null;
  updatedAt?: string | null;
}

export interface SchoolGrade {
    id: string;
    userId: string;
    subject: string;
    title: string;
    score: number;
    total: number;
    cycle: string;
    category: string;
    date: string;
    schoolYear: number;
}

export interface SwimSession {
    id: string;
    userId: string;
    date: string;
    duration: number;
    distance: number;
    stroke: string;
    notes: string;
    workoutEffect?: string;
    heartRateAvg?: number;
    heartRateMax?: number;
    effortLevel: number;
    poolLength: number;
    sets: string;
    caloriesBurned?: number;
    location?: string;
}

export interface SwimGala {
    id: string;
    userId: string;
    name: string;
    date: string;
    location: string;
    course: string;
    events?: string;
}

export interface QualifyingTime {
    id: string;
    userId: string;
    name: string;
    eventName: string;
    targetTime: number;
    course: string;
    isAchieved: boolean;
}

export interface SearchResult {
    id: string;
    collection: string;
    title: string;
    subtitle: string;
    score: number;
}

// --- API Service ---

export const Api = {
    async getTasks(): Promise<Task[]> { return await invoke("get_tasks"); },
    async getNotes(): Promise<SchoolNote[]> { return await invoke("get_notes"); },
    async getGrades(): Promise<SchoolGrade[]> { return await invoke("get_grades"); },
    async getSwimSessions(): Promise<SwimSession[]> { return await invoke("get_swim_sessions"); },
    async getSwimGalas(): Promise<SwimGala[]> { return await invoke("get_swim_galas"); },
    async getQualifyingTimes(): Promise<QualifyingTime[]> { return await invoke("get_qualifying_times"); },
    async getFlashcards(): Promise<SchoolFlashcard[]> { return await invoke("get_flashcards"); },

    async globalSearch(query: string): Promise<SearchResult[]> {
        return await invoke("global_search", { query });
    },

    async createRecord(collection: string, record: any): Promise<any> {
        return await invoke("create_record_command", {
            collection,
            recordJson: JSON.stringify(record)
        });
    },

    async updateRecord(collection: string, record: any): Promise<any> {
        return await invoke("update_record_command", {
            collection,
            recordJson: JSON.stringify(record)
        });
    },

    async updateSyncConfig(config: { serverUrl: string; username: string; password?: string }): Promise<void> {
        return await invoke('update_sync_config', { config });
    },

    // FSRS Flashcard Review Commands
    async reviewFlashcard(cardId: string, rating: number, desiredRetention?: number): Promise<SchoolFlashcard> {
        return await invoke('review_flashcard', {
            cardId,
            rating,
            desiredRetention
        });
    },

    async getNextReviewStates(cardId: string, desiredRetention?: number): Promise<{
        again: number;
        hard: number;
        good: number;
        easy: number;
    }> {
        return await invoke('get_next_review_states', {
            cardId,
            desiredRetention
        });
    },

    async deleteRecord(collection: string, id: string): Promise<void> {
        return await invoke("delete_record_command", { collection, recordId: id });
    },

    async refreshData(): Promise<void> {
        return await invoke("refresh_data_command");
    },

    async getConnectionStatus(): Promise<boolean> {
        return await invoke("get_connection_status");
    },

    onConnectionChange(callback: (isOffline: boolean) => void) {
        return listen<boolean>('connection-status', (event) => callback(event.payload));
    },

    onSyncStatusChange(callback: (status: string) => void) {
        return listen<string>('sync-status', (event) => callback(event.payload));
    },

    onDataChanged(callback: () => void) {
        return listen<void>('data-changed', () => callback());
    },

    async log_to_terminal(msg: string): Promise<void> {
        return await invoke("log_to_terminal", { msg });
    }
};
