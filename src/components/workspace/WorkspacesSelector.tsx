import { FolderOpen, FileText, MessageSquare } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import type { View } from '../../App';

interface Props {
  setView: (v: View) => void;
}

export default function WorkspacesSelector({ setView }: Props) {
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const documents = useProjectStore(s => curProject(s)?.documents ?? []);
  const discussions = useProjectStore(s => curProject(s)?.discussions ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">Espaces de travail</h2>
      </div>
      <p className="text-sm text-gray-500">
        Chaque axe du projet dispose d'un espace de travail avec deux sections : Travail &amp; Réflexion (membres) et Dossier Final (tous).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workstreams.map(ws => {
          const docCount = documents.filter(d => d.workstreamId === ws.id).length;
          const discussion = discussions.find(d => d.workstreamId === ws.id);
          const msgCount = discussion?.messages.length ?? 0;

          return (
            <button
              key={ws.id}
              onClick={() => setView({ type: 'workspace', workstreamId: ws.id })}
              className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:shadow-md hover:border-green-300 transition-all group touch-manipulation min-h-[44px]"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${ws.color}`} />
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                    {ws.name}
                  </h3>
                  {ws.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ws.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {docCount} document{docCount !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {msgCount} message{msgCount !== 1 ? 's' : ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {workstreams.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun axe de projet configuré</p>
        </div>
      )}
    </div>
  );
}
