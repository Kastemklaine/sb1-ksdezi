import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import RichTextEditor from '../editor/RichTextEditor';
import type { Task, TaskStatus } from '../../types';

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

export default function TaskModal({ workstreamId, task, defaultStatus, onClose }: Props) {
  const createTask = useProjectStore(s => s.createTask);
  const updateTask = useProjectStore(s => s.updateTask);
  const deleteTask = useProjectStore(s => s.deleteTask);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);

  const ws = workstreams.find(w => w.id === workstreamId);
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isWsAssignee = !!(currentUser && ws?.assigneeIds?.includes(currentUser.id));
  const canEdit = isAdmin || isWsAssignee;

  const [title, setTitle] = useState(task?.title ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? 'todo');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds ?? []);
  const [startDate, setStartDate] = useState(task?.startDate ?? '');
  const [endDate, setEndDate] = useState(task?.endDate ?? '');
  const [budget, setBudget] = useState(task?.budget?.toString() ?? '');
  const [dependsOn, setDependsOn] = useState<string[]>(task?.dependsOn ?? []);

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
      assigneeIds,
      startDate,
      endDate,
      budget: parseFloat(budget) || 0,
      dependsOn,
      order: task?.order ?? Date.now(),
    };
    if (task) {
      updateTask(task.id, data);
    } else {
      createTask(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (task && confirm('Supprimer cette tâche ?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {blockedByDeps.length > 0 && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Cette tâche dépend de tâches non terminées : {blockedByDeps.map(id => allTasks.find(t => t.id === id)?.title).join(', ')}</span>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] ${status === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-green-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'} disabled:cursor-default`}
                >
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
              placeholder="0" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsables</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleAssignee(u.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all disabled:cursor-default min-h-[44px] ${assigneeIds.includes(u.id) ? 'bg-green-100 border-green-400 text-green-800 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
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
