import { Megaphone, Settings, Heart, BookOpen, MapPin, Flower2, Building2, Users, TrendingUp, ArrowRight, Car, Trash2, Bike, TreePine, Accessibility } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import type { View } from '../../App';

const ICON_MAP: Record<string, React.ElementType> = {
  Megaphone, Settings, Heart, BookOpen, MapPin, Flower2, Building2, Users, Car, Trash2, Bike, TreePine, Accessibility,
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
  setView: (v: View) => void;
}

export default function Dashboard({ setView }: Props) {
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const projectSubtitle = useProjectStore(s => curProject(s)?.subtitle ?? '');

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'inprogress').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  const totalBudget = tasks.reduce((acc, t) => acc + (t.budget || 0), 0);
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-7">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1 text-sm">{projectSubtitle}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Tâches totales"
          value={totalTasks}
          sub="dans le projet"
          accentColor="#6366f1"
          lightBg="#eef2ff"
        />
        <KpiCard
          label="En cours"
          value={inProgressTasks}
          sub="tâches actives"
          accentColor="#3b82f6"
          lightBg="#eff6ff"
        />
        <KpiCard
          label="Terminées"
          value={doneTasks}
          sub={`${progressPct}% complété`}
          accentColor="#00c875"
          lightBg="#f0fdf4"
        />
        <KpiCard
          label="Bloquées"
          value={blockedTasks}
          sub="nécessitent attention"
          accentColor="#ef4444"
          lightBg="#fff1f2"
        />
      </div>

      {/* Global progress bar */}
      {totalTasks > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00c875]" />
              <span className="font-semibold text-gray-800 text-sm">Avancement global du projet</span>
            </div>
            <span className="text-sm font-bold text-[#00c875]">{progressPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: '#00c875' }}
            />
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
            <span><span className="font-semibold text-gray-700">{doneTasks}</span> terminées</span>
            <span><span className="font-semibold text-gray-700">{inProgressTasks}</span> en cours</span>
            <span><span className="font-semibold text-gray-700">{blockedTasks}</span> bloquées</span>
            {totalBudget > 0 && <span>Budget: <span className="font-semibold text-gray-700">{totalBudget.toLocaleString('fr-FR')} €</span></span>}
          </div>
        </div>
      )}

      {/* Workstream cards — Monday.com style */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3 uppercase tracking-wide text-xs">Axes du projet</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workstreams.map(ws => {
            const wsTasks = tasks.filter(t => t.workstreamId === ws.id);
            const wsDone = wsTasks.filter(t => t.status === 'done').length;
            const wsBlocked = wsTasks.filter(t => t.status === 'blocked').length;
            const wsInProgress = wsTasks.filter(t => t.status === 'inprogress').length;
            const wsTodo = wsTasks.length - wsDone - wsBlocked - wsInProgress;
            const wsBudget = wsTasks.reduce((acc, t) => acc + (t.budget || 0), 0);
            const pct = wsTasks.length > 0 ? Math.round((wsDone / wsTasks.length) * 100) : 0;
            const Icon = ICON_MAP[ws.icon] ?? Megaphone;
            const borderColor = COLOR_HEX[ws.color] ?? '#888';

            return (
              <button
                key={ws.id}
                onClick={() => setView({ type: 'workstream', id: ws.id })}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all text-left flex"
              >
                {/* Colored left border — Monday.com style */}
                <div className="w-1 shrink-0" style={{ backgroundColor: borderColor }} />

                <div className="flex-1 p-4 space-y-3 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${borderColor}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: borderColor }} />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{ws.name}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 mt-0.5" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{ws.description}</p>

                  {/* Status pills */}
                  <div className="flex flex-wrap gap-1">
                    {wsTasks.length === 0 ? (
                      <span className="text-xs text-gray-300 italic">Aucune tâche</span>
                    ) : (
                      <>
                        {wsTodo > 0 && <StatusPill label={`${wsTodo} à faire`} color="bg-gray-100 text-gray-600" />}
                        {wsInProgress > 0 && <StatusPill label={`${wsInProgress} en cours`} color="bg-blue-100 text-blue-700" />}
                        {wsBlocked > 0 && <StatusPill label={`${wsBlocked} bloqué${wsBlocked > 1 ? 's' : ''}`} color="bg-red-100 text-red-700" />}
                        {wsDone > 0 && <StatusPill label={`${wsDone} terminé${wsDone > 1 ? 's' : ''}`} color="bg-green-100 text-green-700" />}
                      </>
                    )}
                  </div>

                  {/* Progress */}
                  {wsTasks.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                        <span>Progression</span>
                        <span className="font-semibold" style={{ color: pct === 100 ? '#00c875' : '#64748b' }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#00c875' : borderColor }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Budget */}
                  {wsBudget > 0 && (
                    <p className="text-xs text-gray-400">
                      Budget : <span className="font-semibold text-gray-600">{wsBudget.toLocaleString('fr-FR')} €</span>
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accentColor, lightBg }: {
  label: string;
  value: number | string;
  sub: string;
  accentColor: string;
  lightBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm overflow-hidden relative">
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />
      <p className="text-xs text-gray-500 font-medium pl-1">{label}</p>
      <p className="text-2xl font-bold mt-1 pl-1" style={{ color: accentColor }}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5 pl-1">{sub}</p>
      <div
        className="absolute top-2 right-3 w-9 h-9 rounded-lg flex items-center justify-center text-lg font-black opacity-20"
        style={{ backgroundColor: lightBg, color: accentColor }}
      />
    </div>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}
