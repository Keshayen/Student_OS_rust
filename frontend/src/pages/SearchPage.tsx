import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Search as SearchIcon, FileText, CheckCircle2, Waves, Activity } from 'lucide-react';
import { Api } from '../api';
import type { SearchResult } from '../api';

export default function SearchPage() {
  const { openEditor } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
     if (!query) {
       setResults([]);
       return;
     }
     const timeoutId = setTimeout(async () => {
        try {
           const res = await Api.globalSearch(query);
           setResults(res);
        } catch (e) {
           console.error("[Search] Failed to evaluate fuzzy query: ", e);
        }
     }, 150);
     return () => clearTimeout(timeoutId);
  }, [query]);

  const filteredNotes = results.filter(r => r.collection === 'school_notes');
  const filteredTasks = results.filter(r => r.collection === 'tasks');
  const filteredSwims = results.filter(r => r.collection === 'swim_sessions');
  const filteredGrades = results.filter(r => r.collection === 'school_grades');

  return (
    <div className="pb-32 animate-in fade-in duration-500 px-2 lg:px-8">
      <div className="mb-10 relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Fuzzy search across Notes, Tasks & more..."
          className="w-full bg-[#191919] border border-white/10 text-white rounded-xl py-4 pl-14 pr-4 text-xl focus:outline-none focus:border-white/30 transition-colors shadow-lg shadow-black/20"
          autoFocus
        />
      </div>

      {!query && (
        <div className="text-center text-[#525252] mt-20">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Type something to search anywhere.</p>
        </div>
      )}

      {query && (
        <div className="space-y-8">
           {filteredNotes.length > 0 && (
             <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#9b9b9b] mb-3 flex items-center gap-2">
                   <FileText size={16} /> Notes
                </h3>
                <div className="space-y-2">
                   {filteredNotes.map(n => (
                     <div key={n.id} onClick={() => openEditor('school_notes', n.id)} className="notion-bg-hover cursor-pointer p-4 rounded-lg group">
                        <div className="font-semibold text-[#d4d4d4] group-hover:text-blue-400">{n.title}</div>
                        <div className="text-xs text-[#525252] mt-1">{n.subtitle}</div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {filteredTasks.length > 0 && (
             <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#9b9b9b] mb-3 flex items-center gap-2">
                   <CheckCircle2 size={16} /> Tasks
                </h3>
                <div className="space-y-2">
                   {filteredTasks.map(t => (
                     <div key={t.id} onClick={() => openEditor('tasks', t.id)} className="notion-bg-hover cursor-pointer p-4 rounded-lg group">
                        <div className="font-semibold text-[#d4d4d4] group-hover:text-blue-400">{t.title}</div>
                        <div className="text-xs text-[#525252] mt-1 flex gap-2">
                          <span>{t.subtitle || 'General'}</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {filteredSwims.length > 0 && (
             <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#9b9b9b] mb-3 flex items-center gap-2">
                   <Waves size={16} /> Swims
                </h3>
                <div className="space-y-2">
                   {filteredSwims.map(s => (
                     <div key={s.id} onClick={() => openEditor('swim_sessions', s.id)} className="notion-bg-hover cursor-pointer p-4 rounded-lg group flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#d4d4d4] group-hover:text-blue-400">{s.title}</div>
                          <div className="text-xs text-[#525252] mt-1">{s.subtitle}</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {filteredGrades.length > 0 && (
             <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#9b9b9b] mb-3 flex items-center gap-2">
                   <Activity size={16} /> Grades
                </h3>
                <div className="space-y-2">
                   {filteredGrades.map(g => (
                     <div key={g.id} onClick={() => openEditor('school_grades', g.id)} className="notion-bg-hover cursor-pointer p-4 rounded-lg group flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#d4d4d4] group-hover:text-blue-400">{g.title}</div>
                          <div className="text-xs text-[#525252] mt-1">{g.subtitle}</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {(results.length === 0) && (
             <div className="text-center text-[#525252] py-12">No results matched your fuzzy query.</div>
           )}
        </div>
      )}
    </div>
  );
}
