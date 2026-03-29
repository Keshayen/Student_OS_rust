import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Api } from '../api';
import { formatSwimTime, parseSwimTime } from '../utils/formatters';
import NotionEditor from '../components/editor/NotionEditor';
import { ChevronLeft } from 'lucide-react';

export default function EntryEditor() {
  const { currentEntryId, currentEntryType, setCurrentPage, fetchData } = useAppStore();
  const state = useAppStore();
  const [trackingToken, setTrackingToken] = useState("");
  
  // Generic fields
  const [selectedType, setSelectedType] = useState(currentEntryType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tasks
  const [isCompleted, setIsCompleted] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState('none');
  const [taskType, setTaskType] = useState<'task' | 'school'>('school');
  const [schoolTaskType, setSchoolTaskType] = useState('assignment');

  // Swims
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stroke, setStroke] = useState('Freestyle');
  const [poolLength, setPoolLength] = useState(25);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [workoutEffect, setWorkoutEffect] = useState('Aerobic');
  
  // Grades
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(100);
  const [cycle, setCycle] = useState('Term 1');
  const [category, setCategory] = useState('Test');
  const [schoolYear, setSchoolYear] = useState(new Date().getFullYear());

  // Swim Galas
  const [galaCourse, setGalaCourse] = useState('Short Course (25m)');
  const [galaLocation, setGalaLocation] = useState('');

  // Qualifying Times
  const [qtTargetTime, setQtTargetTime] = useState(0);
  const [qtDisplayTime, setQtDisplayTime] = useState("");
  const [qtIsAchieved, setQtIsAchieved] = useState(false);
  const [qtCourse, setQtCourse] = useState('Short Course (25m)');
  
  // Flashcards (for direct editing on the card)
  const [fcQuestion, setFcQuestion] = useState('');
  const [fcAnswer, setFcAnswer] = useState('');
  const [fcTags, setFcTags] = useState<string[]>([]);
  const [fcLinkedNotes, setFcLinkedNotes] = useState<string[]>([]);

  const subjects = ['Mathematics', 'English', 'Afrikaans', 'Physics', 'AP Math', 'EGD', 'Geography', 'Life Orientation', 'Information Technologies'];
  const strokes = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'];
  const entryTypes = [
    { value: 'school_notes', label: 'School Note' },
    { value: 'tasks', label: 'Task / Habit' },
    { value: 'swim_sessions', label: 'Swim Session' },
    { value: 'school_grades', label: 'School Grade' },
    { value: 'swim_galas', label: 'Swim Gala' },
    { value: 'qualifying_times', label: 'Qualifying Time' },
    { value: 'flashcards', label: 'Flashcard' }
  ];

  useEffect(() => {
    const currentToken = `${currentEntryType}-${currentEntryId || 'new'}`;
    if (currentToken !== trackingToken) {
      setTrackingToken(currentToken);
      setSelectedType(currentEntryType);
      if (currentEntryId) {
        if (currentEntryType === 'school_notes') {
          const item = state.notes.find(n => n.id === currentEntryId);
          if (item) { setTitle(item.title); setContent(item.content); setSubject(item.subject); }
        } else if (currentEntryType === 'tasks') {
          const item = state.tasks.find(t => t.id === currentEntryId);
          if (item) { 
            setTitle(item.title); setSubject(item.subject || 'Mathematics'); setIsCompleted(item.isCompleted); 
            if(item.dueDate) setDueDate(item.dueDate.split('T')[0]);
            setTaskType(item.taskType); 
            if(item.schoolTaskType) setSchoolTaskType(item.schoolTaskType);
            if(item.frequency) setFrequency(item.frequency.toLowerCase());
          }
        } else if (currentEntryType === 'swim_sessions') {
          const item = state.swims.find(s => s.id === currentEntryId);
          if (item) { 
            setTitle(item.notes); setDistance(item.distance); setStroke(item.stroke); setDuration(item.duration); setDate(item.date.split('T')[0]);
            setPoolLength(item.poolLength || 25);
            if(item.caloriesBurned) setCaloriesBurned(item.caloriesBurned);
            if(item.workoutEffect) setWorkoutEffect(item.workoutEffect);
          }
        } else if (currentEntryType === 'school_grades') {
          const item = state.grades.find(g => g.id === currentEntryId);
          if (item) { 
            setTitle(item.title); setScore(item.score); setTotal(item.total); setSubject(item.subject);
            setCycle(item.cycle || 'Term 1'); setCategory(item.category || 'Test');
            if(item.schoolYear) setSchoolYear(item.schoolYear);
            if(item.date) setDate(item.date.split('T')[0]);
          }
        } else if (currentEntryType === 'swim_galas') {
          const item = state.galas.find(g => g.id === currentEntryId);
          if (item) {
            setTitle(item.name); setGalaCourse(item.course); setDate(item.date.split('T')[0]);
            if (item.location) setGalaLocation(item.location);
          }
        } else if (currentEntryType === 'qualifying_times') {
          const item = state.qts.find(q => q.id === currentEntryId);
          if (item) {
            setTitle(item.eventName); setQtCourse(item.course); setQtTargetTime(item.targetTime); setQtIsAchieved(item.isAchieved);
            setQtDisplayTime(formatSwimTime(item.targetTime));
          }
        } else if (currentEntryType === 'flashcards') {
          const item = state.flashcards.find(f => f.id === currentEntryId);
          if (item) {
            setTitle(item.subject); setSubject(item.subject); setFcQuestion(item.question); setFcAnswer(item.answer);
            setFcTags(item.tags || []); setFcLinkedNotes(item.linkedNoteIds || []);
          }
        }
      } else {
        // Only clear if the user is truly switching from an existing item to a "fresh" new one.
        // If they are just toggling types for an unsaved draft, preserve the content.
        if (currentToken.endsWith('-new') && trackingToken && !trackingToken.endsWith('-new')) {
           setTitle(''); setContent(''); setScore(0); setTotal(100); setDistance(0); setDuration(0);
           setQtTargetTime(0); setQtDisplayTime("");
        }
      }
      setTrackingToken(currentToken);
    }
  }, [currentEntryId, currentEntryType, state.notes, state.tasks, state.flashcards, state.swims, state.grades, state.galas, state.qts, trackingToken]);

  const handleSave = async (isAutoSave = false) => {
    const effectiveTitle = title || "Untitled";
    if (!title && !isAutoSave) return alert("Title or main property is required");
    // No longer aborting for autosave if title is empty, use Untitled
    
    const userId = "LRA8iDK1iBUKGCdVIOff7CjVhxT2"; // Dummy or real UID
    setIsSaving(true);
    Api.log_to_terminal(`[EntryEditor] Saving ${selectedType} (id: ${currentEntryId || 'NEW'}) - Title: ${effectiveTitle}`);
    
    try {
      if (currentEntryId) {
         // Update
         const freqs = { 'none': null, 'daily': 'daily', 'weekly':'weekly', 'monthly':'monthly' } as any;
         if (selectedType === 'school_notes') {
            const base = state.notes.find(n => n.id === currentEntryId);
            await Api.updateRecord('school_notes', { 
              userId, ...base, id: currentEntryId, title: effectiveTitle, subject, content, 
              createdAt: base?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString() 
            });
         } else if (selectedType === 'tasks') {
            const base = state.tasks.find(t => t.id === currentEntryId);
            await Api.updateRecord('tasks', { 
               userId, ...base, id: currentEntryId, title, subject, isCompleted, taskType, 
               schoolTaskType: taskType === 'school' ? schoolTaskType : (base?.schoolTaskType || null),
               dueDate: dueDate ? new Date(dueDate).toISOString() : (base?.dueDate || null), 
               frequency: freqs[frequency], 
               createdDate: base?.createdDate || new Date().toISOString(),
               reminderEnabled: base?.reminderEnabled ?? false,
               updatedAt: new Date().toISOString()
            });
         } else if (selectedType === 'swim_sessions') {
            const base = state.swims.find(n => n.id === currentEntryId);
            await Api.updateRecord('swim_sessions', { 
               userId, ...base, id: currentEntryId, notes: title, distance, stroke, duration, date: new Date(date).toISOString(), poolLength, caloriesBurned, workoutEffect, 
               updatedAt: new Date().toISOString() 
            });
         } else if (selectedType === 'school_grades') {
            const base = state.grades.find(n => n.id === currentEntryId);
            await Api.updateRecord('school_grades', { 
              userId, ...base, id: currentEntryId, title, score, total, subject, cycle, category, schoolYear, date: new Date(date).toISOString(), 
              updatedAt: new Date().toISOString() 
            });
         } else if (selectedType === 'swim_galas') {
            const base = state.galas.find(n => n.id === currentEntryId);
            await Api.updateRecord('swim_galas', { 
              userId, ...base, id: currentEntryId, name: title, course: galaCourse, location: galaLocation, date: new Date(date).toISOString(), 
              updatedAt: new Date().toISOString() 
            });
         } else if (selectedType === 'qualifying_times') {
            const base = state.qts.find(n => n.id === currentEntryId);
            await Api.updateRecord('qualifying_times', { 
              userId, ...base, id: currentEntryId, name: title, eventName: title, course: qtCourse, targetTime: qtTargetTime, isAchieved: qtIsAchieved, 
              updatedAt: new Date().toISOString() 
            });
         } else if (selectedType === 'flashcards') {
            const base = state.flashcards.find(f => f.id === currentEntryId);
            await Api.updateRecord('flashcards', { 
              userId, ...base, id: currentEntryId, subject: subject || title, question: fcQuestion, answer: fcAnswer, tags: fcTags, linkedNoteIds: fcLinkedNotes, 
              createdAt: base?.createdAt || new Date().toISOString(),
              due: base?.due || new Date().toISOString(),
              updatedAt: new Date().toISOString() 
            });
         }
      } else {
        // Create
        const baseId = crypto.randomUUID();
        
        if (selectedType === 'school_notes') {
          await Api.createRecord('school_notes', { id: baseId, userId, title, subject, content, createdAt: new Date().toISOString() });
        } else if (selectedType === 'tasks') {
          const freqs = { 'none': null, 'daily': 'daily', 'weekly':'weekly', 'monthly':'monthly' } as any;
          await Api.createRecord('tasks', { 
            id: baseId, userId, taskType, title, subject, isCompleted, createdDate: new Date().toISOString(), reminderEnabled: false, 
            dueDate: dueDate ? new Date(dueDate).toISOString() : null, frequency: freqs[frequency], schoolTaskType: taskType === 'school' ? schoolTaskType : null 
          });
        } else if (selectedType === 'swim_sessions') {
          await Api.createRecord('swim_sessions', { 
             id: baseId, userId, date: new Date(date).toISOString(), duration, distance, stroke, notes: title, 
             effortLevel: 5, poolLength, caloriesBurned, workoutEffect, sets: "[]" 
          });
        } else if (selectedType === 'school_grades') {
          await Api.createRecord('school_grades', { 
             id: baseId, userId, subject, title, score, total, cycle, category, date: new Date(date).toISOString(), schoolYear 
          });
        } else if (selectedType === 'swim_galas') {
          await Api.createRecord('swim_galas', { id: baseId, userId, name: title, date: new Date(date).toISOString(), course: galaCourse, location: galaLocation });
        } else if (selectedType === 'qualifying_times') {
          await Api.createRecord('qualifying_times', { id: baseId, userId, name: title, eventName: title, targetTime: qtTargetTime, course: qtCourse, isAchieved: qtIsAchieved });
        } else if (selectedType === 'flashcards') {
          await Api.createRecord('flashcards', { 
            id: baseId, userId, subject: subject || title, question: fcQuestion, answer: fcAnswer,
            stability: 0, difficulty: 0, interval: 0, lapses: 0, due: new Date().toISOString(), createdAt: new Date().toISOString(),
            tags: fcTags, linkedNoteIds: fcLinkedNotes
          });
        }
        
        // CRITICAL: Update the store to track the new record ID, shifting the editor to "Update" mode
        useAppStore.setState({ currentEntryId: baseId, currentEntryType: selectedType });
      }
      
      // AutoSave triggers sync implicitly without bouncing navigation
      if (!isAutoSave) {
         await fetchData();
         setCurrentPage('dashboard');
      }
    } catch (e) {
      console.error(e);
      if (!isAutoSave) alert("Failed to save entry");
    } finally {
      setIsSaving(false);
    }
  };

  // Real-time Autobinder natively syncing fields to Rust Core asynchronously
  useEffect(() => {
     if (!currentEntryId && !title) return; // DON'T auto-save BRAND NEW items with no title (prevents type locking)
     if (currentEntryId && !trackingToken) return; // Still loading existing item 
     
     const timer = setTimeout(() => {
        handleSave(true);
     }, 800);
     Api.log_to_terminal(`[EntryEditor] Auto-save timer started - Type: ${selectedType} - Title: ${title || 'Untitled'} - trackingToken: ${trackingToken || 'NEW'}`);
     return () => clearTimeout(timer);
  }, [
     title, content, subject, date, isCompleted, dueDate, frequency, taskType, schoolTaskType, 
     distance, duration, stroke, poolLength, caloriesBurned, workoutEffect, 
     score, total, cycle, category, schoolYear, galaCourse, galaLocation, qtTargetTime, qtIsAchieved, qtCourse, fcQuestion, fcAnswer, fcTags, fcLinkedNotes,
     currentEntryId, trackingToken, selectedType
  ]);

  const handleDelete = async () => {
    if (!currentEntryId) return;
    try {
      console.log(`[EntryEditor] Invoking delete for id: ${currentEntryId}`);
      await Api.deleteRecord(selectedType, currentEntryId);
      await fetchData();
      setShowDeleteModal(false);
      setCurrentPage('dashboard');
    } catch (e) {
      console.error("[EntryEditor] Delete Failed:", e);
      alert("Failed to delete entry. Check console.");
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto pb-40 relative">
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#191919] z-10 py-4 border-b border-transparent">
        <div className="flex items-center gap-2 text-sm text-[#9b9b9b]">
           <button onClick={() => setCurrentPage('dashboard')} className="hover:text-white transition-colors cursor-pointer flex items-center gap-1">
             <ChevronLeft size={16} /> Dashboard
           </button>
           <span className="text-[#525252]">/</span>
           <span className="text-white truncate max-w-[200px]">{title || 'Untitled'}</span>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
             <span className="text-[10px] text-green-400 font-medium px-2 py-1 bg-green-500/10 rounded mr-2 animate-pulse">Auto-Saving</span>
          )}
          {currentEntryId && (
             <button onClick={() => setShowDeleteModal(true)} className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors">
               Delete
             </button>
          )}
        </div>
      </div>

      <div className="px-2 md:px-12">
        {selectedType === 'tasks' && (
          <div className="mb-4">
             <button onClick={() => setIsCompleted(!isCompleted)} className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-2 ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {isCompleted ? '✓ Completed' : '○ Mark as Complete'}
             </button>
          </div>
        )}

        <input 
          type="text" 
          placeholder={
            selectedType === 'swim_sessions' ? "Session Notes..." : 
            selectedType === 'swim_galas' ? "Gala Name..." : 
            selectedType === 'qualifying_times' ? "Event Name (e.g. 50m Free)" : 
            selectedType === 'flashcards' ? "Flashcard Tag/Subject" : "Untitled"
          }
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            Api.log_to_terminal(`[EntryEditor] Title changed: ${e.target.value}`);
          }}
          className="w-full bg-transparent text-3xl md:text-5xl font-bold placeholder-gray-700 text-white focus:outline-none mb-6"
        />

        {/* Notion Properties Block */}
        <div className="border-b border-white/5 pb-6 mb-6 px-1 flex flex-col gap-3">
          <PropertyRow label="Type">
             {currentEntryId ? (
               <div className="text-sm font-medium text-[#d4d4d4] px-2 py-0.5 bg-white/5 rounded capitalize">
                  {selectedType.replace('_', ' ')}
               </div>
             ) : (
               <select 
                 value={selectedType} 
                 onChange={e => {
                   const newType = e.target.value as any;
                   setSelectedType(newType);
                   useAppStore.setState({ currentEntryType: newType });
                 }} 
                 className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer focus:outline-none outline-none"
               >
                 {entryTypes.map(t => <option key={t.value} value={t.value} className="bg-[#191919]">{t.label}</option>)}
               </select>
             )}
          </PropertyRow>
          
          {(selectedType === 'school_notes' || selectedType === 'tasks' || selectedType === 'school_grades') && (
            <PropertyRow label="Subject">
               <select value={subject} onChange={e => setSubject(e.target.value)} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer focus:outline-none outline-none">
                 {subjects.map(s => <option key={s} value={s} className="bg-[#191919]">{s}</option>)}
               </select>
            </PropertyRow>
          )}

          {selectedType === 'tasks' && (
            <>
               <PropertyRow label="Due Date">
                 <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none scheme-dark" />
               </PropertyRow>
               <PropertyRow label="Task Category">
                 <select value={taskType} onChange={e => setTaskType(e.target.value as any)} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer focus:outline-none outline-none">
                   <option value="school" className="bg-[#191919]">School</option>
                   <option value="task" className="bg-[#191919]">Personal/General</option>
                 </select>
               </PropertyRow>
               {taskType === 'school' && (
                 <PropertyRow label="School Task Type">
                    <select value={schoolTaskType} onChange={e => setSchoolTaskType(e.target.value)} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer focus:outline-none outline-none">
                      <option value="assignment" className="bg-[#191919]">Assignment</option>
                      <option value="classTest" className="bg-[#191919]">Class Test</option>
                      <option value="exam" className="bg-[#191919]">Exam</option>
                      <option value="ssa" className="bg-[#191919]">SSA</option>
                    </select>
                 </PropertyRow>
               )}
               <PropertyRow label="Frequency">
                 <select value={frequency} onChange={e => setFrequency(e.target.value)} className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer focus:outline-none outline-none">
                   <option value="none" className="bg-[#191919]">None</option>
                   <option value="daily" className="bg-[#191919]">Daily</option>
                   <option value="weekly" className="bg-[#191919]">Weekly</option>
                   <option value="monthly" className="bg-[#191919]">Monthly</option>
                 </select>
               </PropertyRow>
            </>
          )}

          {(selectedType === 'swim_sessions' || selectedType === 'school_grades' || selectedType === 'swim_galas') && (
            <PropertyRow label="Date">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none scheme-dark" />
            </PropertyRow>
          )}

          {selectedType === 'swim_sessions' && (
            <>
              <PropertyRow label="Distance (m)">
                <input type="number" value={distance} onChange={e => setDistance(Number(e.target.value))} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-24" />
              </PropertyRow>
              <PropertyRow label="Duration (mins)">
                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-24" />
              </PropertyRow>
              <PropertyRow label="Stroke">
                <select value={stroke} onChange={e => setStroke(e.target.value)} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer focus:outline-none outline-none">
                  {strokes.map(s => <option key={s} value={s} className="bg-[#191919]">{s}</option>)}
                </select>
              </PropertyRow>
              <PropertyRow label="Pool Length">
                 <input type="number" value={poolLength} onChange={e => setPoolLength(Number(e.target.value))} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-24" />
              </PropertyRow>
              <PropertyRow label="Calories">
                 <input type="number" value={caloriesBurned} onChange={e => setCaloriesBurned(Number(e.target.value))} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-24" />
              </PropertyRow>
              <PropertyRow label="Effect">
                 <input type="text" value={workoutEffect} onChange={e => setWorkoutEffect(e.target.value)} placeholder="Aerobic..." className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none" />
              </PropertyRow>
            </>
          )}

          {/* New Properties for Galas & QTs */}
          {(selectedType === 'swim_galas' || selectedType === 'qualifying_times') && (
             <PropertyRow label="Course">
               <select value={selectedType === 'swim_galas' ? galaCourse : qtCourse} onChange={e => selectedType === 'swim_galas' ? setGalaCourse(e.target.value) : setQtCourse(e.target.value)} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded cursor-pointer focus:outline-none outline-none">
                 <option value="Short Course (25m)" className="bg-[#191919]">Short Course (25m)</option>
                 <option value="Long Course (50m)" className="bg-[#191919]">Long Course (50m)</option>
               </select>
             </PropertyRow>
          )}
          {selectedType === 'swim_galas' && (
             <PropertyRow label="Location">
               <input type="text" value={galaLocation} onChange={e => setGalaLocation(e.target.value)} placeholder="City / Pool Name" className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none" />
             </PropertyRow>
          )}
          {selectedType === 'qualifying_times' && (
             <>
               <PropertyRow label="Target (MM:SS.ms)">
                 <div className="flex flex-col gap-1 w-full max-w-[200px]">
                   <input 
                      type="text" 
                      value={qtDisplayTime} 
                      onChange={e => {
                        const val = e.target.value;
                        setQtDisplayTime(val);
                        const ms = parseSwimTime(val);
                        setQtTargetTime(ms);
                      }}
                      onBlur={() => setQtDisplayTime(formatSwimTime(qtTargetTime))}
                      placeholder="MM:SS.ms" 
                      className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-full border-b border-white/10" 
                   />
                   <span className="text-[10px] text-[#525252]">Example: 1:23.45 or 50.00</span>
                 </div>
               </PropertyRow>
               <PropertyRow label="Status">
                 <button onClick={() => setQtIsAchieved(!qtIsAchieved)} className={`px-2 py-1 rounded text-xs font-semibold select-none ${qtIsAchieved ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-[#9b9b9b] hover:text-white'}`}>
                    {qtIsAchieved ? '✓ Achieved' : 'Pending'}
                 </button>
               </PropertyRow>
             </>
          )}
          {selectedType === 'flashcards' && (
             <>
               <PropertyRow label="Front Card">
                 <textarea value={fcQuestion} onChange={e => setFcQuestion(e.target.value)} placeholder="Question goes here..." className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-1 rounded focus:outline-none w-full min-h-[60px] resize-none" />
               </PropertyRow>
               <PropertyRow label="Back Card">
                 <textarea value={fcAnswer} onChange={e => setFcAnswer(e.target.value)} placeholder="Hidden Answer..." className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-1 rounded focus:outline-none w-full min-h-[100px] resize-none" />
               </PropertyRow>
               <PropertyRow label="Tags">
                  <input type="text" value={fcTags.join(", ")} onChange={e => setFcTags(e.target.value.split(',').map(t => t.trim()).filter(t => t))} placeholder="tag1, tag2..." className="bg-transparent text-sm text-purple-400 hover:bg-white/5 px-2 py-1 rounded focus:outline-none w-full" />
               </PropertyRow>
               <PropertyRow label="Linked Notes">
                  <input type="text" value={fcLinkedNotes.join(", ")} onChange={e => setFcLinkedNotes(e.target.value.split(',').map(t => t.trim()).filter(t => t))} placeholder="note_id_1, note_id_2..." className="bg-transparent text-sm text-blue-400 hover:bg-white/5 px-2 py-1 rounded focus:outline-none w-full" />
               </PropertyRow>
             </>
          )}

          {selectedType === 'school_grades' && (
             <>
               <PropertyRow label="Score">
                 <div className="flex items-center gap-1">
                   <input type="number" value={score} onChange={e => setScore(Number(e.target.value))} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-16" />
                   <span className="text-[#525252]">/</span>
                   <input type="number" value={total} onChange={e => setTotal(Number(e.target.value))} className="bg-transparent text-sm text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-16" />
                   <span className="text-white ml-2 font-medium">{Math.round((score/total)*100)}%</span>
                 </div>
               </PropertyRow>
               <PropertyRow label="Cycle">
                 <input type="text" value={cycle} onChange={e => setCycle(e.target.value)} placeholder="Term 1" className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none" />
               </PropertyRow>
               <PropertyRow label="Category">
                 <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Test, Exam, etc" className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none" />
               </PropertyRow>
               <PropertyRow label="School Year">
                 <input type="number" value={schoolYear} onChange={e => setSchoolYear(Number(e.target.value))} className="bg-transparent text-sm text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-0.5 rounded focus:outline-none w-24" />
               </PropertyRow>
             </>
          )}
        </div>

        {/* Editor for content-heavy types like Notes */}
        {selectedType === 'school_notes' && (
          <NotionEditor documentId={currentEntryId} initialContent={content} onChange={setContent} />
        )}
      </div>

      {/* React Confirm Custom Dialog */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 items-center justify-center flex animate-in fade-in duration-200">
          <div className="bg-[#191919] border border-white/10 rounded-xl p-6 shadow-2xl max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-2">Delete entry?</h2>
            <p className="text-sm text-[#9b9b9b] mb-6">Are you sure you want to completely remove this data block? This action cannot be undone.</p>
            <div className="flex gap-4 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-white transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-semibold transition-colors">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function PropertyRow({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 group py-1">
       <div className="w-full sm:w-32 text-[11px] sm:text-sm text-[#525252] flex items-center gap-2 uppercase tracking-tight sm:tracking-normal shrink-0">
          {label}
       </div>
       <div className="flex-1 flex items-center min-w-0 w-full">
         {children}
       </div>
    </div>
  );
}
