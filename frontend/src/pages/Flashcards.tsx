import { useAppStore } from '../store';
import { GraduationCap, Zap, BrainCircuit, RefreshCw } from 'lucide-react';

export default function Flashcards() {
  const flashcards = useAppStore(state => state.flashcards);
  
  // Basic stats
  const dueCards = flashcards.filter(f => {
    try {
      return Math.round((new Date(f.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 0;
    } catch { return true; }
  });

  return (
    <div className="pb-32 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
          <GraduationCap size={36} className="text-purple-400" />
          Flashcards
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#202020] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-[#9b9b9b] text-sm font-medium flex items-center gap-2 mb-2">
            <RefreshCw size={16} /> Due for Review
          </div>
          <div className="text-3xl font-bold text-white">{dueCards.length}</div>
        </div>
        <div className="bg-[#202020] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-[#9b9b9b] text-sm font-medium flex items-center gap-2 mb-2">
            <Zap size={16} /> Total Cards
          </div>
          <div className="text-3xl font-bold text-white">{flashcards.length}</div>
        </div>
        <button className="group bg-linear-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl p-5 flex flex-col justify-center items-center text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20">
          <BrainCircuit size={32} className="mb-2 group-hover:animate-pulse" />
          <span className="font-bold tracking-wide">Study Now</span>
        </button>
      </div>
      
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider mb-4 border-b border-white/10 pb-2">All Cards ({flashcards.length})</h2>
        <div className="grid grid-cols-1 gap-2">
          {flashcards.map(card => (
            <div key={card.id} className="notion-bg-hover flex flex-col p-4 rounded-lg border border-white/5 cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">{card.subject}</span>
                <span className="text-[10px] text-[#525252]">Interval: {Math.round(card.interval)}d</span>
              </div>
              <h3 className="text-base font-semibold text-[#d4d4d4] mb-1">Q: {card.question}</h3>
              <p className="text-sm text-[#9b9b9b] italic">A: {card.answer}</p>
            </div>
          ))}
          {flashcards.length === 0 && (
            <div className="text-center py-10 text-[#525252] text-sm">No flashcards found. Create some!</div>
          )}
        </div>
      </div>
    </div>
  );
}
