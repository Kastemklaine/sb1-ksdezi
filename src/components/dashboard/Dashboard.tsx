import { Megaphone, Settings, Heart, BookOpen, MapPin, Flower2, Building2, Users, TrendingUp } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { View } from '../../App';

const ICON_MAP: Record<string, React.ElementType> = {
  Megaphone, Settings, Heart, BookOpen, MapPin, Flower2, Building2, Users,
};

interface Props {
  setView: (v: View) => void;
}

export default function Dashboard({ setView }: Props) {
  const workstreams = useProjectStore(s => s.workstreams);
  const tasks = useProjectStore(s => s.tasks);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const totalBudget = tasks.reduce((acc, t) => acc + (t.budget || 0), 0);
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Vue d'ensemble — Vers la 4e fleur</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Tâches totales" value={totalTasks} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard label="Tâches terminées" value={doneTasks} color="text-green-600" bg="bg-green-50" />
        <KpiCard label="Tâches bloquées" value={blockedTasks} color="text-red-600" bg="bg-red-50" />
        <KpiCard label="Budget total" value={`${totalBudget.toLocaleString('fr-FR')} €`} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Progress global */}
      {totalTasks > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-800">Avancement global</span>
            </div>
            <span className="text-sm font-bold text-green-600">{Math.round((doneTasks / totalTasks) * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Workstream cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Axes du projet</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workstreams.map(ws => {
            const wsTasks = tasks.filter(t => t.workstreamId === ws.id);
            const wsDone = wsTasks.filter(t => t.status === 'done').length;
            const wsBlocked = wsTasks.filter(t => t.status === 'blocked').length;
            const wsInProgress = wsTasks.filter(t => t.status === 'inprogress').length;
            const wsBudget = wsTasks.reduce((acc, t) => acc + (t.budget || 0), 0);
            const pct = wsTasks.length > 0 ? Math.round((wsDone / wsTasks.length) * 100) : 0;
            const Icon = ICON_MAP[ws.icon] ?? Megaphone;

            return (
              <button
                key={ws.id}
                onClick={() => setView({ type: 'workstream', id: ws.id })}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left"
              >
                <div className={`${ws.color} px-4 py-3 flex items-center gap-2`}>
                  <Icon className={`w-4 h-4 ${ws.textColor}`} />
                  <span className={`font-semibold text-sm ${ws.textColor} leading-tight`}>{ws.name}</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-500 leading-tight">{ws.description}</p>

                  <div className="flex flex-wrap gap-1 text-xs">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{wsTasks.length - wsDone - wsBlocked - wsInProgress} à faire</span>
                    {wsInProgress > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{wsInProgress} en cours</span>}
                    {wsBlocked > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{wsBlocked} bloqué{wsBlocked > 1 ? 's' : ''}</span>}
                    {wsDone > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{wsDone} terminé{wsDone > 1 ? 's' : ''}</span>}
                  </div>

                  {wsTasks.length > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Avancement</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {wsBudget > 0 && (
                    <p className="text-xs text-gray-500">Budget : <span className="font-medium text-gray-700">{wsBudget.toLocaleString('fr-FR')} €</span></p>
                  )}

                  {wsTasks.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Aucune tâche</p>
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

function KpiCard({ label, value, color, bg }: { label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
