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

function ReviewHeatmap({ cards }: { cards: any[] }) {
  const today = new Date();
  const days = Array.from({ length: 91 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (90 - i));
    return d.toDateString();
  });

  const reviewCounts = cards.reduce((acc: any, card) => {
    if (card.lastReview) {
      const dateStr = new Date(card.lastReview).toDateString();
      acc[dateStr] = (acc[dateStr] || 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="bg-[#202020] border border-white/5 rounded-xl p-4 mb-8 overflow-x-auto">
      <div className="text-[#9b9b9b] text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
        <Activity size={12} /> Review Activity (Last 90 Days)
      </div>
      <div className="flex gap-1 min-w-max">
        {Array.from({ length: 13 }).map((_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const dateIdx = weekIdx * 7 + dayIdx;
              const dateStr = days[dateIdx];
              const count = reviewCounts[dateStr] || 0;
              const opacity = count === 0 ? 'bg-white/5' : 
                             count < 3 ? 'bg-purple-500/30' : 
                             count < 6 ? 'bg-purple-500/60' : 'bg-purple-500';
              return (
                <div 
                  key={dayIdx} 
                  title={`${dateStr}: ${count} reviews`}
                  className={`w-3 h-3 rounded-sm ${opacity} transition-colors hover:ring-1 hover:ring-white/20`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Flashcards() {
  const flashcards = useAppStore(state => state.flashcards);
  const openEditor = useAppStore(state => state.openEditor);
  const fetchData = useAppStore(state => state.fetchData);
  
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const subjects = Array.from(new Set(flashcards.map(f => f.subject))).filter(Boolean);
  const allTags = Array.from(new Set(flashcards.flatMap(f => Array.isArray(f.tags) ? f.tags : []))).filter(Boolean);

  const filteredCards = flashcards.filter(card => {
    const matchesSubject = filterSubject === 'all' || card.subject === filterSubject;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(t => Array.isArray(card.tags) && card.tags.includes(t));
    const matchesSearch = !searchQuery || 
                          card.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          card.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesTags && matchesSearch;
  });

  const dueCards = filteredCards.filter(f => {
    if (!f.due) return true;
    return new Date(f.due).getTime() <= Date.now();
  });

  const [isStudying, setIsStudying] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    const card = dueCards[currentCardIndex];
    if (!card) return;
    await Api.reviewFlashcard(card.id, rating);
    setShowAnswer(false);
    setCurrentCardIndex(prev => prev + 1);
    const isFinished = currentCardIndex + 1 >= dueCards.length;
    if (isFinished) { 
        setIsStudying(false); 
        fetchData(); 
    }
  };

  // Keyboard Shortcuts for Rating
  useEffect(() => {
    if (!isStudying || !showAnswer || currentCardIndex >= dueCards.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleRate(parseInt(e.key) as 1 | 2 | 3 | 4);
        Api.log_to_terminal(`[Flashcards] Keyboard rating applied: ${e.key}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudying, showAnswer, currentCardIndex, dueCards, handleRate]);
  
  return (
    <div className="pb-32 animate-in fade-in duration-500 max-w-3xl mx-auto px-4 md:px-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
          <GraduationCap size={32} className="text-purple-400" />
          Flashcards
        </h1>
      </div>

      <ReviewHeatmap cards={flashcards} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#202020] border border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="text-[#9b9b9b] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2">
            <RefreshCw size={14} className="text-purple-400" /> Due Now
          </div>
          <div className="text-3xl font-bold text-white leading-none">{dueCards.length}</div>
        </div>
        <div className="bg-[#202020] border border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="text-[#9b9b9b] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2">
            <Zap size={14} className="text-amber-400" /> Collection
          </div>
          <div className="text-3xl font-bold text-white leading-none">{filteredCards.length}</div>
        </div>
        <button 
          onClick={() => { if (dueCards.length > 0) setIsStudying(true); }} 
          className={`group rounded-xl p-5 flex flex-col justify-center items-center text-white transition-all transform shadow-sm ${dueCards.length > 0 ? 'bg-linear-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
        >
          <BrainCircuit size={32} className={`mb-1 ${dueCards.length > 0 ? 'group-hover:animate-pulse' : ''}`} />
          <span className="font-black text-xs uppercase tracking-widest">
             {dueCards.length > 0 ? 'Study Filtered' : 'Empty Deck'}
          </span>
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-end mb-2">
           <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-[#525252] uppercase mb-1 block">Search</label>
              <input 
                type="text" 
                placeholder="Find a card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#202020] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
              />
           </div>
           <div className="w-full md:w-48">
              <label className="text-[10px] font-bold text-[#525252] uppercase mb-1 block">Subject</label>
              <select 
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full bg-[#202020] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>
        </div>

        <div className="w-full mb-4">
          <label className="text-[10px] font-bold text-[#525252] uppercase mb-1 block">Filter by Tags (Multi-select)</label>
          <div className="flex flex-wrap gap-1.5 mt-1 min-h-[38px] p-2 bg-[#202020] border border-white/5 rounded-lg">
            {allTags.map(tag => {
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    );
                  }}
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all border ${
                    isActive 
                    ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                    : 'bg-white/5 text-[#525252] border-transparent hover:border-white/10 hover:text-[#9b9b9b]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            {allTags.length === 0 && <span className="text-[9px] text-[#333] italic uppercase font-bold">No tags available</span>}
          </div>
        </div>
        
        <div className="space-y-2">
          {filteredCards.map(card => (
            <div 
              key={card.id} 
              onClick={() => openEditor('flashcards', card.id)} 
              className="bg-[#191919] hover:bg-[#202020] flex flex-col p-4 rounded-xl border border-white/5 cursor-pointer transition-all hover:border-purple-500/20 group"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black text-purple-400 tracking-widest bg-purple-500/10 px-2 py-0.5 rounded leading-none">{card.subject || 'General'}</span>
                  {Array.isArray(card.tags) && card.tags.map(t => (
                    <span key={t} className="text-[9px] font-bold text-[#525252] bg-white/5 px-1.5 py-0.5 rounded leading-none">{t}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-[#333] group-hover:text-[#525252] uppercase tracking-tighter transition-colors">Interval: {Math.round(card.interval)}d</span>
                  <ArrowRight size={14} className="text-[#333] group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#d4d4d4] mb-1 leading-tight group-hover:text-white transition-colors">{card.question}</h3>
              <p className="text-sm text-[#525252] italic line-clamp-1">{card.answer}</p>
            </div>
          ))}
          {filteredCards.length === 0 && (
            <div className="text-center py-20 bg-[#202020]/30 rounded-2xl border border-dashed border-white/5">
              <BrainCircuit size={48} className="text-[#333] mx-auto mb-4" />
              <div className="text-[#525252] text-sm font-medium tracking-wide">No flashcards match your current filters.</div>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN INDEPENDENT STUDY MODAL */}
      {isStudying && dueCards.length > 0 && currentCardIndex < dueCards.length && (
         <div className="fixed inset-0 bg-[#121212]/98 backdrop-blur-2xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
               <div className="flex items-center gap-3">
                  <GraduationCap size={20} className="text-purple-400" />
                  <span className="text-[#9b9b9b] font-black text-[10px] uppercase tracking-[0.2em]">{dueCards[currentCardIndex].subject || 'SESSION'}</span>
               </div>
               <div className="flex items-center gap-6">
                  <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden hidden md:block">
                     <div 
                        className="h-full bg-purple-500 transition-all duration-500" 
                        style={{ width: `${((currentCardIndex + 1) / dueCards.length) * 100}%` }}
                     />
                  </div>
                  <span className="text-purple-400 font-black tracking-widest text-xs">{currentCardIndex + 1} / {dueCards.length}</span>
                  <button onClick={() => { setIsStudying(false); setShowAnswer(false); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer">
                     <X size={24} />
                  </button>
               </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full p-8 px-6 text-center">
               <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] mb-12 tracking-tighter">
                  {dueCards[currentCardIndex].question}
               </h2>

               {showAnswer ? (
                  <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-500">
                     <div className="w-full h-px bg-white/10 mb-10" />
                     <p className="text-xl md:text-3xl text-[#d4d4d4] mb-16 max-w-xl italic leading-relaxed font-medium">
                        {dueCards[currentCardIndex].answer}
                     </p>
                     
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                        {[
                          { rating: 1, label: 'Again', color: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20', icon: <XCircle size={18} /> },
                          { rating: 2, label: 'Hard', color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border-orange-500/20', icon: <Activity size={18} /> },
                          { rating: 3, label: 'Good', color: 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20', icon: <Check size={18} /> },
                          { rating: 4, label: 'Easy', color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20', icon: <Sparkles size={18} /> },
                        ].map((btn) => (
                          <button 
                            key={btn.rating}
                            onClick={() => handleRate(btn.rating as any)}
                            className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all cursor-pointer border hover:scale-[1.05] active:scale-[0.95] ${btn.color}`}
                          >
                            <div className="flex items-center gap-2 mb-1.5 line-none">
                               {btn.icon}
                               <span className="font-black text-[10px] uppercase tracking-widest">{btn.label}</span>
                            </div>
                            <NextInterval cardId={dueCards[currentCardIndex].id} rating={btn.rating as any} />
                          </button>
                        ))}
                     </div>
                  </div>
               ) : (
                  <button 
                    onClick={() => setShowAnswer(true)} 
                    className="group bg-white hover:bg-gray-200 text-black font-black text-xl px-10 py-5 rounded-2xl flex items-center gap-4 transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
                  >
                    Reveal Answer <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </button>
               )}
            </div>
         </div>
      )}

      {isStudying && currentCardIndex >= dueCards.length && (
         <div className="fixed inset-0 bg-[#121212]/98 backdrop-blur-2xl z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 text-center">
            <div className="bg-green-500/10 p-8 rounded-full mb-8 border border-green-500/20">
               <GraduationCap size={100} className="text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.3)] animate-bounce" />
            </div>
            <h2 className="text-5xl font-black text-white mb-6 tracking-tighter">Deck Cleared!</h2>
            <p className="text-[#9b9b9b] text-lg font-medium mb-12 max-w-sm">You've successfully reviewed all cards in this filtered session.</p>
            <button onClick={() => { setIsStudying(false); fetchData(); }} className="bg-white hover:bg-gray-200 text-black font-black px-12 py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-xl">
               Continue Journey
            </button>
         </div>
      )}

    </div>
  );
}
