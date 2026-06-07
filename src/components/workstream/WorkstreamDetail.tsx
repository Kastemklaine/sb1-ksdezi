import { useState } from 'react';
import { Plus, AlertTriangle, CheckCircle2, Clock, Ban, ChevronDown } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import RichTextEditor from '../editor/RichTextEditor';
import TaskModal from './TaskModal';
import type { Task, TaskStatus } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  todo: { label: 'À faire', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' },
  inprogress: { label: 'En cours', icon: Clock, color: 'text-blue-700', bg: 'bg-blue-100' },
  done: { label: 'Terminé', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-100' },
  blocked: { label: 'Bloqué', icon: Ban, color: 'text-red-700', bg: 'bg-red-100' },
};

interface Props {
  workstreamId: string;
}

export default function WorkstreamDetail({ workstreamId }: Props) {
  const workstreams = useProjectStore(s => s.workstreams);
  const tasks = useProjectStore(s => s.tasks);
  const updateWorkstreamNotes = useProjectStore(s => s.updateWorkstreamNotes);
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);

  const ws = workstreams.find(w => w.id === workstreamId);
  const wsTasks = tasks.filter(t => t.workstreamId === workstreamId).sort((a, b) => a.order - b.order);
  const allTasks = tasks;

  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);

  const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  if (!ws) return <p className="text-gray-500">Axe introuvable.</p>;

  const filtered = filter === 'all' ? wsTasks : wsTasks.filter(t => t.status === filter);

  const openCreate = () => { setSelectedTask(undefined); setShowModal(true); };
  const openEdit = (t: Task) => { setSelectedTask(t); setShowModal(true); };

  const isBlocked = (task: Task) => task.dependsOn.some(depId => {
    const dep = allTasks.find(t => t.id === depId);
    return dep && dep.status !== 'done';
  });

  const getAssigneeNames = (ids: string[]) =>
    ids.map(id => users.find(u => u.id === id)?.name ?? 'Inconnu').join(', ');

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'd MMM yyyy', { locale: fr }); } catch { return d; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${ws.color} shrink-0 mt-1`} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ws.name}</h1>
            <p className="text-gray-500 mt-0.5">{ws.description}</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </button>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setNotesOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>Notes de l'axe</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
        </button>
        {notesOpen && (
          <div className="px-4 pb-4">
            <RichTextEditor
              content={ws.notes}
              onChange={canEdit ? (html) => updateWorkstreamNotes(ws.id, html) : undefined}
              readOnly={!canEdit}
              placeholder="Ajoutez des notes, contexte, ressources pour cet axe..."
            />
          </div>
        )}
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Tâches ({wsTasks.length})</h2>
          <div className="flex gap-1">
            {(['all', 'todo', 'inprogress', 'done', 'blocked'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f === 'all' ? 'Toutes' : STATUS_CONFIG[f].label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-400">Aucune tâche {filter !== 'all' ? `avec le statut "${STATUS_CONFIG[filter as TaskStatus].label}"` : '— créez la première !'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(task => {
              const sc = STATUS_CONFIG[task.status];
              const StatusIcon = sc.icon;
              const blocked = isBlocked(task);
              const depTasks = task.dependsOn.map(id => allTasks.find(t => t.id === id)).filter(Boolean) as Task[];

              return (
                <button
                  key={task.id}
                  onClick={() => openEdit(task)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-sm hover:border-green-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                        {blocked && task.status !== 'done' && (
                          <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Dépendance en attente
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {task.assigneeIds.length > 0 && <span>👤 {getAssigneeNames(task.assigneeIds)}</span>}
                        {task.startDate && <span>📅 {formatDate(task.startDate)}{task.endDate ? ` → ${formatDate(task.endDate)}` : ''}</span>}
                        {task.budget > 0 && <span>💶 {task.budget.toLocaleString('fr-FR')} €</span>}
                        {depTasks.length > 0 && (
                          <span>🔗 Dépend de : {depTasks.map(d => d?.title).join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          workstreamId={workstreamId}
          task={selectedTask}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
