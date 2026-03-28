import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "../../store";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { getDefaultReactSlashMenuItems, SuggestionMenuController, createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { BrainCircuit } from "lucide-react";
import { Api } from "../../api";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface NotionEditorProps {
  documentId?: string | null;
  initialContent?: string;
  onChange: (content: string) => void;
}

const FlashcardBlock = createReactBlockSpec(
  {
    type: "flashcard",
    propSchema: {
      question: { default: "" },
      answer: { default: "" },
      subject: { default: "" },
      flashcardId: { default: "" },
      tags: { default: "" }, // String-serialized list for easy editing
      linkedNoteIds: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const flashcards = useAppStore(state => state.flashcards);
      const notes = useAppStore(state => state.notes);
      
      const [tagQuery, setTagQuery] = useState("");
      const [noteQuery, setNoteQuery] = useState("");
      const [showTagDropdown, setShowTagDropdown] = useState(false);
      const [showNoteDropdown, setShowNoteDropdown] = useState(false);

      const syncToBackend = () => {
         if (props.block.props.flashcardId) {
             Api.getFlashcards().then(cards => {
                 const card = cards.find(c => c.id === props.block.props.flashcardId);
                 if (card) Api.updateRecord("flashcards", { 
                    ...card, 
                    question: props.block.props.question, 
                    answer: props.block.props.answer, 
                    tags: props.block.props.tags.split(",").map((t: string) => t.trim()).filter((t: string) => t),
                    linkedNoteIds: props.block.props.linkedNoteIds.split(",").map((t: string) => t.trim()).filter((t: string) => t),
                 });
             });
         }
      };

      const existingTags = Array.from(new Set(flashcards.flatMap(f => Array.isArray(f.tags) ? f.tags : []))).filter(Boolean);
      const filteredTags = existingTags.filter(t => t.toLowerCase().includes(tagQuery.toLowerCase())).slice(0, 5);
      const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(noteQuery.toLowerCase())).slice(0, 5);

      return (
        <div className="bg-[#1e1e1e] border border-purple-500/30 rounded-lg p-3 my-2 flex flex-col gap-2 relative group w-full max-w-2xl" contentEditable={false}>
          <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
             <BrainCircuit size={40} className="text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
             <span className="bg-purple-500/20 text-purple-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider z-10">Flashcard</span>
          </div>
          <input 
             value={props.block.props.question}
             onChange={(e) => props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, question: e.target.value }})}
             onBlur={syncToBackend}
             placeholder="Question..."
             className="bg-transparent text-lg font-bold text-white placeholder-white/30 focus:outline-none z-10 w-full"
          />
          <textarea 
             value={props.block.props.answer}
             onChange={(e) => props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, answer: e.target.value }})}
             onBlur={syncToBackend}
             placeholder="Answer..."
             className="bg-transparent text-xs text-[#9b9b9b] placeholder-white/10 focus:outline-none z-10 w-full resize-none min-h-[40px] leading-tight"
          />
          
          <div className="flex flex-col gap-1.5 z-10 pt-2 border-t border-white/5 mt-1 relative">
             <div className="flex items-center gap-3">
               {/* TAGS AUTOCOMPLETE */}
               <div className="flex-1 flex flex-col gap-1 relative">
                 <span className="text-[8px] text-[#525252] font-black uppercase tracking-tighter">Tags</span>
                 <input 
                   value={tagQuery || props.block.props.tags}
                   onChange={(e) => {
                     setTagQuery(e.target.value);
                     setShowTagDropdown(true);
                     props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, tags: e.target.value }});
                   }}
                   onFocus={() => setShowTagDropdown(true)}
                   onBlur={() => { setTimeout(() => setShowTagDropdown(false), 200); syncToBackend(); }}
                   placeholder="Add tags..."
                   className="bg-transparent text-[10px] text-purple-400/80 font-bold focus:outline-none w-full"
                 />
                 {showTagDropdown && filteredTags.length > 0 && (
                   <div className="absolute bottom-full mb-1 left-0 w-full bg-[#252525] border border-white/10 rounded shadow-xl z-50 overflow-hidden">
                     {filteredTags.map(tag => (
                       <div 
                         key={tag} 
                         onClick={() => {
                           const current = props.block.props.tags || "";
                           const tags = current.split(",").map(t => t.trim()).filter(Boolean);
                           if (!tags.includes(tag)) {
                             const newVal = [...tags, tag].join(", ");
                             props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, tags: newVal }});
                             setTagQuery("");
                           }
                           setShowTagDropdown(false);
                         }}
                         className="px-2 py-1 text-[10px] text-purple-300 hover:bg-purple-500/20 cursor-pointer transition-colors"
                       >
                         {tag}
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               {/* NOTES AUTOCOMPLETE */}
               <div className="flex-1 flex flex-col gap-1 border-l border-white/5 pl-3 relative">
                 <span className="text-[8px] text-[#525252] font-black uppercase tracking-tighter">Link Notes</span>
                 <div className="flex flex-wrap gap-1 mb-1">
                   {props.block.props.linkedNoteIds.split(",").map((id: string) => {
                      const trimmedId = id.trim();
                      if (!trimmedId) return null;
                      const noteTitle = notes.find(n => n.id === trimmedId)?.title || trimmedId;
                      return (
                        <span key={trimmedId} className="text-[9px] text-blue-400/60 font-medium truncate max-w-[80px]">
                          {noteTitle}
                        </span>
                      );
                   })}
                 </div>
                 <input 
                   value={noteQuery}
                   onChange={(e) => {
                     setNoteQuery(e.target.value);
                     setShowNoteDropdown(true);
                   }}
                   onFocus={() => setShowNoteDropdown(true)}
                   onBlur={() => { setTimeout(() => setShowNoteDropdown(false), 200); syncToBackend(); }}
                   placeholder="+ note title..."
                   className="bg-transparent text-[10px] text-blue-400/80 font-bold focus:outline-none w-full"
                 />
                 {showNoteDropdown && filteredNotes.length > 0 && (
                   <div className="absolute bottom-full mb-1 left-0 w-full bg-[#252525] border border-white/10 rounded shadow-xl z-50 overflow-hidden">
                     {filteredNotes.map(note => (
                       <div 
                         key={note.id} 
                         onClick={() => {
                           const current = props.block.props.linkedNoteIds || "";
                           const ids = current.split(",").map(id => id.trim()).filter(Boolean);
                           if (!ids.includes(note.id)) {
                             const newVal = [...ids, note.id].join(", ");
                             props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, linkedNoteIds: newVal }});
                             setNoteQuery("");
                           }
                           setShowNoteDropdown(false);
                         }}
                         className="px-2 py-1 text-[10px] text-blue-300 hover:bg-blue-500/20 cursor-pointer transition-colors"
                       >
                         {note.title}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>
      );
    },
  }
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    flashcard: FlashcardBlock(),
  },
});

export default function NotionEditor({ documentId, initialContent, onChange }: NotionEditorProps) {
  const parsedBlocks = useState(() => {
    if (!initialContent) return undefined;
    try {
      const parsed = JSON.parse(initialContent);
      // Valid Blocknote Array Structure Identificiation
      if (Array.isArray(parsed) && (parsed.length === 0 || parsed[0].insert === undefined)) {
        return parsed as any;
      }
    } catch {}
    return undefined;
  })[0];

  const editor = useCreateBlockNote(parsedBlocks ? { schema, initialContent: parsedBlocks } : { schema });
  const [contentLoaded, setContentLoaded] = useState(!!parsedBlocks);
  const initializedRef = useRef(false);

  // Start completely fresh if not recognized
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (parsedBlocks || !initialContent) {
      setContentLoaded(true);
      return;
    }

    // Default to an empty paragraph if entirely unknown content arrives
    editor.replaceBlocks(editor.document, [{ type: "paragraph" }]);
    setContentLoaded(true);
  }, [editor, initialContent, parsedBlocks]);

  // Flashcard Custom Slash Command
  const insertFlashcardItem = (e: typeof editor) => ({
    title: "Create Flashcard",
    onItemClick: () => {
      const fcId = crypto.randomUUID();
      e.insertBlocks(
        [
          {
            type: "flashcard",
            props: { flashcardId: fcId, question: "", answer: "", subject: "" },
          } as any,
        ],
        e.getTextCursorPosition().block,
        "after"
      );

      Api.createRecord('flashcards', {
        id: fcId,
        userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2",
        subject: "",
        question: "",
        answer: "",
        stability: 0,
        difficulty: 0,
        interval: 0,
        lapses: 0,
        due: new Date().toISOString(),
        linkedNoteIds: documentId ? [documentId] : [],
        tags: [],
        createdAt: new Date().toISOString()
      }).then(() => {
          console.log("Flashcard CRDT provisioned");
      });
    },
    aliases: ["flashcard", "card", "fc"],
    group: "Other",
    icon: <BrainCircuit size={18} />,
    subtext: "Create a native FSRS component inline",
  });

  const getSlashMenuItems = useCallback(async (query: string) => {
    const items = [...getDefaultReactSlashMenuItems(editor), insertFlashcardItem(editor)];
    return items.filter((item) =>
      item.title.toLowerCase().startsWith(query.toLowerCase()) || 
      item.aliases?.some(a => a.toLowerCase().startsWith(query.toLowerCase()))
    );
  }, [editor]);

  if (!contentLoaded) return <div className="text-[#525252] font-semibold text-sm p-4 animate-pulse">Loading editor...</div>;

  return (
    <div className="notion-editor-wrapper md:-mx-10 mx-0 pl-4 pr-1 min-h-[500px]">
      <BlockNoteView 
        editor={editor} 
        onChange={() => onChange(JSON.stringify(editor.document))} 
        theme="dark" 
        slashMenu={false}
      >
        {/* @ts-ignore */}
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={getSlashMenuItems}
        />
      </BlockNoteView>
    </div>
  );
}
