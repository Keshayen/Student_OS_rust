import { useState, useEffect, useCallback, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
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

  // ONLY load complex conversions dynamically (Tiptap HTML, Flutter Quill Delta) 
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function loadLegacy() {
      if (parsedBlocks || !initialContent) {
        setContentLoaded(true);
        return;
      }
      try {
        let parsed;
        try {
          parsed = JSON.parse(initialContent);
        } catch (e) {
          // If not json, raw text/markdown
          const blocks = await editor.tryParseHTMLToBlocks(`<p>${initialContent}</p>`);
          editor.replaceBlocks(editor.document, blocks);
          setContentLoaded(true);
          return;
        }

        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].insert !== undefined) {
           // Flutter Quill Delta Format! 
           const text = parsed.map(op => op.insert || "").join("");
           const blocks = await editor.tryParseHTMLToBlocks(`<p>${text.replace(/\n/g, '<br>')}</p>`);
           editor.replaceBlocks(editor.document, blocks);
        } else if (parsed && parsed.type === "doc" || parsed.content) {
           // Legacy Tiptap JSON Format. generate HTML using starter-kit and parse natively.
           const html = generateHTML(parsed, [StarterKit]);
           const blocks = await editor.tryParseHTMLToBlocks(html);
           editor.replaceBlocks(editor.document, blocks);
        } else {
           // Unknown JSON - Initialize empty
           editor.replaceBlocks(editor.document, [{ type: "paragraph" }]);
        }
      } catch (e) {
        console.error("Failed to parse legacy initial content", e);
      }
      setContentLoaded(true);
    }
    loadLegacy();
  }, [documentId, editor, initialContent, parsedBlocks]);

  // Flashcard Custom Slash Command
  const insertFlashcardItem = (e: typeof editor) => ({
    title: "Create Flashcard",
    onItemClick: () => {
      const q = window.prompt("Flashcard Question:");
      if (!q) return;
      const a = window.prompt("Flashcard Answer:");
      if (!a) return;
      Api.createRecord('flashcards', {
        id: "", userId: "LRA8iDK1iBUKGCdVIOff7CjVhxT2", subject: "Editor Generated", question: q, answer: a,
        stability: 0, difficulty: 0, due: new Date().toISOString(), interval: 0, lapses: 0, createdAt: new Date().toISOString()
      }).then(() => {
          console.log("Flashcard sent to backend");
          // Optionally insert a visual placeholder block natively inside BlockNote
          e.insertBlocks([{ type: "paragraph", content: `⚡ Flashcard added: ${q}` }], e.getTextCursorPosition().block, "after");
      });
    },
    aliases: ["flashcard", "card", "fc"],
    group: "Learning",
    icon: <span className="text-purple-400 font-bold ml-1">⚡</span>,
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
