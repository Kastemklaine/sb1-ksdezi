import { Plus, Clock, CheckCircle2, Ban, AlertTriangle } from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { Task, TaskStatus } from '../../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

interface Column {
  status: TaskStatus;
  label: string;
  icon: React.ElementType;
  headerBg: string;
  headerText: string;
  cardBorder: string;
  countBg: string;
}

const COLUMNS: Column[] = [
  { status: 'todo', label: 'À faire', icon: Clock, headerBg: 'bg-gray-100', headerText: 'text-gray-700', cardBorder: 'border-l-gray-400', countBg: 'bg-gray-200 text-gray-600' },
  { status: 'inprogress', label: 'En cours', icon: Clock, headerBg: 'bg-blue-50', headerText: 'text-blue-700', cardBorder: 'border-l-blue-400', countBg: 'bg-blue-100 text-blue-700' },
  { status: 'done', label: 'Terminé', icon: CheckCircle2, headerBg: 'bg-green-50', headerText: 'text-green-700', cardBorder: 'border-l-green-500', countBg: 'bg-green-100 text-green-700' },
  { status: 'blocked', label: 'Bloqué', icon: Ban, headerBg: 'bg-red-50', headerText: 'text-red-700', cardBorder: 'border-l-red-500', countBg: 'bg-red-100 text-red-700' },
];

interface CardProps {
  task: Task;
  col: Column;
  blocked: boolean;
  assignees: { id: string; name: string }[];
  onClick: () => void;
  isDragging?: boolean;
}

function TaskCard({ task, col, blocked, assignees, onClick, isDragging }: CardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  const formatDate = (d: string) => { try { return format(parseISO(d), 'd MMM', { locale: fr }); } catch { return d; } };
  const commentCount = task.comments?.length ?? 0;
  const attachCount = task.attachments?.length ?? 0;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`touch-none bg-white rounded-lg border-l-4 border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all ${col.cardBorder} ${isDragging ? 'opacity-30' : 'hover:shadow-md hover:-translate-y-0.5'}`}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-gray-900 leading-snug mb-2">{task.title}</p>
      {blocked && task.status !== 'done' && (
        <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full w-fit mb-2">
          <AlertTriangle className="w-3 h-3" />Dépendance
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex -space-x-1">
          {assignees.slice(0, 3).map(u => (
            <div key={u.id} title={u.name}
              className="w-6 h-6 rounded-full bg-[#00c875] border-2 border-white flex items-center justify-center text-white text-xs font-bold shrink-0">
              {u.name.charAt(0)}
            </div>
          ))}
          {assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold">
              +{assignees.length - 3}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {commentCount > 0 && <span>💬 {commentCount}</span>}
          {attachCount > 0 && <span>📎 {attachCount}</span>}
          {task.endDate && <span>{formatDate(task.endDate)}</span>}
          {task.budget > 0 && <span className="font-medium text-gray-500">{task.budget.toLocaleString('fr-FR')} €</span>}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ col, children }: { col: Column; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });
  return (
    <div ref={setNodeRef}
      className={`flex-1 bg-gray-50 border border-t-0 border-gray-200 rounded-b-xl p-2 space-y-2 overflow-y-auto min-h-[200px] transition-colors ${isOver ? 'bg-green-50 border-green-300' : ''}`}>
      {children}
    </div>
  );
}

interface Props {
  workstreamId: string;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onCreateTask: (defaultStatus: TaskStatus) => void;
}

export default function KanbanBoard({ workstreamId: _workstreamId, tasks, onOpenTask, onCreateTask }: Props) {
  const allTasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const updateTaskStatus = useProjectStore(s => s.updateTaskStatus);
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);
  const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const isBlocked = (task: Task) =>
    task.dependsOn.some(depId => {
      const dep = allTasks.find(t => t.id === depId);
      return dep && dep.status !== 'done';
    });

  const draggingTask = tasks.find(t => t.id === draggingId);

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find(t => t.id === active.id);
    if (task && task.status !== newStatus) {
      updateTaskStatus(task.id, newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {COLUMNS.map(col => {
          const ColIcon = col.icon;
          const colTasks = tasks.filter(t => t.status === col.status);
          return (
            <div key={col.status} className="flex flex-col min-h-[300px] min-w-[280px] md:flex-1">
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${col.headerBg} border border-b-0 border-gray-200`}>
                <div className={`flex items-center gap-2 font-semibold text-sm ${col.headerText}`}>
                  <ColIcon className="w-4 h-4" />{col.label}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.countBg}`}>{colTasks.length}</span>
              </div>
              <DroppableColumn col={col}>
                {colTasks.map(task => {
                  const blocked = isBlocked(task);
                  const assignees = task.assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean) as typeof users;
                  return (
                    <TaskCard key={task.id} task={task} col={col} blocked={blocked} assignees={assignees}
                      onClick={() => onOpenTask(task)} isDragging={task.id === draggingId} />
                  );
                })}
                {colTasks.length === 0 && !draggingId && (
                  <div className="text-center text-xs text-gray-400 py-6">Aucune tâche</div>
                )}
                {canEdit && (
                  <button onClick={() => onCreateTask(col.status)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-all">
                    <Plus className="w-3.5 h-3.5" />Ajouter une tâche
                  </button>
                )}
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {draggingTask && (() => {
          const col = COLUMNS.find(c => c.status === draggingTask.status) ?? COLUMNS[0];
          const assignees = draggingTask.assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean) as typeof users;
          return (
            <div className={`bg-white rounded-lg border-l-4 border border-gray-200 p-3 shadow-xl opacity-90 rotate-2 ${col.cardBorder}`}>
              <p className="text-sm font-medium text-gray-900">{draggingTask.title}</p>
              <div className="flex -space-x-1 mt-2">
                {assignees.slice(0, 3).map(u => (
                  <div key={u.id} className="w-6 h-6 rounded-full bg-[#00c875] border-2 border-white flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                ))}
              </div>
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}
