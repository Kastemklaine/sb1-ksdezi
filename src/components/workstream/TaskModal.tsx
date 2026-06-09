import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, FileText, ClipboardList, MessageSquare, Paperclip, Send, Trash2, Download } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import RichTextEditor from '../editor/RichTextEditor';
import type { Task, TaskStatus } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'À faire', color: 'bg-gray-100 text-gray-700' },
  { value: 'inprogress', label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: 'Terminé', color: 'bg-green-100 text-green-700' },
  { value: 'blocked', label: 'Bloqué', color: 'bg-red-100 text-red-700' },
];

interface Props {
  workstreamId: string;
  task?: Task;
  defaultStatus?: TaskStatus;
  onClose: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function timeAgo(iso: string) {
  try { return format(parseISO(iso), "d MMM à HH:mm", { locale: fr }); } catch { return ''; }
}

export default function TaskModal({ workstreamId, task, defaultStatus, onClose }: Props) {
  const createTask = useProjectStore(s => s.createTask);
  const updateTask = useProjectStore(s => s.updateTask);
  const deleteTask = useProjectStore(s => s.deleteTask);
  const addTaskComment = useProjectStore(s => s.addTaskComment);
  const deleteTaskComment = useProjectStore(s => s.deleteTaskComment);
  const addTaskAttachment = useProjectStore(s => s.addTaskAttachment);
  const removeTaskAttachment = useProjectStore(s => s.removeTaskAttachment);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);
  const addNotification = useNotificationStore(s => s.addNotification);

  const ws = workstreams.find(w => w.id === workstreamId);
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isWsAssignee = !!(currentUser && ws?.assigneeIds?.includes(currentUser.id));
  const canEdit = isAdmin || isWsAssignee;

  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'comments' | 'attachments'>('details');
  const [title, setTitle] = useState(task?.title ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? 'todo');
  const [description, setDescription] = useState(task?.description ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds ?? []);
  const [startDate, setStartDate] = useState(task?.startDate ?? '');
  const [endDate, setEndDate] = useState(task?.endDate ?? '');
  const [budget, setBudget] = useState(task?.budget?.toString() ?? '');
  const [dependsOn, setDependsOn] = useState<string[]>(task?.dependsOn ?? []);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live task data for comments/attachments
  const liveTask = tasks.find(t => t.id === task?.id);
  const comments = liveTask?.comments ?? task?.comments ?? [];
  const attachments = liveTask?.attachments ?? task?.attachments ?? [];

  const otherTasks = tasks.filter(t => t.workstreamId === workstreamId && t.id !== task?.id);
  const allTasks = tasks.filter(t => t.id !== task?.id);
  const blockedByDeps = dependsOn.filter(depId => {
    const dep = allTasks.find(t => t.id === depId);
    return dep && dep.status !== 'done';
  });

  const toggleAssignee = (id: string) => {
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleDep = (id: string) => {
    setDependsOn(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const data = {
      workstreamId,
      title: title.trim(),
      status,
      description,
      notes,
      assigneeIds,
      startDate,
      endDate,
      budget: parseFloat(budget) || 0,
      dependsOn,
      order: task?.order ?? Date.now(),
    };
    if (task) {
      // Notify newly assigned users
      const prevIds = task.assigneeIds ?? [];
      const newlyAssigned = assigneeIds.filter(id => !prevIds.includes(id) && id !== currentUser?.id);
      newlyAssigned.forEach(uid => {
        addNotification(uid, 'task_assigned', 'Nouvelle tâche assignée', `Vous avez été ajouté(e) à "${title.trim()}"`, workstreamId);
      });
      updateTask(task.id, data);
    } else {
      const created = createTask(data);
      // Notify all assigned users
      assigneeIds.filter(id => id !== currentUser?.id).forEach(uid => {
        addNotification(uid, 'task_assigned', 'Nouvelle tâche assignée', `Vous avez été assigné(e) à "${title.trim()}"`, workstreamId);
      });
      void created;
    }
    onClose();
  };

  const handleDelete = () => {
    if (task && confirm('Supprimer cette tâche ?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !task || !currentUser) return;
    addTaskComment(task.id, currentUser.id, commentText.trim());
    // Notify task assignees (except commenter)
    (liveTask?.assigneeIds ?? task.assigneeIds ?? [])
      .filter(id => id !== currentUser.id)
      .forEach(uid => {
        addNotification(uid, 'task_comment', 'Nouveau commentaire', `${currentUser.name} a commenté "${task.title}"`, workstreamId);
      });
    setCommentText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return;
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        addTaskAttachment(task.id, {
          name: file.name,
          data: reader.result as string,
          type: file.type,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const TABS = [
    { key: 'details', label: 'Détails', icon: ClipboardList },
    { key: 'notes', label: 'Notes', icon: FileText },
    ...(task ? [
      { key: 'comments', label: `Commentaires${comments.length > 0 ? ` (${comments.length})` : ''}`, icon: MessageSquare },
      { key: 'attachments', label: `Fichiers${attachments.length > 0 ? ` (${attachments.length})` : ''}`, icon: Paperclip },
    ] : []),
  ] as { key: typeof activeTab; label: string; icon: React.ElementType }[];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-500">Notes de travail internes — visibles uniquement par les membres et administrateurs.</p>
              <RichTextEditor content={notes} onChange={setNotes} readOnly={!canEdit}
                placeholder="Ajoutez vos notes de travail, réflexions, ressources..." enableImageUpload />
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && task && (
            <div className="flex flex-col gap-4">
              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun commentaire — soyez le premier !</p>
                </div>
              )}
              <div className="space-y-3">
                {comments.map(c => {
                  const author = users.find(u => u.id === c.authorId);
                  const isMine = c.authorId === currentUser?.id;
                  return (
                    <div key={c.id} className="flex items-start gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {author?.name.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-gray-900">{author?.name ?? 'Inconnu'}</span>
                          <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                      </div>
                      {isMine && (
                        <button onClick={() => deleteTaskComment(task.id, c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-all shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Add comment */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {currentUser?.name.charAt(0)}
                </div>
                <div className="flex-1 flex gap-2">
                  <input value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); }}}
                    placeholder="Ajouter un commentaire…"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button onClick={handleAddComment} disabled={!commentText.trim()}
                    className="p-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ATTACHMENTS TAB */}
          {activeTab === 'attachments' && task && (
            <div className="flex flex-col gap-4">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 rounded-xl py-6 text-sm text-gray-500 hover:text-green-600 transition-all">
                <Paperclip className="w-5 h-5" />
                Cliquez pour ajouter des fichiers
              </button>
              {attachments.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">Aucun fichier joint</div>
              )}
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group">
                    <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{att.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(att.size)} · {timeAgo(att.uploadedAt)}</p>
                    </div>
                    <a href={att.data} download={att.name}
                      className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors" title="Télécharger">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => removeTaskAttachment(task.id, att.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (<>
            {blockedByDeps.length > 0 && (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Cette tâche dépend de tâches non terminées : {blockedByDeps.map(id => allTasks.find(t => t.id === id)?.title).join(', ')}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                placeholder="Titre de la tâche" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" disabled={!canEdit} onClick={() => setStatus(opt.value)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] ${status === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-green-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'} disabled:cursor-default`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!canEdit}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!canEdit}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget (€)</label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} disabled={!canEdit} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsables</label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => (
                  <button key={u.id} type="button" disabled={!canEdit} onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all disabled:cursor-default min-h-[44px] ${assigneeIds.includes(u.id) ? 'bg-green-100 border-green-400 text-green-800 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">{u.name.charAt(0)}</span>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
            {otherTasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dépend de</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {otherTasks.map(t => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                      <input type="checkbox" checked={dependsOn.includes(t.id)} onChange={() => toggleDep(t.id)} disabled={!canEdit} className="rounded" />
                      <span className="text-sm text-gray-700">{t.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.status === 'done' ? 'bg-green-100 text-green-700' : t.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_OPTIONS.find(o => o.value === t.status)?.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <RichTextEditor content={description} onChange={setDescription} readOnly={!canEdit}
                placeholder="Décrivez la tâche, les critères d'acceptation..." />
            </div>
          </>)}
        </div>

        {/* Footer */}
        {activeTab !== 'comments' && activeTab !== 'attachments' && canEdit && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-t border-gray-200">
            {task ? (
              <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
                Supprimer
              </button>
            ) : <div />}
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]">Annuler</button>
              <button onClick={handleSave} disabled={!title.trim()} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]">
                {task ? 'Enregistrer' : 'Créer la tâche'}
              </button>
            </div>
          </div>
        )}
        {(activeTab === 'comments' || activeTab === 'attachments' || !canEdit) && (
          <div className="p-4 sm:p-5 border-t border-gray-200 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]">Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}
