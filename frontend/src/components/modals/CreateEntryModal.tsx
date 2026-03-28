import { useState } from 'react';
import { X, Save } from 'lucide-react';
import NotionEditor from '../editor/NotionEditor';
import { Api } from '../../api';

interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function CreateEntryModal({ onClose, onSaved }: ModalProps) {
  const [type, setType] = useState('school_notes');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Example specific state
  const [subject, setSubject] = useState('Mathematics');
  
  const subjects = ['Mathematics', 'English', 'Afrikaans', 'Physics', 'AP Math', 'EGD', 'Geography', 'Life Orientation', 'Information Technologies'];

  const handleSave = async () => {
    if (!title) return alert("Title required");
    
    try {
      if (type === 'school_notes') {
        await Api.createRecord('school_notes', {
          id: "",
          userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2",
          title,
          subject,
          content,
          createdAt: new Date().toISOString()
        });
      } else if (type === 'tasks') {
        await Api.createRecord('tasks', {
          id: "",
          userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2",
          taskType: 'school',
          title,
          subject,
          isCompleted: false,
          createdDate: new Date().toISOString(),
          reminderEnabled: false
        });
      } else if (type === 'flashcards') {
        await Api.createRecord('flashcards', {
          id: "",
          userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2",
          subject,
          question: title,
          answer: content || "See content",
          stability: 0,
          difficulty: 0,
          due: new Date().toISOString(),
          interval: 0,
          lapses: 0,
          createdAt: new Date().toISOString()
        });
      }
      
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#191919] border border-white/10 w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col scale-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <select 
            className="bg-transparent border-none text-[#9b9b9b] font-medium text-sm focus:ring-0 cursor-pointer hover:text-white transition-colors"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="school_notes" className="bg-[#191919]">📝 New Note</option>
            <option value="tasks" className="bg-[#191919]">✅ New Task</option>
            <option value="flashcards" className="bg-[#191919]">🧠 New Flashcard</option>
          </select>
          
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded hover:bg-gray-200 transition-colors">
              <Save size={14} />
              Save
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 md:px-16 md:py-12">
          
          {/* Metadata Section */}
          <div className="mb-8 space-y-4">
            <input 
              type="text"
              placeholder="Untitled"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-transparent text-4xl font-bold text-white placeholder-gray-600 focus:outline-none"
            />
            
            <div className="flex gap-4 items-center">
              <div className="w-24 text-sm text-[#9b9b9b] flex items-center gap-2">
                <span>Subject</span>
              </div>
              <select 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none hover:bg-white/5 px-2 py-1 rounded cursor-pointer"
              >
                {subjects.map(s => <option key={s} value={s} className="bg-[#191919]">{s}</option>)}
              </select>
            </div>
          </div>
          
          {/* Block Editor bounds */}
          <div className="border-t border-white/5 pt-8">
            <NotionEditor onChange={setContent} />
          </div>

        </div>
      </div>
    </div>
  );
}
