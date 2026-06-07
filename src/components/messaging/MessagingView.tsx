import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, doc, arrayUnion, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { MessageSquare, Plus, X, Send, Paperclip, Loader2, FileText, ArrowLeft } from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Message {
  id: string;
  fromId: string;
  fromName: string;
  toId: string | null;
  workstreamId?: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
  readBy: string[];
  threadId?: string;
}

type MobilePanel = 'list' | 'detail';

export default function MessagingView() {
  const currentUser = useAuthStore(s => s.currentUser);
  const users = useAuthStore(s => s.users);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('list');

  // Compose form state
  const [toId, setToId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          fromId: data.fromId ?? '',
          fromName: data.fromName ?? '',
          toId: data.toId ?? null,
          workstreamId: data.workstreamId,
          subject: data.subject ?? '',
          body: data.body ?? '',
          attachments: data.attachments ?? [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          readBy: data.readBy ?? [],
          threadId: data.threadId,
        };
      });
      setMessages(msgs);
      setLoading(false);
    }, () => {
      // Firestore not configured yet — show empty inbox
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const inbox = messages.filter(m =>
    m.toId === null ||
    m.toId === currentUser?.id ||
    m.fromId === currentUser?.id
  );

  const unreadCount = inbox.filter(
    m => currentUser && !m.readBy.includes(currentUser.id) && m.fromId !== currentUser.id
  ).length;

  const markAsRead = async (msg: Message) => {
    if (!currentUser || msg.readBy.includes(currentUser.id)) return;
    try {
      await updateDoc(doc(db, 'messages', msg.id), { readBy: arrayUnion(currentUser.id) });
    } catch { /* Firestore not configured */ }
  };

  const handleSelect = (msg: Message) => {
    setSelectedMessage(msg);
    markAsRead(msg);
    setMobilePanel('detail');
  };

  const handleBackToList = () => {
    setMobilePanel('list');
  };

  const handleAttachFile = (file: File) => {
    const tempId = `temp_${Date.now()}`;
    const storageRef = ref(storage, `attachments/${tempId}/${file.name}`);
    setUploading(true);
    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed',
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { console.error(err); setUploading(false); setUploadProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setAttachments(prev => [...prev, { name: file.name, url, type: file.type, size: file.size }]);
        setUploading(false);
        setUploadProgress(null);
      }
    );
  };

  const handleSend = async () => {
    if (!currentUser || !subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        fromId: currentUser.id,
        fromName: currentUser.name,
        toId: toId || null,
        subject: subject.trim(),
        body,
        attachments,
        createdAt: serverTimestamp(),
        readBy: [currentUser.id],
      });
      setShowCompose(false);
      setToId('');
      setSubject('');
      setBody('');
      setAttachments([]);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Left inbox list panel
  const listPanel = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold text-gray-800">Messagerie</h2>
          {unreadCount > 0 && (
            <span className="bg-green-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px]"
        >
          <Plus className="w-3 h-3" />
          Nouveau
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : inbox.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-12">
            Aucun message
          </div>
        ) : (
          inbox.map(msg => {
            const isUnread = currentUser && !msg.readBy.includes(currentUser.id) && msg.fromId !== currentUser.id;
            const isSelected = selectedMessage?.id === msg.id;
            return (
              <button
                key={msg.id}
                onClick={() => handleSelect(msg)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {isUnread && <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className={`text-xs truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {msg.fromId === currentUser?.id ? `À : ${msg.toId ? (users.find(u => u.id === msg.toId)?.name ?? msg.toId) : 'Tous'}` : msg.fromName}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0 ml-1">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{msg.subject}</p>
                    {msg.attachments.length > 0 && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Paperclip className="w-3 h-3" /> {msg.attachments.length} pièce{msg.attachments.length > 1 ? 's' : ''} jointe{msg.attachments.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // Right detail panel
  const detailPanel = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
      {selectedMessage ? (
        <>
          <div className="p-4 sm:p-5 border-b border-gray-100">
            {/* Back button — mobile only */}
            <button
              onClick={handleBackToList}
              className="md:hidden flex items-center gap-2 text-sm text-green-600 font-medium mb-3 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            <h3 className="text-lg font-semibold text-gray-900">{selectedMessage.subject}</h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm text-gray-500">
              <span>De : <span className="font-medium text-gray-700">{selectedMessage.fromName}</span></span>
              <span>À : <span className="font-medium text-gray-700">{selectedMessage.toId ? (users.find(u => u.id === selectedMessage.toId)?.name ?? selectedMessage.toId) : 'Tous'}</span></span>
              <span>{formatDate(selectedMessage.createdAt)}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedMessage.body }}
            />
            {selectedMessage.attachments.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pièces jointes</p>
                <div className="space-y-2">
                  {selectedMessage.attachments.map((att, i) => {
                    if (att.type.startsWith('image/')) {
                      return (
                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                          <a href={att.url} target="_blank" rel="noopener noreferrer">
                            <img src={att.url} alt={att.name} className="w-full max-h-80 object-contain bg-gray-50" />
                          </a>
                          <div className="px-3 py-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700 truncate">{att.name}</p>
                            <p className="text-xs text-gray-400 shrink-0 ml-2">{(att.size / 1024).toFixed(1)} Ko</p>
                          </div>
                        </div>
                      );
                    }
                    if (att.type.startsWith('video/')) {
                      return (
                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                          <video src={att.url} controls className="w-full max-h-80 bg-black" />
                          <div className="px-3 py-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700 truncate">{att.name}</p>
                            <p className="text-xs text-gray-400 shrink-0 ml-2">{(att.size / 1024).toFixed(1)} Ko</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <FileText className="w-8 h-8 text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{att.name}</p>
                          <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} Ko</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un message pour le lire</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Desktop: side-by-side. Mobile: one panel at a time */}
      <div className="hidden md:flex gap-4 h-full">
        <div className="w-80 shrink-0 flex flex-col h-full">
          {listPanel}
        </div>
        <div className="flex-1 flex flex-col h-full">
          {detailPanel}
        </div>
      </div>

      {/* Mobile: single panel */}
      <div className="md:hidden flex flex-col h-full">
        {mobilePanel === 'list' ? listPanel : detailPanel}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Nouveau message</h3>
              <button onClick={() => setShowCompose(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destinataire</label>
                <select
                  value={toId}
                  onChange={e => setToId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Tous les utilisateurs</option>
                  {users.filter(u => u.id !== currentUser?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objet</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Objet du message"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <RichTextEditor
                  content={body}
                  onChange={setBody}
                  placeholder="Rédigez votre message..."
                  enableImageUpload
                />
              </div>
              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Pièces jointes :</p>
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <span className="flex-1 truncate">{att.name}</span>
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  {uploading ? `Envoi ${uploadProgress ?? 0}%` : 'Joindre un fichier'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleAttachFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
