import { useState } from 'react';
import { useAppStore } from '../store';
import { Api } from '../api';
import { GraduationCap, Zap, BrainCircuit, RefreshCw, X, Check, XCircle, ArrowRight, Activity, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

function NextInterval({ cardId, rating }: { cardId: string, rating: 1 | 2 | 3 | 4 }) {
  const [interval, setIntervalVal] = useState<string | null>(null);

  useEffect(() => {
    Api.getNextReviewStates(cardId).then(states => {
      const days = [states.again, states.hard, states.good, states.easy][rating - 1];
      setIntervalVal(formatDays(days));
    });
  }, [cardId, rating]);

  if (!interval) return <div className="h-3 w-8 bg-white/5 animate-pulse rounded mt-1" />;
  return <span className="text-[10px] font-bold opacity-50 tracking-wider mt-0.5">{interval}</span>;
}

function formatDays(days: number): string {
  if (days < 1) {
    const mins = Math.round(days * 24 * 60);
    if (mins < 1) return `1m`;
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(days * 24);
    return `${hours}h`;
  }
  const d = Math.round(days);
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30.44)}mo`;
  return `${Math.round(d / 365)}y`;
}

export default function Flashcards() {
  const flashcards = useAppStore(state => state.flashcards);
  const openEditor = useAppStore(state => state.openEditor);
  const fetchData = useAppStore(state => state.fetchData);
  const [isStudying, setIsStudying] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  
  // Basic stats
  const dueCards = flashcards.filter(f => {
    if (!f.due) return true;
    return new Date(f.due).getTime() <= Date.now();
  });

  return (
    <div className="pb-32 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8 px-4 md:px-0">
        <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
          <GraduationCap size={32} className="text-purple-400" />
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
        <button onClick={() => { if (dueCards.length > 0) setIsStudying(true); }} className={`group rounded-xl p-5 flex flex-col justify-center items-center text-white transition-all transform ${dueCards.length > 0 ? 'bg-linear-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20 cursor-pointer' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}>
          <BrainCircuit size={32} className={`mb-2 ${dueCards.length > 0 ? 'group-hover:animate-pulse' : ''}`} />
          <span className="font-bold tracking-wide">
             {dueCards.length > 0 ? 'Study Now' : 'No Cards Due'}
          </span>
        </button>
      </div>
      
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[#9b9b9b] uppercase tracking-wider mb-4 border-b border-white/10 pb-2">All Cards ({flashcards.length})</h2>
        <div className="grid grid-cols-1 gap-2">
          {flashcards.map(card => (
            <div key={card.id} onClick={() => openEditor('flashcards', card.id)} className="notion-bg-hover flex flex-col p-4 rounded-lg border border-white/5 cursor-pointer">
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

      {/* FULLSCREEN INDEPENDENT STUDY MODAL */}
      {isStudying && dueCards.length > 0 && currentCardIndex < dueCards.length && (
         <div className="fixed inset-0 bg-[#121212]/95 backdrop-blur-xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
               <span className="text-[#9b9b9b] font-semibold text-sm uppercase tracking-widest">{dueCards[currentCardIndex].subject}</span>
               <div className="flex items-center gap-4">
                  <span className="text-purple-400 font-bold tracking-widest text-xs">{currentCardIndex + 1} / {dueCards.length}</span>
                  <button onClick={() => { setIsStudying(false); setShowAnswer(false); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                     <X size={24} />
                  </button>
               </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full p-8 px-4 text-center">
               <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-12 tracking-tighter">
                  {dueCards[currentCardIndex].question}
               </h2>

               {showAnswer ? (
                  <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-500">
                     <div className="w-full h-px bg-white/10 mb-8" />
                     <p className="text-xl md:text-2xl text-[#d4d4d4] mb-16 max-w-xl italic leading-relaxed">
                        {dueCards[currentCardIndex].answer}
                     </p>
                     
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
                        {[
                          { rating: 1, label: 'Again', color: 'bg-red-500/10 hover:bg-red-500/20 text-red-500', icon: <XCircle size={18} /> },
                          { rating: 2, label: 'Hard', color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-500', icon: <Activity size={18} /> },
                          { rating: 3, label: 'Good', color: 'bg-green-500/10 hover:bg-green-500/20 text-green-500', icon: <Check size={18} /> },
                          { rating: 4, label: 'Easy', color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500', icon: <Sparkles size={18} /> },
                        ].map((btn) => (
                          <button 
                            key={btn.rating}
                            onClick={async () => {
                               await Api.reviewFlashcard(dueCards[currentCardIndex].id, btn.rating as any);
                               setShowAnswer(false);
                               setCurrentCardIndex(prev => prev + 1);
                               if (currentCardIndex + 1 >= dueCards.length) { setIsStudying(false); fetchData(); }
                            }}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10 ${btn.color}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                               {btn.icon}
                               <span className="font-bold text-sm tracking-tight">{btn.label}</span>
                            </div>
                            <NextInterval cardId={dueCards[currentCardIndex].id} rating={btn.rating as any} />
                          </button>
                        ))}
                     </div>
                  </div>
               ) : (
                  <button 
                    onClick={() => setShowAnswer(true)} 
                    className="group bg-white hover:bg-gray-200 text-black font-extrabold text-lg px-8 py-4 rounded-xl flex items-center gap-3 transition-all transform hover:scale-105"
                  >
                    Reveal Answer <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
               )}
            </div>
         </div>
      )}

      {isStudying && currentCardIndex >= dueCards.length && (
         <div className="fixed inset-0 bg-[#121212]/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 text-center">
            <GraduationCap size={80} className="text-green-400 mb-6 drop-shadow-2xl" />
            <h2 className="text-4xl font-black text-white mb-4">You're all caught up!</h2>
            <p className="text-[#9b9b9b] mb-8">All due cards have been successfully reviewed.</p>
            <button onClick={() => { setIsStudying(false); fetchData(); }} className="bg-white hover:bg-gray-200 text-black font-bold px-8 py-3 rounded-lg transition-colors">
               Return to Dashboard
            </button>
         </div>
      )}

    </div>
  );
}
