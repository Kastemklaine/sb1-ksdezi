import { useState, useEffect, useRef } from 'react';
import { Search, X, CheckSquare, FileText, MessageSquare, Calendar } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import type { View } from '../../App';

interface Props {
  onClose: () => void;
  setView: (v: View) => void;
}

const STATUS_LABEL: Record<string, string> = {
  todo: 'À faire', inprogress: 'En cours', done: 'Terminé', blocked: 'Bloqué',
};

export default function SearchModal({ onClose, setView }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const docs = useProjectStore(s => curProject(s)?.documents ?? []);
  const messages = useProjectStore(s => curProject(s)?.messages ?? []);
  const events = useProjectStore(s => curProject(s)?.events ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const q = query.toLowerCase().trim();

  const matchedTasks = q.length < 2 ? [] : tasks.filter(t =>
    t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedDocs = q.length < 2 ? [] : docs.filter(d =>
    d.title.toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedMessages = q.length < 2 ? [] : messages.filter(m =>
    m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchedEvents = q.length < 2 ? [] : events.filter(e =>
    e.title.toLowerCase().includes(q)
  ).slice(0, 3);

  const total = matchedTasks.length + matchedDocs.length + matchedMessages.length + matchedEvents.length;

  const wsName = (id: string) => workstreams.find(w => w.id === id)?.name ?? '';

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher tâches, documents, messages…"
            className="flex-1 text-base outline-none text-gray-900 placeholder-gray-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {q.length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Tapez au moins 2 caractères pour rechercher…
            </div>
          ) : total === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <div className="py-2">
              {matchedTasks.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tâches</p>
                  {matchedTasks.map(task => (
                    <button key={task.id} onClick={() => { setView({ type: 'workstream', id: task.workstreamId }); onClose(); }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                      <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-400">{wsName(task.workstreamId)} · {STATUS_LABEL[task.status]}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {matchedDocs.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Documents</p>
                  {matchedDocs.map(doc => (
                    <button key={doc.id} onClick={() => { setView({ type: 'workspace', workstreamId: doc.workstreamId }); onClose(); }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                      <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-400">{wsName(doc.workstreamId)} · {doc.space === 'final' ? 'Document final' : 'Travail'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {matchedMessages.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Messages</p>
                  {matchedMessages.map(msg => (
                    <button key={msg.id} onClick={() => { setView({ type: 'messaging' }); onClose(); }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                      <MessageSquare className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{msg.subject}</p>
                        <p className="text-xs text-gray-400">De {msg.fromName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {matchedEvents.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Événements</p>
                  {matchedEvents.map(ev => (
                    <button key={ev.id} onClick={() => { setView({ type: 'calendar' }); onClose(); }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                      <Calendar className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                        <p className="text-xs text-gray-400">{ev.startDate}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span>↵ Ouvrir</span>
          <span>Esc Fermer</span>
          {total > 0 && <span className="ml-auto">{total} résultat{total > 1 ? 's' : ''}</span>}
        </div>
      </div>
    </div>
  );
}
