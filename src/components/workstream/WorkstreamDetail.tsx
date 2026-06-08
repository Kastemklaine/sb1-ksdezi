import { useState } from 'react';
import { Plus, AlertTriangle, CheckCircle2, Clock, Ban, ChevronDown, LayoutList, Kanban, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import RichTextEditor from '../editor/RichTextEditor';
import TaskModal from './TaskModal';
import KanbanBoard from './KanbanBoard';
import type { Task, TaskStatus } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { View } from '../../App';

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ElementType; color: string; bg: string; dot: string }> = {
  todo: { label: 'À faire', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  inprogress: { label: 'En cours', icon: Clock, color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  done: { label: 'Terminé', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  blocked: { label: 'Bloqué', icon: Ban, color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
};

const COLOR_HEX: Record<string, string> = {
  'bg-yellow-400': '#facc15',
  'bg-lime-600': '#65a30d',
  'bg-teal-500': '#14b8a6',
  'bg-red-500': '#ef4444',
  'bg-pink-500': '#ec4899',
  'bg-purple-600': '#9333ea',
  'bg-indigo-600': '#4f46e5',
  'bg-cyan-500': '#06b6d4',
};

interface Props {
  workstreamId: string;
  setView: (v: View) => void;
}

type ViewMode = 'table' | 'kanban';

export default function WorkstreamDetail({ workstreamId, setView }: Props) {
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const updateWorkstreamNotes = useProjectStore(s => s.updateWorkstreamNotes);
  const deleteTask = useProjectStore(s => s.deleteTask);
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);

  const ws = workstreams.find(w => w.id === workstreamId);
  const wsTasks = tasks.filter(t => t.workstreamId === workstreamId).sort((a, b) => a.order - b.order);
  const allTasks = tasks;

  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [notesOpen, setNotesOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [taskMenu, setTaskMenu] = useState<{ task: Task; x: number; y: number } | null>(null);

  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isWsAssignee = !!(currentUser && ws?.assigneeIds?.includes(currentUser.id));
  const canEdit = isAdmin || isWsAssignee;

  if (!ws) return <p className="text-gray-500">Axe introuvable.</p>;

  const filtered = filter === 'all' ? wsTasks : wsTasks.filter(t => t.status === filter);

  const openCreate = (status: TaskStatus = 'todo') => {
    setSelectedTask(undefined);
    setDefaultStatus(status);
    setShowModal(true);
  };
  const openEdit = (t: Task) => { setSelectedTask(t); setShowModal(true); };

  const isBlocked = (task: Task) => task.dependsOn.some(depId => {
    const dep = allTasks.find(t => t.id === depId);
    return dep && dep.status !== 'done';
  });

  const getAssignees = (ids: string[]) =>
    ids.map(id => users.find(u => u.id === id)).filter(Boolean) as typeof users;

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'd MMM yyyy', { locale: fr }); } catch { return d; }
  };

  const wsColor = COLOR_HEX[ws.color] ?? '#888';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: wsColor }} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ws.name}</h1>
            <p className="text-gray-500 mt-0.5 text-sm">{ws.description}</p>
            {ws.assigneeIds && ws.assigneeIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-xs text-gray-400 shrink-0">Responsables :</span>
                <div className="flex -space-x-1">
                  {ws.assigneeIds.map(id => {
                    const u = users.find(u => u.id === id);
                    if (!u) return null;
                    return (
                      <div
                        key={id}
                        title={u.name}
                        className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: wsColor }}
                      >
                        {u.name.charAt(0)}
                      </div>
                    );
                  })}
                </div>
                <span className="text-xs text-gray-500">
                  {ws.assigneeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 shadow-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle tâche</span>
          </button>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setNotesOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>Notes de l'axe</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
        </button>
        {notesOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <RichTextEditor
              content={ws.notes}
              onChange={canEdit ? (html) => updateWorkstreamNotes(ws.id, html) : undefined}
              readOnly={!canEdit}
              placeholder="Ajoutez des notes, contexte, ressources pour cet axe..."
            />
          </div>
        )}
      </div>

      {/* Tasks section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800">Tâches</h2>
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{wsTasks.length}</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {viewMode === 'table' && (
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {(['all', 'todo', 'inprogress', 'done', 'blocked'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filter === f ? 'bg-[#00c875] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {f === 'all' ? 'Toutes' : STATUS_CONFIG[f].label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                title="Vue tableau"
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                title="Vue kanban"
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <KanbanBoard
            workstreamId={workstreamId}
            tasks={wsTasks}
            onOpenTask={(t) => setTaskMenu({ task: t, x: window.innerWidth / 2 - 104, y: window.innerHeight / 2 - 80 })}
            onCreateTask={openCreate}
          />
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center shadow-sm">
                <p className="text-gray-400">
                  {filter !== 'all'
                    ? `Aucune tâche avec le statut "${STATUS_CONFIG[filter as TaskStatus].label}"`
                    : 'Aucune tâche — créez la première !'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Desktop header */}
                <div className="hidden md:grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <div className="col-span-5">Tâche</div>
                  <div className="col-span-2">Statut</div>
                  <div className="col-span-2">Responsable(s)</div>
                  <div className="col-span-2 hidden lg:block">Dates</div>
                  <div className="col-span-1 text-right hidden lg:block">Budget</div>
                </div>

                <div className="divide-y divide-gray-100">
                  {filtered.map((task, idx) => {
                    const sc = STATUS_CONFIG[task.status];
                    const StatusIcon = sc.icon;
                    const blocked = isBlocked(task);
                    const assignees = getAssignees(task.assigneeIds);

                    return (
                      <button
                        key={task.id}
                        onClick={(e) => { e.stopPropagation(); setTaskMenu({ task, x: e.clientX, y: e.clientY }); }}
                        className={`w-full text-left transition-colors hover:bg-[#00c875]/5 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                      >
                        {/* Mobile card layout */}
                        <div className="md:hidden px-4 py-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${sc.dot}`} />
                              <p className="font-medium text-gray-900 text-sm leading-snug">{task.title}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${sc.bg} ${sc.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {sc.label}
                            </span>
                          </div>
                          {blocked && task.status !== 'done' && (
                            <span className="flex items-center gap-1 text-xs text-orange-600">
                              <AlertTriangle className="w-3 h-3" />Dépendance
                            </span>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {assignees.length > 0 && (
                              <div className="flex items-center -space-x-1">
                                {assignees.slice(0, 3).map(u => (
                                  <div key={u.id} title={u.name} className="w-5 h-5 rounded-full bg-[#00c875] border border-white flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                                ))}
                              </div>
                            )}
                            {(task.startDate || task.endDate) && (
                              <span>{task.startDate ? formatDate(task.startDate) : ''}{task.startDate && task.endDate ? ' → ' : ''}{task.endDate ? formatDate(task.endDate) : ''}</span>
                            )}
                            {task.budget > 0 && <span className="font-medium text-gray-700">{task.budget.toLocaleString('fr-FR')} €</span>}
                          </div>
                        </div>

                        {/* Desktop row layout */}
                        <div className="hidden md:grid grid-cols-12 gap-0 px-4 py-3 items-center">
                          <div className="col-span-5 flex items-center gap-2 min-w-0 pr-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate text-sm">{task.title}</p>
                              {blocked && task.status !== 'done' && (
                                <span className="flex items-center gap-1 text-xs text-orange-600 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />Dépendance
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                              <StatusIcon className="w-3 h-3" />{sc.label}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center -space-x-1">
                            {assignees.slice(0, 3).map(u => (
                              <div key={u.id} title={u.name} className="w-7 h-7 rounded-full bg-[#00c875] border-2 border-white flex items-center justify-center text-white text-xs font-bold shrink-0">{u.name.charAt(0)}</div>
                            ))}
                            {assignees.length > 3 && <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold">+{assignees.length - 3}</div>}
                            {assignees.length === 0 && <span className="text-xs text-gray-300">—</span>}
                          </div>
                          <div className="col-span-2 hidden lg:block text-xs text-gray-500">
                            {task.startDate || task.endDate ? <span>{task.startDate ? formatDate(task.startDate) : ''}{task.startDate && task.endDate ? ' → ' : ''}{task.endDate ? formatDate(task.endDate) : ''}</span> : <span className="text-gray-300">—</span>}
                          </div>
                          <div className="col-span-1 hidden lg:block text-right text-xs font-medium text-gray-600">
                            {task.budget > 0 ? `${task.budget.toLocaleString('fr-FR')} €` : <span className="text-gray-300">—</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {canEdit && (
                  <button
                    onClick={() => openCreate()}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-[#00c875] hover:bg-[#00c875]/5 transition-colors border-t border-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une tâche
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Task context menu */}
      {taskMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTaskMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 w-52"
            style={{
              top: Math.min(taskMenu.y, window.innerHeight - 160),
              left: Math.min(taskMenu.x, window.innerWidth - 220),
            }}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700 truncate">{taskMenu.task.title}</p>
            </div>
            <button
              onClick={() => { openEdit(taskMenu.task); setTaskMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4 text-blue-500" />
              Modifier
            </button>
            <button
              onClick={() => { setView({ type: 'workspace', workstreamId }); setTaskMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-purple-500" />
              Espace de travail
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  if (confirm(`Supprimer "${taskMenu.task.title}" ?`)) {
                    deleteTask(taskMenu.task.id);
                    setTaskMenu(null);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            )}
          </div>
        </>
      )}

      {showModal && (
        <TaskModal
          workstreamId={workstreamId}
          task={selectedTask}
          defaultStatus={defaultStatus}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
