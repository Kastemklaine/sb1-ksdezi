import { useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { parseISO, format, startOfMonth, addMonths, subMonths, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { View } from '../../App';

const COLOR_HEX: Record<string, string> = {
  'bg-yellow-400': '#facc15',
  'bg-lime-600': '#65a30d',
  'bg-teal-500': '#14b8a6',
  'bg-red-500': '#ef4444',
  'bg-pink-500': '#ec4899',
  'bg-purple-600': '#9333ea',
  'bg-indigo-600': '#4f46e5',
  'bg-cyan-500': '#06b6d4',
  'bg-orange-500': '#f97316',
  'bg-emerald-600': '#059669',
  'bg-blue-600': '#2563eb',
  'bg-gray-500': '#6b7280',
};

const STATUS_OPACITY: Record<string, number> = {
  done: 1,
  inprogress: 0.85,
  todo: 0.55,
  blocked: 0.7,
};

interface Props {
  setView: (v: View) => void;
}

export default function GanttView({ setView }: Props) {
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);

  const [viewStart, setViewStart] = useState(() => startOfMonth(new Date()));
  const MONTHS = 3;
  const viewEnd = addMonths(viewStart, MONTHS);
  const totalDays = differenceInDays(viewEnd, viewStart) || 1;
  const months = Array.from({ length: MONTHS }, (_, i) => addMonths(viewStart, i));

  const tasksWithDates = tasks.filter(t => t.startDate || t.endDate);

  const getBar = (task: typeof tasks[0]) => {
    const start = task.startDate ? parseISO(task.startDate) : null;
    const end = task.endDate ? parseISO(task.endDate) : null;
    if (!start && !end) return null;
    const barStart = start ?? end!;
    const barEnd = end ?? start!;
    const leftPct = (differenceInDays(barStart, viewStart) / totalDays) * 100;
    const rightPct = (differenceInDays(barEnd, viewStart) / totalDays) * 100;
    if (rightPct < 0 || leftPct > 100) return null;
    return {
      left: `${Math.max(0, leftPct)}%`,
      width: `${Math.max(0.8, Math.min(100, rightPct) - Math.max(0, leftPct))}%`,
    };
  };

  const fmtShort = (d: string) => { try { return format(parseISO(d), 'd MMM', { locale: fr }); } catch { return d; } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <CalendarRange className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Vue chronologique Gantt des tâches</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button onClick={() => setViewStart(d => subMonths(d, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2 min-w-[180px] text-center capitalize">
            {format(viewStart, 'MMM yyyy', { locale: fr })} — {format(addMonths(viewStart, MONTHS - 1), 'MMM yyyy', { locale: fr })}
          </span>
          <button onClick={() => setViewStart(d => addMonths(d, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-44 md:w-56 shrink-0 px-4 py-2.5 border-r border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Tâche
          </div>
          <div className="flex-1 flex">
            {months.map((month, i) => (
              <div key={i} className={`flex-1 px-2 py-2.5 text-xs font-semibold text-gray-600 text-center capitalize ${i > 0 ? 'border-l border-gray-200' : ''}`}>
                {format(month, 'MMMM yyyy', { locale: fr })}
              </div>
            ))}
          </div>
        </div>

        {workstreams.map(ws => {
          const wsTasks = tasksWithDates.filter(t => t.workstreamId === ws.id);
          if (wsTasks.length === 0) return null;
          const hex = COLOR_HEX[ws.color] ?? '#888';

          return (
            <div key={ws.id}>
              {/* Workstream row */}
              <div className="flex items-center border-b border-gray-100 bg-gray-50/50">
                <div className="w-44 md:w-56 shrink-0 px-4 py-2 flex items-center gap-2 border-r border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                  <span className="text-xs font-bold text-gray-600 truncate">{ws.name}</span>
                </div>
                <div className="flex-1 h-7 relative">
                  {months.slice(1).map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${((i + 1) / MONTHS) * 100}%` }} />
                  ))}
                </div>
              </div>

              {/* Task rows */}
              {wsTasks.map(task => {
                const bar = getBar(task);
                const isDone = task.status === 'done';
                return (
                  <div key={task.id} className="flex items-center border-b border-gray-50 hover:bg-blue-50/20 transition-colors group">
                    <div className="w-44 md:w-56 shrink-0 px-4 py-2 border-r border-gray-50">
                      <button onClick={() => setView({ type: 'workstream', id: ws.id })}
                        className="text-xs text-left truncate w-full text-gray-600 group-hover:text-blue-600 transition-colors">
                        {isDone && <span className="text-green-500 mr-1">✓</span>}
                        {task.title}
                      </button>
                    </div>
                    <div className="flex-1 h-8 relative px-1">
                      {months.slice(1).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${((i + 1) / MONTHS) * 100}%` }} />
                      ))}
                      {bar && (
                        <div
                          className="absolute top-1.5 bottom-1.5 rounded-full cursor-pointer hover:brightness-90 transition-all flex items-center px-1.5 overflow-hidden"
                          style={{ ...bar, backgroundColor: hex, opacity: STATUS_OPACITY[task.status] ?? 0.7 }}
                          onClick={() => setView({ type: 'workstream', id: ws.id })}
                          title={`${task.title} — ${task.startDate ? fmtShort(task.startDate) : '?'} → ${task.endDate ? fmtShort(task.endDate) : '?'}`}
                        >
                          <span className="text-[10px] text-white font-medium truncate leading-none opacity-90">{task.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {tasksWithDates.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CalendarRange className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Aucune tâche avec des dates</p>
            <p className="text-xs mt-1 text-gray-300">Ajoutez des dates de début et fin à vos tâches pour les voir ici.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {tasksWithDates.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 px-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-green-500 inline-block" />Terminé</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-500 inline-block opacity-85" />En cours</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-gray-400 inline-block opacity-55" />À faire</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-red-400 inline-block opacity-70" />Bloqué</span>
        </div>
      )}
    </div>
  );
}
