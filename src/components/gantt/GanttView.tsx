import { useState } from 'react';
import { CalendarRange, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import type { View } from '../../App';
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  setView: (v: View) => void;
}

const STATUS_OPACITY: Record<string, number> = {
  done: 1,
  inprogress: 0.85,
  todo: 0.55,
  blocked: 0.7,
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

export default function GanttView({ setView }: Props) {
  const [monthOffset, setMonthOffset] = useState(0);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);

  const baseMonth = addMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(baseMonth);
  const monthEnd = endOfMonth(addMonths(baseMonth, 2));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalDays = days.length;

  const getLeft = (date: string) => {
    const d = parseISO(date);
    const diff = differenceInDays(d, monthStart);
    return Math.max(0, (diff / totalDays) * 100);
  };

  const getWidth = (start: string, end: string) => {
    const s = parseISO(start);
    const e = parseISO(end);
    const clampedS = s < monthStart ? monthStart : s;
    const clampedE = e > monthEnd ? monthEnd : e;
    const width = (differenceInDays(clampedE, clampedS) + 1) / totalDays * 100;
    return Math.max(0.5, width);
  };

  const isInRange = (start: string, end: string) => {
    const s = parseISO(start);
    const e = parseISO(end);
    return isWithinInterval(monthStart, { start: s, end: e }) ||
      isWithinInterval(monthEnd, { start: s, end: e }) ||
      (s >= monthStart && s <= monthEnd) ||
      (e >= monthStart && e <= monthEnd);
  };

  // Month markers
  const months: { label: string; left: number }[] = [];
  for (let i = 0; i <= 2; i++) {
    const m = addMonths(monthStart, i);
    const left = (differenceInDays(startOfMonth(m), monthStart) / totalDays) * 100;
    months.push({ label: format(m, 'MMMM yyyy', { locale: fr }), left });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setView({ type: 'diagrams' })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="bg-blue-100 p-2 rounded-lg">
          <CalendarRange className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning Gantt</h1>
          <p className="text-gray-500 text-sm mt-0.5">Vue chronologique des tâches</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setMonthOffset(o => o - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2 min-w-[120px] text-center capitalize">
            {format(monthStart, 'MMMM yyyy', { locale: fr })}
          </span>
          <button onClick={() => setMonthOffset(o => o + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto shadow-sm">
        {/* Month headers */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          <div className="w-48 shrink-0 px-3 py-2 border-r border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">Axe / Tâche</div>
          <div className="flex-1 relative h-8 min-w-[500px]">
            {months.map(m => (
              <div key={m.label} className="absolute top-0 h-full flex items-center px-2 text-xs font-medium text-gray-600 capitalize border-r border-gray-200" style={{ left: `${m.left}%` }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {workstreams.map(ws => {
          const wsTasks = tasks.filter(t => t.workstreamId === ws.id && isInRange(t.startDate, t.endDate));
          const color = COLOR_HEX[ws.color] ?? '#888';
          return (
            <div key={ws.id}>
              {/* Workstream header */}
              <div className="flex items-center border-b border-gray-100 bg-gray-50/70">
                <div className="w-48 shrink-0 px-3 py-2 flex items-center gap-2 border-r border-gray-200">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-gray-700 truncate">{ws.name}</span>
                </div>
                <div className="flex-1 min-w-[500px] h-7" />
              </div>
              {/* Task bars */}
              {wsTasks.map(task => (
                <div key={task.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <div className="w-48 shrink-0 px-4 py-1.5 border-r border-gray-100">
                    <p className="text-xs text-gray-600 truncate">{task.title}</p>
                  </div>
                  <div className="flex-1 relative h-7 min-w-[500px]">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full flex items-center px-2"
                      style={{
                        left: `${getLeft(task.startDate)}%`,
                        width: `${getWidth(task.startDate, task.endDate)}%`,
                        backgroundColor: color,
                        opacity: STATUS_OPACITY[task.status] ?? 0.7,
                      }}
                      title={`${task.title} — ${task.status}`}
                    />
                  </div>
                </div>
              ))}
              {wsTasks.length === 0 && (
                <div className="flex items-center border-b border-gray-50">
                  <div className="w-48 shrink-0 px-4 py-1.5 border-r border-gray-100">
                    <p className="text-xs text-gray-300 italic">Aucune tâche visible</p>
                  </div>
                  <div className="flex-1 min-w-[500px] h-7" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
