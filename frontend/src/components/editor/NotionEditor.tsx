import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface NotionEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export default function NotionEditor({ initialContent, onChange, readOnly }: NotionEditorProps) {
  const parsedContent = initialContent ? (() => {
    try { return JSON.parse(initialContent); } catch { return undefined; }
  })() : undefined;

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  return (
    <div className="notion-editor-wrapper -ml-12 min-h-[300px]">
      <BlockNoteView 
        editor={editor} 
        theme="dark" 
        onChange={() => onChange(JSON.stringify(editor.document))}
        editable={!readOnly}
      />
    </div>
  );
}
