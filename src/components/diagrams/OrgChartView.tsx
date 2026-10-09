import { Users2, ArrowLeft, User, Flower2 } from 'lucide-react';
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
  const projectSubtitle = useProjectStore(s => curProject(s)?.subtitle ?? '');

  const getUserById = (id: string) => users.find(u => u.id === id);

  // Order the governance instances to reflect the real hierarchy:
  // COPIL (comité de pilotage, décisionnaire) au sommet, puis COTECH (comité technique).
  const rank = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('copil') || n.includes('pilotage')) return 0;
    if (n.includes('cotech') || n.includes('cotec') || n.includes('technique')) return 1;
    return 2;
  };
  const orderedGov = [...governance].sort((a, b) => rank(a.name) - rank(b.name));

  // Connector between hierarchy levels
  const Connector = () => <div className="w-0.5 h-7 bg-gradient-to-b from-gray-300 to-gray-200" />;

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

      {/* « Ville à hauteur d'enfant » englobe toute la démarche : c'est le cadre.
         À l'intérieur : la gouvernance (COPIL → COTECH) puis les groupes de travail. */}
      <div className="rounded-3xl border-2 border-[#00a862]/40 bg-gradient-to-b from-[#f2fbf7] to-white p-5 sm:p-7 shadow-sm">
        {/* Objectif central qui rassemble tout */}
        <div className="text-center mb-7">
          <span className="inline-flex items-center gap-2 bg-[#00a862] text-white px-5 py-2 rounded-full font-bold shadow">
            <Flower2 className="w-4 h-4" /> {projectSubtitle || 'Vers la 4ᵉ fleur'}
          </span>
          <p className="mt-3 font-extrabold text-gray-900 text-xl leading-snug">Ville à hauteur d'enfant</p>
          <p className="text-gray-500 text-sm">Handicaps &amp; accessibilité — l'objectif qui rassemble toute la démarche</p>
        </div>

      {/* Gouvernance : COPIL → COTECH */}
      <div className="flex flex-col items-center">
        {orderedGov.map((gov, idx) => {
          const members = gov.memberIds.map(id => getUserById(id)).filter(Boolean);
          const isCopil = rank(gov.name) === 0;
          return (
            <div key={gov.id} className="flex flex-col items-center w-full">
              {idx > 0 && <Connector />}
              <div
                className={`rounded-2xl px-7 py-3.5 text-center shadow-lg ${
                  isCopil
                    ? 'bg-gradient-to-br from-[#00a862] to-[#00844e] text-white'
                    : 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                }`}
              >
                <p className="font-bold text-lg tracking-wide">{gov.name}</p>
                <p className="text-xs text-white/70 mt-0.5">
                  {isCopil ? 'Comité de pilotage · décisionnaire' : 'Comité technique'} · {members.length} membre{members.length !== 1 ? 's' : ''}
                </p>
              </div>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center max-w-2xl mt-3">
                  {members.map(u => u && (
                    <div key={u.id} className="flex flex-col items-center gap-1 w-20">
                      <Avatar name={u.name} avatarUrl={u.avatarUrl} />
                      <p className="text-xs text-gray-700 font-semibold text-center leading-tight">{u.name.split(' ')[0]}</p>
                      {u.fonction && <p className="text-[10px] text-gray-400 text-center leading-tight line-clamp-2">{u.fonction}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {orderedGov.length > 0 && workstreams.length > 0 && <Connector />}
      </div>

      {/* Groupes de travail (à l'intérieur de l'objectif) */}
      {workstreams.length > 0 && (
        <div className="mt-6">
          <p className="text-center text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Les {workstreams.length} groupes de travail</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workstreams.map(ws => {
              const assignees = ws.assigneeIds.map(id => getUserById(id)).filter(Boolean);
              return (
                <div key={ws.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className={`${ws.color} px-4 py-3`}>
                    <p className={`font-semibold text-sm ${ws.textColor}`}>{ws.name}</p>
                  </div>
                  <div className="p-3">
                    {assignees.length > 0 ? (
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
                    ) : ws.description ? (
                      <p className="text-xs text-gray-500 leading-relaxed">{ws.description}</p>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <User className="w-3.5 h-3.5" />
                        <span>Non assigné</span>
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
    </div>
  );
}
