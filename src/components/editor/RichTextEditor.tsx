import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, Heading1, Heading2, CheckSquare, Highlighter } from 'lucide-react';

interface Props {
  content: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function RichTextEditor({ content, onChange, placeholder = 'Écrivez ici...', readOnly = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  if (!editor) return null;

  if (readOnly) {
    return (
      <div className="prose prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
    );
  }

  const btn = (action: () => boolean, active: boolean, Icon: React.ElementType, title: string) => (
    <button
      type="button"
      title={title}
      onClick={() => action()}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-gray-200 bg-gray-50">
        {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), Bold, 'Gras')}
        {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), Italic, 'Italique')}
        {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), UnderlineIcon, 'Souligné')}
        {btn(() => editor.chain().focus().toggleHighlight().run(), editor.isActive('highlight'), Highlighter, 'Surligner')}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), Heading1, 'Titre 1')}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), Heading2, 'Titre 2')}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), List, 'Liste')}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), ListOrdered, 'Liste numérotée')}
        {btn(() => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList'), CheckSquare, 'Liste de tâches')}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), AlignLeft, 'Aligner à gauche')}
        {btn(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), AlignCenter, 'Centrer')}
      </div>
      <div className="p-3 min-h-[120px] prose prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
