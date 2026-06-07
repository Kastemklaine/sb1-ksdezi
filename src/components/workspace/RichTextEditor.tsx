import { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, Heading1, Heading2, Save } from 'lucide-react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  onSave?: () => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function SimpleRichTextEditor({ content, onChange, onSave, placeholder, readOnly }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content || '';
    }
  }, []); // Only on mount

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  if (readOnly) {
    return (
      <div
        className="prose prose-sm max-w-none p-3"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('bold'); }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Gras"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('italic'); }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Italique"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('underline'); }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Souligné"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h1'); }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Titre 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h2'); }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Titre 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Liste à puces"
        >
          <List className="w-4 h-4" />
        </button>
        {onSave && (
          <>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors touch-manipulation min-h-[36px]"
            >
              <Save className="w-3 h-3" />
              Enregistrer
            </button>
          </>
        )}
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder ?? 'Rédigez votre contenu...'}
        className="min-h-[200px] p-3 text-sm text-gray-800 focus:outline-none prose prose-sm max-w-none"
        style={{ whiteSpace: 'pre-wrap' }}
        suppressContentEditableWarning
      />
    </div>
  );
}
