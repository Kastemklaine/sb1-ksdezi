import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, FileText, ClipboardList, CheckSquare, MessageSquare, Paperclip, Trash2, Download, Plus, Clock } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import RichTextEditor from '../editor/RichTextEditor';
import type { Task, TaskStatus, TaskPriority, TaskAttachment } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { v4 as uuid } from 'uuid';

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'À faire', color: 'bg-gray-100 text-gray-700' },
  { value: 'inprogress', label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: 'Terminé', color: 'bg-green-100 text-green-700' },
  { value: 'blocked', label: 'Bloqué', color: 'bg-red-100 text-red-700' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string; dot: string }[] = [
  { value: 'haute', label: 'Haute', color: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  { value: 'normale', label: 'Normale', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
  { value: 'basse', label: 'Basse', color: 'bg-gray-100 text-gray-600 border-gray-300', dot: 'bg-gray-400' },
];

type Tab = 'details' | 'notes' | 'checklist' | 'comments' | 'files';

interface Props {
  workstreamId: string;
  task?: Task;
  defaultStatus?: TaskStatus;
  onClose: () => void;
}

export default function TaskModal({ workstreamId, task, defaultStatus, onClose }: Props) {
  const createTask = useProjectStore(s => s.createTask);
  const updateTask = useProjectStore(s => s.updateTask);
  const deleteTask = useProjectStore(s => s.deleteTask);
  const addChecklistItem = useProjectStore(s => s.addChecklistItem);
  const toggleChecklistItem = useProjectStore(s => s.toggleChecklistItem);
  const deleteChecklistItem = useProjectStore(s => s.deleteChecklistItem);
  const addTaskComment = useProjectStore(s => s.addTaskComment);
  const deleteTaskComment = useProjectStore(s => s.deleteTaskComment);
  const addTaskAttachment = useProjectStore(s => s.addTaskAttachment);
  const removeTaskAttachment = useProjectStore(s => s.removeTaskAttachment);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);
  const addNotification = useNotificationStore(s => s.addNotification);

  // Refresh task from store
  const liveTask = task ? tasks.find(t => t.id === task.id) ?? task : task;

  const ws = workstreams.find(w => w.id === workstreamId);
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isWsAssignee = !!(currentUser && ws?.assigneeIds?.includes(currentUser.id));
  const canEdit = isAdmin || isWsAssignee;

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [title, setTitle] = useState(task?.title ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normale');
  const [description, setDescription] = useState(task?.description ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds ?? []);
  const [startDate, setStartDate] = useState(task?.startDate ?? '');
  const [endDate, setEndDate] = useState(task?.endDate ?? '');
  const [budget, setBudget] = useState(task?.budget?.toString() ?? '');
  const [dependsOn, setDependsOn] = useState<string[]>(task?.dependsOn ?? []);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherTasks = tasks.filter(t => t.workstreamId === workstreamId && t.id !== task?.id);
  const allTasks = tasks.filter(t => t.id !== task?.id);
  const blockedByDeps = dependsOn.filter(depId => {
    const dep = allTasks.find(t => t.id === depId);
    return dep && dep.status !== 'done';
  });

  const checklist = liveTask?.checklist ?? [];
  const comments = liveTask?.comments ?? [];
  const attachments = liveTask?.attachments ?? [];
  const history = liveTask?.history ?? [];

  const checkDone = checklist.filter(c => c.done).length;

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
      priority,
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
      const prevIds = task.assigneeIds ?? [];
      const newlyAssigned = assigneeIds.filter(id => !prevIds.includes(id) && id !== currentUser?.id);
      newlyAssigned.forEach(uid => addNotification(uid, 'task_assigned', 'Tâche assignée', `Vous avez été ajouté(e) à "${title.trim()}"`, workstreamId));
      updateTask(task.id, data);
    } else {
      createTask(data);
      assigneeIds.filter(id => id !== currentUser?.id).forEach(uid =>
        addNotification(uid, 'task_assigned', 'Nouvelle tâche', `Assigné(e) à "${title.trim()}"`, workstreamId)
      );
    }
    onClose();
  };

  const handleDelete = () => {
    if (task && confirm('Supprimer cette tâche ?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim() || !task) return;
    addChecklistItem(task.id, newCheckItem.trim());
    setNewCheckItem('');
  };

  const handlePostComment = () => {
    if (!commentText.trim() || !task || !currentUser) return;
    addTaskComment(task.id, currentUser.id, commentText.trim());
    // Notify assignees about the new comment
    (liveTask?.assigneeIds ?? []).filter(id => id !== currentUser.id).forEach(uid =>
      addNotification(uid, 'task_comment', 'Nouveau commentaire', `"${task.title}" : ${commentText.trim().slice(0, 60)}`, workstreamId)
    );
    setCommentText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    const reader = new FileReader();
    reader.onload = () => {
      const att: TaskAttachment = {
        id: uuid(),
        name: file.name,
        data: reader.result as string,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      addTaskAttachment(task.id, att);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} o`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
    return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'details', label: 'Détails', icon: ClipboardList },
    { id: 'notes', label: 'Notes', icon: FileText },
    ...(task ? [
      { id: 'checklist' as Tab, label: 'Checklist', icon: CheckSquare, badge: checklist.length ? checklist.length : undefined },
      { id: 'comments' as Tab, label: 'Commentaires', icon: MessageSquare, badge: comments.length || undefined },
      { id: 'files' as Tab, label: 'Fichiers', icon: Paperclip, badge: attachments.length || undefined },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* ─── DETAILS ─── */}
          {activeTab === 'details' && (<>
            {blockedByDeps.length > 0 && (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Dépend de tâches non terminées : {blockedByDeps.map(id => allTasks.find(t => t.id === id)?.title).join(', ')}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={!canEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                placeholder="Titre de la tâche"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" disabled={!canEdit} onClick={() => setStatus(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${status === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-green-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'} disabled:cursor-default`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" disabled={!canEdit} onClick={() => setPriority(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${priority === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200 text-gray-500 hover:border-gray-300'} disabled:cursor-default`}>
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                placeholder="0" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsables</label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => (
                  <button key={u.id} type="button" disabled={!canEdit} onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all disabled:cursor-default min-h-[40px] ${assigneeIds.includes(u.id) ? 'bg-green-100 border-green-400 text-green-800 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
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
              <RichTextEditor content={description} onChange={setDescription} readOnly={!canEdit} placeholder="Décrivez la tâche, les critères d'acceptation..." />
            </div>

            {history.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Historique</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{h.label}</span>
                      <span className="text-gray-300 ml-auto shrink-0">
                        {(() => { try { return format(parseISO(h.at), 'd MMM à HH:mm', { locale: fr }); } catch { return ''; } })()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>)}

          {/* ─── NOTES ─── */}
          {activeTab === 'notes' && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-500">Notes de travail internes — visibles uniquement par les membres et administrateurs.</p>
              <RichTextEditor content={notes} onChange={setNotes} readOnly={!canEdit} placeholder="Ajoutez vos notes de travail, réflexions, ressources..." enableImageUpload />
            </div>
          )}

          {/* ─── CHECKLIST ─── */}
          {activeTab === 'checklist' && task && (
            <div className="space-y-3">
              {checklist.length > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${checklist.length ? (checkDone / checklist.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{checkDone}/{checklist.length}</span>
                </div>
              )}

              <div className="space-y-1">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(task.id, item.id)}
                      className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer" />
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</span>
                    {canEdit && (
                      <button onClick={() => deleteChecklistItem(task.id, item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {checklist.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">Aucun élément — ajoutez une étape ci-dessous</p>
              )}

              {canEdit && (
                <div className="flex gap-2 pt-2">
                  <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCheckItem(); } }}
                    placeholder="Ajouter une étape..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button onClick={handleAddCheckItem} disabled={!newCheckItem.trim()}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-40 min-w-[40px] flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── COMMENTS ─── */}
          {activeTab === 'comments' && task && (
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">Aucun commentaire</p>
              )}
              <div className="space-y-3">
                {comments.map(c => {
                  const author = users.find(u => u.id === c.authorId);
                  const isOwn = c.authorId === currentUser?.id;
                  return (
                    <div key={c.id} className="flex gap-3 group">
                      <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {author?.name.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">{author?.name ?? 'Inconnu'}</span>
                          <span className="text-xs text-gray-400">
                            {(() => { try { return format(parseISO(c.createdAt), 'd MMM à HH:mm', { locale: fr }); } catch { return ''; } })()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                      </div>
                      {isOwn && (
                        <button onClick={() => deleteTaskComment(task.id, c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all shrink-0 self-start mt-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {currentUser && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                      placeholder="Ajouter un commentaire... (Entrée pour envoyer)"
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                    <button onClick={handlePostComment} disabled={!commentText.trim()}
                      className="mt-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors">
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── FILES ─── */}
          {activeTab === 'files' && task && (
            <div className="space-y-3">
              {attachments.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">Aucun fichier joint</p>
              )}
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group">
                    <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{att.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(att.size)}</p>
                    </div>
                    <a href={att.data} download={att.name}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" onClick={e => e.stopPropagation()}>
                      <Download className="w-4 h-4" />
                    </a>
                    {canEdit && (
                      <button onClick={() => removeTaskAttachment(task.id, att.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canEdit && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 text-gray-500 hover:text-green-600 rounded-xl text-sm font-medium transition-all">
                    <Plus className="w-4 h-4" />
                    Joindre un fichier
                  </button>
                </>
              )}
            </div>
          )}

        </div>

        {canEdit && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-t border-gray-200">
            {task ? (
              <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
                Supprimer
              </button>
            ) : <div />}
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]">
                Annuler
              </button>
              <button onClick={handleSave} disabled={!title.trim()} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]">
                {task ? 'Enregistrer' : 'Créer la tâche'}
              </button>
            </div>
          </div>
        )}
        {!canEdit && (
          <div className="p-4 sm:p-5 border-t border-gray-200 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
