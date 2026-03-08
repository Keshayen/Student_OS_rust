const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

export const Api = {
    async getTasks() { return await invoke("get_tasks"); },
    async getNotes() { return await invoke("get_notes"); },
    async getGrades() { return await invoke("get_grades"); },
    async getSwimSessions() { return await invoke("get_swim_sessions"); },
    async getSwimGalas() { return await invoke("get_swim_galas"); },
    async getQualifyingTimes() { return await invoke("get_qualifying_times"); },
    async getFlashcards() { return await invoke("get_flashcards"); },
    
    async createRecord(collection, record) {
        return await invoke("create_record_command", { 
            collection, 
            recordJson: JSON.stringify(record) 
        });
    },
    
    async deleteRecord(collection, id) {
        return await invoke("delete_record_command", { collection, recordId: id });
    },
    
    async refreshData() {
        return await invoke("refresh_data_command");
    },
    
    async getConnectionStatus() {
        return await invoke("get_connection_status");
    },
    
    onConnectionChange(callback) {
        return listen('connection-status', (event) => callback(event.payload));
    }
};
