import { useState, useEffect, useCallback, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import { BrainCircuit } from "lucide-react";
import { Api } from "../../api";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface NotionEditorProps {
  documentId?: string | null;
  initialContent?: string;
  onChange: (content: string) => void;
}

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

  const editor = useCreateBlockNote(parsedBlocks ? { initialContent: parsedBlocks } : undefined);
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
      e.insertBlocks(
        [
          {
            type: "paragraph",
            content: "📚 Flashcard linked to this note! Open the Flashcards tab to review.",
          },
        ],
        e.getTextCursorPosition().block,
        "after"
      );

      Api.createRecord('flashcards', {
        id: "",
        userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2",
        subject: "General",
        question: "New Flashcard Question (Click to Edit)",
        answer: "New Flashcard Answer",
        stability: 0,
        difficulty: 0,
        interval: 0,
        lapses: 0,
        due: new Date().toISOString(),
        linkedNoteIds: documentId ? [documentId] : [],
        createdAt: new Date().toISOString()
      }).then(() => {
          console.log("Flashcard sent to backend");
      });
    },
    aliases: ["flashcard", "card", "fc"],
    group: "Other",
    icon: <BrainCircuit size={18} />,
    subtext: "Create an FSRS Flashcard natively",
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
    <div className="notion-editor-wrapper -mx-10 pl-4 pr-1">
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
