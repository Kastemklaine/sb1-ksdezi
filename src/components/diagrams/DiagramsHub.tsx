import { GitBranch, CalendarRange, Users2, ArrowRight, Clock } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import type { View } from '../../App';

interface Props {
  setView: (v: View) => void;
}

const TOOLS = [
  {
    title: 'Schémas de flux',
    description: 'Créez et gérez des diagrammes de processus avec des nœuds et des connexions.',
    icon: GitBranch,
    color: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-700',
    btnColor: 'bg-purple-600 hover:bg-purple-700',
    view: { type: 'diagrams-editor' } as View,
  },
  {
    title: 'Planning Gantt',
    description: 'Visualisez la chronologie des tâches sur une frise temporelle par axe.',
    icon: CalendarRange,
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
    view: { type: 'gantt' } as View,
  },
  {
    title: 'Organigramme',
    description: 'Consultez la structure de gouvernance et les responsables de chaque axe.',
    icon: Users2,
    color: 'bg-teal-50 border-teal-200',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    btnColor: 'bg-teal-600 hover:bg-teal-700',
    view: { type: 'orgchart' } as View,
  },
];

export default function DiagramsHub({ setView }: Props) {
  const allDocuments = useProjectStore(s => curProject(s)?.documents ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);

  const recentDiagrams = allDocuments
    .filter(d => d.type === 'diagram')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Outils visuels</h1>
        <p className="text-gray-500 mt-1 text-sm">Diagrammes, planning et organigramme du projet</p>
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {TOOLS.map(tool => {
          const Icon = tool.icon;
          return (
            <div key={tool.title} className={`rounded-xl border p-6 space-y-4 ${tool.color}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tool.iconBg}`}>
                <Icon className={`w-5 h-5 ${tool.iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{tool.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{tool.description}</p>
              </div>
              <button
                onClick={() => setView(tool.view)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${tool.btnColor}`}
              >
                Ouvrir <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent diagrams */}
      {recentDiagrams.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Schémas récents</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentDiagrams.map(doc => {
              const ws = workstreams.find(w => w.id === doc.workstreamId);
              return (
                <button
                  key={doc.id}
                  onClick={() => setView({ type: 'diagrams-editor', diagramId: doc.id })}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md hover:border-purple-300 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <GitBranch className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{doc.title}</p>
                      {ws && <p className="text-xs text-gray-400 mt-0.5">{ws.name}</p>}
                      <p className="text-xs text-gray-300 mt-1">
                        {new Date(doc.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors shrink-0 mt-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
