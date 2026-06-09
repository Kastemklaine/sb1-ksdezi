import { useState } from 'react';
import { Network, Users, Layers, Pencil, Save, X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { GovernanceInstance } from '../../types';

const HEADER_COLORS = [
  'bg-lime-600', 'bg-teal-600', 'bg-blue-600', 'bg-purple-600',
  'bg-orange-500', 'bg-red-600', 'bg-indigo-600', 'bg-emerald-600',
];

export default function GovernanceView() {
  const governance = useProjectStore(s => curProject(s)?.governance ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const updateGovernance = useProjectStore(s => s.updateGovernance);
  const createGovernance = useProjectStore(s => s.createGovernance);
  const deleteGovernance = useProjectStore(s => s.deleteGovernance);
  const moveGovernance = useProjectStore(s => s.moveGovernance);
  const { users, currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<GovernanceInstance>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const startEdit = (g: GovernanceInstance) => {
    setEditingId(g.id);
    setDraft({ name: g.name, memberIds: [...g.memberIds], workstreamIds: [...g.workstreamIds], description: g.description });
  };

  const saveEdit = (id: string) => {
    updateGovernance(id, draft);
    setEditingId(null);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createGovernance(newName.trim());
    setNewName('');
    setShowNewForm(false);
  };

  const toggleMember = (userId: string) => {
    setDraft(d => ({
      ...d,
      memberIds: d.memberIds?.includes(userId)
        ? d.memberIds.filter(x => x !== userId)
        : [...(d.memberIds ?? []), userId]
    }));
  };

  const toggleWs = (wsId: string) => {
    setDraft(d => ({
      ...d,
      workstreamIds: d.workstreamIds?.includes(wsId)
        ? d.workstreamIds.filter(x => x !== wsId)
        : [...(d.workstreamIds ?? []), wsId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <Network className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gouvernance</h1>
            <p className="text-gray-500 mt-0.5">Instances de pilotage du projet</p>
          </div>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white text-sm font-medium px-4 py-2 rounded-lg min-h-[44px]">
            <Plus className="w-4 h-4" /> Nouvelle instance
          </button>
        )}
      </div>

      {/* New instance form */}
      {showNewForm && (
        <div className="bg-white border border-[#00c875] rounded-xl p-4 flex items-center gap-3">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nom de l'instance (ex: COPIL, COTEC, Comité de quartier…)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875]" />
          <button onClick={handleCreate} disabled={!newName.trim()}
            className="px-4 py-2 bg-[#00c875] hover:bg-[#00b368] disabled:opacity-40 text-white text-sm font-medium rounded-lg">
            Créer
          </button>
          <button onClick={() => { setShowNewForm(false); setNewName(''); }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {governance.length === 0 && !showNewForm && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Network className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucune instance de gouvernance</p>
          {isSuperAdmin && (
            <button onClick={() => setShowNewForm(true)}
              className="mt-3 text-sm text-[#00c875] font-medium hover:underline">
              + Créer une instance
            </button>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {governance.map((g, i) => {
          const isEditing = editingId === g.id;
          const memberIds = isEditing ? (draft.memberIds ?? []) : g.memberIds;
          const wsIds = isEditing ? (draft.workstreamIds ?? []) : g.workstreamIds;
          const desc = isEditing ? (draft.description ?? '') : g.description;
          const name = isEditing ? (draft.name ?? g.name) : g.name;
          const members = users.filter(u => memberIds.includes(u.id));
          const gWorkstreams = workstreams.filter(ws => wsIds.includes(ws.id));
          const color = HEADER_COLORS[i % HEADER_COLORS.length];

          return (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`${color} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Users className="w-5 h-5 text-white shrink-0" />
                  {isEditing ? (
                    <input value={name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      className="flex-1 bg-white/20 text-white placeholder-white/60 text-lg font-bold rounded px-2 py-0.5 border border-white/30 focus:outline-none focus:border-white min-w-0" />
                  ) : (
                    <h2 className="text-lg font-bold text-white truncate">{g.name}</h2>
                  )}
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-1 shrink-0 ml-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(g.id)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"><Save className="w-4 h-4 text-white" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"><X className="w-4 h-4 text-white" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => moveGovernance(g.id, 'up')} disabled={i === 0}
                          className="p-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-30 rounded-lg" title="Monter">
                          <ChevronUp className="w-4 h-4 text-white" />
                        </button>
                        <button onClick={() => moveGovernance(g.id, 'down')} disabled={i === governance.length - 1}
                          className="p-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-30 rounded-lg" title="Descendre">
                          <ChevronDown className="w-4 h-4 text-white" />
                        </button>
                        <button onClick={() => startEdit(g)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg">
                          <Pencil className="w-4 h-4 text-white" />
                        </button>
                        <button onClick={() => setConfirmDelete(g.id)} className="p-1.5 bg-white/20 hover:bg-red-500/50 rounded-lg">
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {confirmDelete === g.id && (
                <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-red-700 font-medium">Supprimer cette instance ?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
                    <button onClick={() => { deleteGovernance(g.id); setConfirmDelete(null); }}
                      className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg">Supprimer</button>
                  </div>
                </div>
              )}

              <div className="p-5 space-y-4">
                {isEditing ? (
                  <textarea value={desc} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    placeholder="Description de l'instance…"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={2} />
                ) : (
                  <p className="text-sm text-gray-600">{g.description || <span className="italic text-gray-300">Aucune description</span>}</p>
                )}

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Users className="w-3.5 h-3.5" /> Membres ({members.length})
                  </div>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {users.map(u => (
                        <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${memberIds.includes(u.id) ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          <span className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-bold">{u.name.charAt(0)}</span>
                          {u.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {members.length === 0
                        ? <span className="text-xs text-gray-400 italic">Aucun membre assigné</span>
                        : members.map(m => (
                          <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
                            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-[10px] font-bold">{m.name.charAt(0)}</div>
                            <span className="text-xs text-gray-700 font-medium">{m.name}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Layers className="w-3.5 h-3.5" /> Axes suivis ({gWorkstreams.length})
                  </div>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1.5">
                      {workstreams.length === 0
                        ? <span className="text-xs text-gray-400 italic">Aucun axe créé dans ce projet — ajoutez-en dans Paramètres</span>
                        : workstreams.map(ws => (
                          <button key={ws.id} type="button" onClick={() => toggleWs(ws.id)}
                            className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${wsIds.includes(ws.id) ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                            {ws.name}
                          </button>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {gWorkstreams.length === 0
                        ? <span className="text-xs text-gray-400 italic">Aucun axe associé</span>
                        : gWorkstreams.map(ws => (
                          <span key={ws.id} className={`${ws.color} ${ws.textColor} text-xs px-2 py-0.5 rounded-full font-medium`}>{ws.name}</span>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
