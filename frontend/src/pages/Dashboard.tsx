import { useState } from 'react';
import { Plus, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store';
import CreateEntryModal from '../components/modals/CreateEntryModal';

export default function Dashboard() {
  const { tasks, notes } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="pb-32 animate-in fade-in duration-500">
      <h1 className="text-4xl font-bold mb-8 text-white flex items-center group">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} /> Recent Notes
            </h2>
          </div>
          <div className="space-y-2">
            {notes.slice(0, 5).map(note => (
              <div key={note.id} className="notion-bg-hover cursor-pointer p-3 rounded-lg flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#d4d4d4] group-hover:text-blue-400 transition-colors">{note.title}</span>
                  <span className="text-[10px] text-[#525252]">{note.subject}</span>
                </div>
                <ChevronRight size={16} className="text-[#525252] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {notes.length === 0 && <div className="text-sm text-[#525252] p-2">No notes found.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} /> Up Next (Tasks)
            </h2>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => !t.isCompleted).slice(0, 5).map(task => (
              <div key={task.id} className="notion-bg-hover cursor-pointer p-3 rounded-lg flex items-center gap-3 group">
                <div className="w-4 h-4 rounded border border-[#525252] group-hover:border-blue-500 transition-colors flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[#d4d4d4] truncate pt-0.5">{task.title}</span>
                  {task.subject && <span className="text-[10px] text-[#525252]">{task.subject}</span>}
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="text-sm text-[#525252] p-2">No pending tasks.</div>}
          </div>
        </div>
      </div>
      
      {/* Floating Action Button (Mobile Friendly Create Menu) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-white hover:bg-gray-200 text-black rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40 shrink-0"
      >
        <Plus size={28} />
      </button>

      {isModalOpen && (
        <CreateEntryModal 
          onClose={() => setIsModalOpen(false)} 
          onSaved={() => useAppStore.getState().fetchData()} 
        />
      )}
    </div>
  );
}
