import { Plus, ChevronRight, FileText, CheckCircle2, Waves, Activity } from 'lucide-react';
import { useAppStore } from '../store';

export default function Dashboard({ view = 'dashboard' }: { view?: 'dashboard' | 'notes' | 'tasks' | 'swims' | 'grades' | 'galas' | 'qts' | string }) {
  const { tasks, notes, swims, grades, galas, qts, openEditor, fetchData } = useAppStore();

  return (
    <div className="pb-32 animate-in fade-in duration-500 overflow-y-auto max-h-[100vh]">
      <div className="mb-10 px-2 lg:px-8 pt-4">
        <h1 className="text-3xl lg:text-5xl font-bold text-white mb-2 capitalize tracking-tight">
          {view === 'dashboard' ? 'Good morning, Keshayen' : view.replace('_', ' ')}
        </h1>
        <p className="text-[#9b9b9b]">Here's your overview.</p>
      </div>

      <div className={`px-2 lg:px-8 grid gap-8 ${view === 'dashboard' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        
        {/* Notes Section */}
        {(view === 'dashboard' || view === 'notes') && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <FileText size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Notes</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {notes.slice(0, view === 'dashboard' ? 10 : undefined).map(note => (
                <div key={note.id} onClick={() => openEditor('school_notes', note.id)} className="notion-bg-hover cursor-pointer p-3 rounded-lg flex items-center justify-between group border border-transparent hover:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#d4d4d4] group-hover:text-blue-400 transition-colors">{note.title || "Untitled"}</span>
                    <span className="text-[10px] text-[#525252]">{note.subject}</span>
                  </div>
                  <ChevronRight size={16} className="text-[#525252] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              {notes.length === 0 && <div className="text-sm text-[#525252] p-2">No notes found.</div>}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {(view === 'dashboard' || view === 'tasks') && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <CheckCircle2 size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Active Tasks</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {(view === 'dashboard' ? tasks.filter(t => !t.isCompleted).slice(0, 10) : tasks).map(task => (
                <div key={task.id} className="notion-bg-hover group p-3 rounded-lg flex items-center gap-3 border border-transparent hover:border-white/5 transition-colors">
                  <div 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                       await import('../api').then(({ Api }) => Api.updateRecord('tasks', { ...task, isCompleted: !task.isCompleted })); 
                       await fetchData();
                    }}
                    className={`cursor-pointer w-4 h-4 rounded border ${task.isCompleted ? 'border-green-500 bg-green-500/20' : 'border-[#525252] group-hover:border-blue-500'} transition-colors shrink-0 flex items-center justify-center`}
                  >
                    {task.isCompleted ? <div className="w-2 h-2 bg-green-500 rounded-sm" /> : null}
                  </div>
                  <div onClick={() => openEditor('tasks', task.id)} className="flex-1 min-w-0 cursor-pointer flex flex-col">
                    <span className={`text-sm font-medium truncate pt-0.5 group-hover:text-blue-400 transition-colors ${task.isCompleted ? 'text-[#525252] line-through' : 'text-[#d4d4d4]'}`}>{task.title}</span>
                    <div className="flex items-center gap-2">
                       {task.subject && <span className="text-[10px] text-[#525252]">{task.subject}</span>}
                       {task.dueDate && <span className="text-[10px] text-blue-500/70">Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && <div className="text-sm text-[#525252] p-2">No pending tasks.</div>}
            </div>
          </div>
        )}

        {/* Swims Section */}
        {(view === 'dashboard' || view === 'swims') && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Waves size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Swims</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {swims.slice(0, view === 'dashboard' ? 8 : undefined).map(session => (
                <div key={session.id} onClick={() => openEditor('swim_sessions', session.id)} className="notion-bg-hover cursor-pointer p-3 rounded-lg flex items-center justify-between group border border-transparent hover:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#d4d4d4] group-hover:text-blue-400 transition-colors">{session.distance}m {session.stroke}</span>
                    <span className="text-[10px] text-[#525252]">{new Date(session.date).toLocaleDateString()} - {session.duration} mins</span>
                  </div>
                  <ChevronRight size={16} className="text-[#525252] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              {swims.length === 0 && <div className="text-sm text-[#525252] p-2">No swims logged.</div>}
            </div>
          </div>
        )}

        {/* Grades Section */}
        {(view === 'dashboard' || view === 'grades') && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Activity size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Grades</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {grades.slice(0, view === 'dashboard' ? 8 : undefined).map(grade => (
                <div key={grade.id} onClick={() => openEditor('school_grades', grade.id)} className="notion-bg-hover cursor-pointer p-3 rounded-lg flex items-center justify-between group border border-transparent hover:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#d4d4d4] group-hover:text-blue-400 transition-colors">{grade.title}</span>
                    <span className="text-[10px] text-[#525252]">{grade.subject} - {Math.round((grade.score/grade.total)*100)}%</span>
                  </div>
                  <ChevronRight size={16} className="text-[#525252] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              {grades.length === 0 && <div className="text-sm text-[#525252] p-2">No grades logged.</div>}
            </div>
          </div>
        )}

        {/* Galas & QTs Section */}
        {(view === 'galas') && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 col-span-full h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Waves size={16} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Swim Galas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {galas.map(gala => (
                <div key={gala.id} onClick={() => openEditor('swim_galas', gala.id)} className="notion-bg-hover cursor-pointer p-4 rounded-lg flex items-center justify-between group border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">{gala.name}</span>
                    <span className="text-xs text-[#9b9b9b]">{gala.course} • {new Date(gala.date).toLocaleDateString()}</span>
                  </div>
                  <ChevronRight size={16} className="text-[#525252] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              {galas.length === 0 && <div className="text-sm text-[#525252] p-2">No galas recorded.</div>}
            </div>
          </div>
        )}

        {(view === 'qts') && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 col-span-full h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Activity size={16} className="text-yellow-400" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Qualifying Times</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qts.map(qt => (
                <div key={qt.id} onClick={() => openEditor('qualifying_times', qt.id)} className="notion-bg-hover cursor-pointer p-4 rounded-lg flex flex-col group border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-base font-semibold text-white group-hover:text-yellow-400 transition-colors">{qt.eventName}</span>
                     {qt.isAchieved && <CheckCircle2 size={16} className="text-green-500" />}
                  </div>
                  <span className="text-xs text-[#9b9b9b]">{qt.course} • Targeted: {qt.targetTime}s</span>
                </div>
              ))}
              {qts.length === 0 && <div className="text-sm text-[#525252] p-2">No qualifying times tracked.</div>}
            </div>
          </div>
        )}

      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40 group">
        <button 
          onClick={() => {
            if (view === 'swims') openEditor('swim_sessions');
            else if (view === 'grades') openEditor('school_grades');
            else if (view === 'tasks') openEditor('tasks');
            else openEditor('school_notes');
          }}
          className="w-14 h-14 bg-white hover:bg-gray-200 text-black rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus size={28} />
        </button>
      </div>
    </div>
  );
}
