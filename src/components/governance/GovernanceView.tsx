import { useState } from 'react';
import { Network, Users, Layers, Pencil, Save, X } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { GovernanceInstance } from '../../types';

export default function GovernanceView() {
  const { governance, workstreams, updateGovernance } = useProjectStore();
  const { users, currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<GovernanceInstance>>({});

  const startEdit = (g: GovernanceInstance) => {
    setEditingId(g.id);
    setDraft({ memberIds: [...g.memberIds], workstreamIds: [...g.workstreamIds], description: g.description });
  };

  const saveEdit = (id: string) => {
    updateGovernance(id, draft);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

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

  const COLORS = ['bg-lime-600', 'bg-teal-600'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-green-100 p-2 rounded-lg">
          <Network className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gouvernance</h1>
          <p className="text-gray-500 mt-0.5">Instances de pilotage du projet</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {governance.map((g, i) => {
          const isEditing = editingId === g.id;
          const memberIds = isEditing ? (draft.memberIds ?? []) : g.memberIds;
          const wsIds = isEditing ? (draft.workstreamIds ?? []) : g.workstreamIds;
          const desc = isEditing ? (draft.description ?? '') : g.description;
          const members = users.filter(u => memberIds.includes(u.id));
          const gWorkstreams = workstreams.filter(ws => wsIds.includes(ws.id));

          return (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`${COLORS[i]} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-bold text-white">{g.name}</h2>
                </div>
                {isSuperAdmin && !isEditing && (
                  <button onClick={() => startEdit(g)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4 text-white" />
                  </button>
                )}
                {isEditing && (
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(g.id)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"><Save className="w-4 h-4 text-white" /></button>
                    <button onClick={cancelEdit} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"><X className="w-4 h-4 text-white" /></button>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                {isEditing ? (
                  <textarea
                    value={desc}
                    onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm text-gray-600">{g.description}</p>
                )}

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Users className="w-3.5 h-3.5" />
                    Membres ({members.length})
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
                      {members.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Aucun membre</span>
                      ) : members.map(m => (
                        <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
                          <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-[10px] font-bold">{m.name.charAt(0)}</div>
                          <span className="text-xs text-gray-700 font-medium">{m.name}</span>
                          <span className="text-[10px] text-gray-400 capitalize">({m.role})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Layers className="w-3.5 h-3.5" />
                    Axes suivis ({gWorkstreams.length})
                  </div>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1.5">
                      {workstreams.map(ws => (
                        <button key={ws.id} type="button" onClick={() => toggleWs(ws.id)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${wsIds.includes(ws.id) ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {ws.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {gWorkstreams.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Aucun axe</span>
                      ) : gWorkstreams.map(ws => (
                        <span key={ws.id} className={`${ws.color} ${ws.textColor} text-xs px-2 py-0.5 rounded-full font-medium`}>{ws.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Org chart hint */}
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
        <Network className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Le schéma de gouvernance complet est disponible dans la documentation du projet.</p>
      </div>
    </div>
  );
}
