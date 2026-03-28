import { useState, useEffect, useCallback, useRef } from "react";
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
      subject: { default: "General" },
      flashcardId: { default: "" },
      tags: { default: "" }, // String-serialized list for easy editing
      linkedNoteIds: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const syncToBackend = () => {
         if (props.block.props.flashcardId) {
             Api.getFlashcards().then(cards => {
                 const card = cards.find(c => c.id === props.block.props.flashcardId);
                 if (card) Api.updateRecord("flashcards", { 
                    ...card, 
                    question: props.block.props.question, 
                    answer: props.block.props.answer, 
                    subject: props.block.props.subject,
                    tags: props.block.props.tags.split(",").map((t: string) => t.trim()).filter((t: string) => t),
                    linkedNoteIds: props.block.props.linkedNoteIds.split(",").map((t: string) => t.trim()).filter((t: string) => t),
                 });
             });
         }
      };

      return (
        <div className="bg-[#1e1e1e] border border-purple-500/30 rounded-xl p-4 my-2 flex flex-col gap-3 relative overflow-hidden group w-full" contentEditable={false}>
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
             <BrainCircuit size={80} className="text-purple-400" />
          </div>
          <div className="flex items-center gap-2 mb-1">
             <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider z-10">Flashcard</span>
             <input 
               value={props.block.props.subject} 
               onChange={(e) => props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, subject: e.target.value }})}
               onBlur={syncToBackend}
               placeholder="Tag / Subject"
               className="bg-transparent text-xs font-semibold text-[#9b9b9b] hover:text-white px-2 py-1 rounded focus:outline-none z-10 border-none outline-none w-32 border border-transparent focus:border-white/10"
             />
          </div>
          <input 
             value={props.block.props.question}
             onChange={(e) => props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, question: e.target.value }})}
             onBlur={syncToBackend}
             placeholder="Front / Question..."
             className="bg-transparent text-xl font-bold text-white placeholder-white/30 focus:outline-none z-10 w-full"
          />
          <div className="w-full h-px bg-white/10 my-1 z-10" />
          <textarea 
             value={props.block.props.answer}
             onChange={(e) => props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, answer: e.target.value }})}
             onBlur={syncToBackend}
             placeholder="Back / Answer hidden until revealed..."
             className="bg-transparent text-sm text-[#d4d4d4] placeholder-white/20 focus:outline-none z-10 w-full resize-none min-h-[60px]"
          />
          <div className="flex gap-4 z-10 px-1 pt-2 border-t border-white/5">
             <div className="flex-1 flex flex-col gap-1">
               <span className="text-[8px] text-[#525252] font-black uppercase tracking-tighter">Tags</span>
               <input 
                 value={props.block.props.tags}
                 onChange={(e) => props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, tags: e.target.value }})}
                 onBlur={syncToBackend}
                 placeholder="separate by comma"
                 className="bg-transparent text-[10px] text-purple-400 font-bold focus:outline-none w-full"
               />
             </div>
             <div className="flex-1 flex flex-col gap-1">
               <span className="text-[8px] text-[#525252] font-black uppercase tracking-tighter">Linked Notes</span>
               <input 
                 value={props.block.props.linkedNoteIds}
                 onChange={(e) => props.editor.updateBlock(props.block, { type: "flashcard", props: { ...props.block.props, linkedNoteIds: e.target.value }})}
                 onBlur={syncToBackend}
                 placeholder="ID pairs"
                 className="bg-transparent text-[10px] text-blue-400 font-bold focus:outline-none w-full"
               />
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
            props: { flashcardId: fcId, question: "", answer: "", subject: "General" },
          } as any,
        ],
        e.getTextCursorPosition().block,
        "after"
      );

      Api.createRecord('flashcards', {
        id: fcId,
        userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2",
        subject: "General",
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
