import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, Heading1, Heading2, CheckSquare, Highlighter, ImageIcon, Loader2, GitBranch } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

interface Props {
  content: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  enableImageUpload?: boolean;
  onInsertDiagram?: () => void;
  insertImageSrc?: string;
}

export default function RichTextEditor({ content, onChange, placeholder = 'Écrivez ici...', readOnly = false, enableImageUpload = false, onInsertDiagram, insertImageSrc }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && insertImageSrc) {
      editor.chain().focus().setImage({ src: insertImageSrc }).run();
    }
  }, [insertImageSrc]);

  const handleImageUpload = (file: File) => {
    if (!editor) return;
    setUploadProgress(0);
    const storageRef = ref(storage, `editor/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed',
      (snap) => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      () => setUploadProgress(null),
      () => {
        getDownloadURL(task.snapshot.ref).then(src => {
          editor.chain().focus().setImage({ src }).run();
          setUploadProgress(null);
        });
      }
    );
  };

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
        {enableImageUpload && (
          <>
            <div className="w-px bg-gray-300 mx-1" />
            <button
              type="button"
              title="Insérer une image"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
              className="p-1.5 rounded transition-colors text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              {uploadProgress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            </button>
            {uploadProgress !== null && (
              <span className="text-xs text-gray-500 self-center ml-1">{uploadProgress}%</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = '';
              }}
            />
          </>
        )}
        {onInsertDiagram && (
          <>
            <div className="w-px bg-gray-300 mx-1" />
            <button
              type="button"
              title="Insérer un schéma"
              onClick={onInsertDiagram}
              className="flex items-center gap-1 px-2 py-1.5 rounded transition-colors text-purple-600 hover:bg-purple-50 text-xs font-medium"
            >
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">Schéma</span>
            </button>
          </>
        )}
      </div>
      <div className="p-3 min-h-[120px] prose prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
