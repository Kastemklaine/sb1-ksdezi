import { Users2, ArrowLeft, User } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { View } from '../../App';

interface Props {
  setView: (v: View) => void;
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00c875] to-[#009660] flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function OrgChartView({ setView }: Props) {
  const governance = useProjectStore(s => curProject(s)?.governance ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const users = useAuthStore(s => s.users);
  const projectName = useProjectStore(s => curProject(s)?.name ?? 'Projet');

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView({ type: 'diagrams' })}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="bg-teal-100 p-2 rounded-lg">
          <Users2 className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organigramme</h1>
          <p className="text-gray-500 text-sm mt-0.5">Structure du {projectName}</p>
        </div>
      </div>

      {/* Project root node */}
      <div className="flex flex-col items-center">
        <div className="bg-gray-900 text-white rounded-xl px-6 py-3 text-center shadow-lg">
          <p className="font-bold text-base">{projectName}</p>
          <p className="text-xs text-gray-400 mt-0.5">Projet</p>
        </div>

        {/* Connector */}
        {(governance.length > 0 || workstreams.length > 0) && (
          <div className="w-px h-8 bg-gray-300" />
        )}

        {/* Governance instances */}
        {governance.length > 0 && (
          <div className="w-full">
            <div className="flex flex-wrap justify-center gap-6">
              {governance.map(gov => {
                const members = gov.memberIds.map(id => getUserById(id)).filter(Boolean);
                return (
                  <div key={gov.id} className="flex flex-col items-center min-w-[200px]">
                    <div className="bg-indigo-600 text-white rounded-xl px-5 py-2.5 text-center shadow">
                      <p className="font-semibold text-sm">{gov.name}</p>
                      <p className="text-xs text-indigo-200 mt-0.5">{members.length} membre{members.length !== 1 ? 's' : ''}</p>
                    </div>
                    {members.length > 0 && (
                      <>
                        <div className="w-px h-5 bg-gray-300" />
                        <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                          {members.map(u => u && (
                            <div key={u.id} className="flex flex-col items-center gap-1">
                              <Avatar name={u.name} avatarUrl={u.avatarUrl} />
                              <p className="text-xs text-gray-600 font-medium text-center max-w-[80px] truncate">{u.name.split(' ')[0]}</p>
                              {u.fonction && <p className="text-[10px] text-gray-400 text-center max-w-[80px] truncate">{u.fonction}</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Connector to workstreams */}
        {workstreams.length > 0 && (
          <div className="w-px h-8 bg-gray-300 mt-4" />
        )}
      </div>

      {/* Workstreams */}
      {workstreams.length > 0 && (
        <div>
          <p className="text-center text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Axes du projet</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workstreams.map(ws => {
              const assignees = ws.assigneeIds.map(id => getUserById(id)).filter(Boolean);
              return (
                <div key={ws.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className={`${ws.color} px-4 py-3`}>
                    <p className={`font-semibold text-sm ${ws.textColor}`}>{ws.name}</p>
                  </div>
                  <div className="p-3">
                    {assignees.length === 0 ? (
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <User className="w-3.5 h-3.5" />
                        <span>Non assigné</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assignees.map(u => u && (
                          <div key={u.id} className="flex items-center gap-2">
                            <Avatar name={u.name} avatarUrl={u.avatarUrl} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{u.name}</p>
                              {u.fonction && <p className="text-[10px] text-gray-400 truncate">{u.fonction}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
