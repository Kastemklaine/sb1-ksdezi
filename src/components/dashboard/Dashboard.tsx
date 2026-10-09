import { Megaphone, Settings, Heart, BookOpen, MapPin, Flower2, Building2, Users, TrendingUp, ArrowRight, Car, Trash2, Bike, TreePine, Accessibility, AlertCircle, Clock, Flag } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import type { View } from '../../App';
import { parseISO, differenceInDays } from 'date-fns';

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

  const today = new Date();
  const lateTasks = tasks.filter(t => t.endDate && t.status !== 'done' && differenceInDays(today, parseISO(t.endDate)) > 0);
  const upcoming = tasks
    .filter(t => t.endDate && t.status !== 'done' && differenceInDays(parseISO(t.endDate), today) >= 0 && differenceInDays(parseISO(t.endDate), today) <= 7)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
  const highPriorityTasks = tasks.filter(t => t.priority === 'haute' && t.status !== 'done');

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  return (
    <div className="space-y-7">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00a862] via-[#00985a] to-[#00844e] text-white px-6 py-6 sm:px-8 sm:py-7 shadow-lg">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-24 bottom-0 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
              <Flower2 className="w-3.5 h-3.5" /> Vers la 4ᵉ fleur
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{greeting} 👋</h1>
            <p className="text-white/85 mt-1 text-sm sm:text-base">{projectSubtitle || 'Tableau de bord du projet'}</p>
          </div>
          {totalTasks > 0 && (
            <div className="flex items-center gap-4 shrink-0">
              <ProgressRing pct={progressPct} />
              <div className="hidden sm:block">
                <p className="text-3xl font-extrabold leading-none">{doneTasks}<span className="text-white/60 text-lg font-bold">/{totalTasks}</span></p>
                <p className="text-white/80 text-sm mt-1">tâches terminées</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Tâches totales" value={totalTasks} sub="dans le projet" accentColor="#6366f1" />
        <KpiCard label="En cours" value={inProgressTasks} sub="tâches actives" accentColor="#3b82f6" />
        <KpiCard label="Terminées" value={doneTasks} sub={`${progressPct}% complété`} accentColor="#00c875" />
        <KpiCard label="Bloquées" value={blockedTasks} sub="nécessitent attention" accentColor="#ef4444" />
        <KpiCard label="En retard" value={lateTasks.length} sub={lateTasks.length === 0 ? 'aucun retard' : 'à traiter'} accentColor={lateTasks.length > 0 ? '#f97316' : '#6b7280'} />
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-xs text-gray-500">
            <span><span className="font-semibold text-gray-700">{doneTasks}</span> terminées</span>
            <span><span className="font-semibold text-gray-700">{inProgressTasks}</span> en cours</span>
            <span><span className="font-semibold text-gray-700">{blockedTasks}</span> bloquées</span>
            {totalBudget > 0 && <span>Budget: <span className="font-semibold text-gray-700">{totalBudget.toLocaleString('fr-FR')} €</span></span>}
          </div>
        </div>
      )}

      {/* Alert rows */}
      {(lateTasks.length > 0 || upcoming.length > 0 || highPriorityTasks.length > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          {lateTasks.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-orange-800">En retard ({lateTasks.length})</h3>
              </div>
              <div className="space-y-1.5">
                {lateTasks.slice(0, 4).map(t => {
                  const ws = workstreams.find(w => w.id === t.workstreamId);
                  return (
                    <button key={t.id} onClick={() => setView({ type: 'workstream', id: t.workstreamId })}
                      className="w-full text-left flex items-center gap-2 text-xs text-orange-700 hover:text-orange-900 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      <span className="truncate flex-1">{t.title}</span>
                      <span className="text-orange-400 shrink-0">{ws?.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
                {lateTasks.length > 4 && <p className="text-xs text-orange-400">+{lateTasks.length - 4} autres</p>}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-800">Échéances proches (7j)</h3>
              </div>
              <div className="space-y-1.5">
                {upcoming.slice(0, 4).map(t => {
                  const days = differenceInDays(parseISO(t.endDate), today);
                  return (
                    <button key={t.id} onClick={() => setView({ type: 'workstream', id: t.workstreamId })}
                      className="w-full text-left flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span className="truncate flex-1">{t.title}</span>
                      <span className="text-blue-400 shrink-0">{days === 0 ? 'auj.' : `J-${days}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {highPriorityTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-semibold text-red-800">Priorité haute ({highPriorityTasks.length})</h3>
              </div>
              <div className="space-y-1.5">
                {highPriorityTasks.slice(0, 4).map(t => (
                  <button key={t.id} onClick={() => setView({ type: 'workstream', id: t.workstreamId })}
                    className="w-full text-left flex items-center gap-2 text-xs text-red-700 hover:text-red-900 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {highPriorityTasks.length > 4 && <p className="text-xs text-red-400">+{highPriorityTasks.length - 4} autres</p>}
              </div>
            </div>
          )}
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

function KpiCard({ label, value, sub, accentColor }: {
  label: string;
  value: number | string;
  sub: string;
  accentColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm overflow-hidden relative hover:shadow-md transition-shadow">
      <div
        className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />
      <p className="text-xs text-gray-500 font-semibold pl-1">{label}</p>
      <p className="text-3xl font-extrabold mt-1 pl-1" style={{ color: accentColor }}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5 pl-1">{sub}</p>
      <div
        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-[76px] h-[76px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
        <circle
          cx="38" cy="38" r={r} fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-white font-extrabold text-lg">{pct}%</span>
    </div>
  );
}
