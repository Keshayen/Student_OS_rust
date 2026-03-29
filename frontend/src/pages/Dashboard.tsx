import { Plus, ChevronRight, FileText, CheckCircle2, Waves, Activity } from 'lucide-react';
import { useAppStore } from '../store';
import CalendarView from '../components/dashboard/CalendarView';

import { formatSwimTime } from '../utils/formatters';

export default function Dashboard({ view = 'dashboard' }: { view?: 'dashboard' | 'notes' | 'tasks' | 'swims' | 'grades' | 'galas' | 'qts' | string }) {
  const { tasks, notes, swims, grades, galas, qts, openEditor, fetchData } = useAppStore();

  return (
    <div className="pb-32 animate-in fade-in duration-500">
      <div className="mb-10 px-4 lg:px-8 pt-4">
        <h1 className="text-3xl lg:text-5xl font-bold text-white mb-2 capitalize tracking-tight">
          {view === 'dashboard' ? 'Good morning, Keshayen' : view.replace('_', ' ')}
        </h1>
        <p className="text-[#9b9b9b]">{view === 'dashboard' ? "Here's your overview." : `Manage your ${view.replace('_', ' ')}.`}</p>
      </div>

      {view === 'dashboard' && (
        <div className="px-4 lg:px-8 mb-10">
          <CalendarView />
        </div>
      )}

      <div className={`px-4 lg:px-8 grid gap-6 ${view === 'dashboard' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max'}`}>
        {/* OVERVIEW DASHBOARD */}
        {view === 'dashboard' && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <FileText size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Notes</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {notes.slice(0, 8).map(note => (
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

        {view === 'dashboard' && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <CheckCircle2 size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Active Tasks</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {tasks.filter(t => !t.isCompleted).slice(0, 8).map(task => (
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

        {view === 'dashboard' && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Waves size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Swims</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {swims.slice(0, 8).map(session => (
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

        {view === 'dashboard' && (
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl p-4 shadow-xl shadow-black/10 border border-white/5 h-fit">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Activity size={16} className="text-[#9b9b9b]" />
              <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider">Grades</h2>
            </div>
            <div className="flex flex-col space-y-1">
              {grades.slice(0, 8).map(grade => (
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

        {/* DEDICATED ROUTES OVERHAUL */}
        {view === 'notes' && notes.map(note => (
            <div key={note.id} onClick={() => openEditor('school_notes', note.id)} className="bg-[#1e1e1e] hover:bg-white/5 cursor-pointer p-5 rounded-xl flex flex-col group border border-white/5 transition-all outline-none">
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors tracking-tight">{note.title || "Untitled Note"}</h3>
              <p className="text-xs text-[#9b9b9b] font-medium tracking-wide uppercase">{note.subject}</p>
            </div>
        ))}
        {view === 'notes' && notes.length === 0 && <p className="text-[#525252] col-span-full">No notes available.</p>}

        {view === 'tasks' && tasks.map(task => (
            <div key={task.id} className={`bg-[#1e1e1e] hover:bg-white/5 cursor-pointer p-5 rounded-xl flex flex-col group border ${task.isCompleted ? 'border-green-500/20 opacity-70' : 'border-white/5'} transition-all`} onClick={() => openEditor('tasks', task.id)}>
              <div className="flex items-start justify-between mb-3">
                 <h3 className={`text-base font-bold transition-colors ${task.isCompleted ? 'text-green-400 line-through' : 'text-white group-hover:text-blue-400'}`}>{task.title}</h3>
                 <div onClick={async (e) => { 
                      e.stopPropagation(); 
                       await import('../api').then(({ Api }) => Api.updateRecord('tasks', { ...task, isCompleted: !task.isCompleted })); 
                       await fetchData();
                    }}
                    className={`cursor-pointer w-5 h-5 rounded-full border ${task.isCompleted ? 'border-green-500 bg-green-500/20' : 'border-[#525252] group-hover:border-blue-500'} transition-colors shrink-0 flex items-center justify-center`}
                  >
                    {task.isCompleted ? <div className="w-2.5 h-2.5 bg-green-500 rounded-full" /> : null}
                  </div>
              </div>
              <p className="text-xs text-[#9b9b9b] font-medium">{task.subject || "General"} {task.dueDate ? `• Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}</p>
            </div>
        ))}

        {view === 'swims' && swims.map(session => (
            <div key={session.id} onClick={() => openEditor('swim_sessions', session.id)} className="bg-[#1e1e1e] hover:bg-white/5 cursor-pointer p-5 rounded-xl flex flex-col group border border-white/5 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 blur-[1px]">
                 <Waves size={40} className="text-blue-400" />
              </div>
              <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors mb-2 z-10">{session.distance}m</h3>
              <p className="text-sm text-[#d4d4d4] font-medium z-10 mb-1">{session.stroke}</p>
              <p className="text-xs text-[#9b9b9b] z-10">{new Date(session.date).toLocaleDateString()} • {session.duration} mins • Effort {session.effortLevel}/10</p>
            </div>
        ))}

        {view === 'grades' && grades.map(grade => (
            <div key={grade.id} onClick={() => openEditor('school_grades', grade.id)} className="bg-[#1e1e1e] hover:bg-white/5 cursor-pointer p-5 rounded-xl flex flex-col group border border-white/5 transition-all">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors max-w-[70%] leading-tight">{grade.title}</h3>
                 <div className="text-xl font-black tracking-tighter text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">{Math.round((grade.score/grade.total)*100)}%</div>
              </div>
              <p className="text-xs text-[#9b9b9b] uppercase tracking-wider font-semibold">{grade.subject} • {grade.cycle}</p>
            </div>
        ))}

        {view === 'galas' && galas.map(gala => (
            <div key={gala.id} onClick={() => openEditor('swim_galas', gala.id)} className="bg-[#1e1e1e] hover:bg-white/5 cursor-pointer p-5 rounded-xl flex flex-col group border border-white/5 transition-all">
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mb-2">{gala.name}</h3>
              <p className="text-xs text-[#9b9b9b]">{gala.course} • {new Date(gala.date).toLocaleDateString()}</p>
            </div>
        ))}
        {view === 'galas' && galas.length === 0 && <p className="text-[#525252] col-span-full">No galas recorded.</p>}

        {view === 'qts' && qts.map(qt => (
            <div key={qt.id} onClick={() => openEditor('qualifying_times', qt.id)} className={`bg-[#1e1e1e] hover:bg-white/5 cursor-pointer p-5 rounded-xl flex flex-col group border ${qt.isAchieved ? 'border-yellow-400/20' : 'border-white/5'} transition-all`}>
              <div className="flex items-start justify-between mb-2">
                 <h3 className="text-base font-bold text-white group-hover:text-yellow-400 transition-colors leading-tight pr-4">{qt.eventName}</h3>
                 {qt.isAchieved && <CheckCircle2 size={18} className="text-yellow-400 shrink-0" />}
              </div>
              <p className="text-xs text-[#9b9b9b] font-medium">{qt.course} • Target: <span className="text-[#d4d4d4]">{formatSwimTime(qt.targetTime)}</span></p>
            </div>
        ))}
        {view === 'qts' && qts.length === 0 && <p className="text-[#525252] col-span-full">No qualifying times tracked.</p>}

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
