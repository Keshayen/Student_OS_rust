import { useEffect } from 'react';
import { useAppStore } from './store';
import { Api } from './api';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './pages/Dashboard';
import Flashcards from './pages/Flashcards';
import EntryEditor from './pages/EntryEditor';
import SearchPage from './pages/SearchPage';

export default function App() {
  const fetchData = useAppStore(state => state.fetchData);
  const currentPage = useAppStore(state => state.currentPage);

  useEffect(() => {
    fetchData();
    
    const unlistenConnection = Api.onConnectionChange((isOffline) => {
      console.log('Connection offline:', isOffline);
    });
    
    const unlistenSync = Api.onSyncStatusChange((status) => {
      console.log('Sync status:', status);
    });
    
    const unlistenData = Api.onDataChanged(() => {
      console.log('[App] Data changed event received, fetching fresh data...');
      fetchData();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'n') {
        e.preventDefault();
        useAppStore.getState().openEditor('school_notes', null);
        Api.log_to_terminal("[App] Cmd+N pressed - Navigating to New Note");
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlistenConnection.then(f => f());
      unlistenSync.then(f => f());
      unlistenData.then(f => f());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchData]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#191919] text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8">
          <div className="max-w-4xl mx-auto w-full h-full">
            {['dashboard', 'notes', 'tasks', 'swims', 'grades', 'galas', 'qts'].includes(currentPage) && <Dashboard view={currentPage as any} />}
            {currentPage === 'flashcards' && <Flashcards />}
            {currentPage === 'editor' && <EntryEditor />}
            {currentPage === 'search' && <SearchPage />}
          </div>
        </div>
      </main>
    </div>
  );
}
