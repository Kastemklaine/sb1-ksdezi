import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Shield, User, Crown } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import type { Role, User as UserType } from '../../types';

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ElementType; color: string }> = {
  superadmin: { label: 'Super Admin', icon: Crown, color: 'bg-yellow-100 text-yellow-800' },
  admin: { label: 'Admin', icon: Shield, color: 'bg-blue-100 text-blue-800' },
  membre: { label: 'Membre', icon: User, color: 'bg-gray-100 text-gray-700' },
};

interface FormData {
  name: string;
  email: string;
  role: Role;
  workstreamIds: string[];
  password: string;
}

const EMPTY_FORM: FormData = { name: '', email: '', role: 'membre', workstreamIds: [], password: '' };

export default function UserManagement() {
  const { users, createUser, updateUser, deleteUser } = useAuthStore();
  const workstreams = useProjectStore(s => s.workstreams);
  const currentUser = useAuthStore(s => s.currentUser);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const openCreate = () => { setEditingUser(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (u: UserType) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, workstreamIds: u.workstreamIds, password: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editingUser) {
      updateUser(editingUser.id, { name: form.name, email: form.email, role: form.role, workstreamIds: form.workstreamIds });
    } else {
      if (!form.password) return;
      createUser(form);
    }
    setShowModal(false);
  };

  const handleDelete = (u: UserType) => {
    if (u.id === currentUser?.id) return alert('Vous ne pouvez pas supprimer votre propre compte.');
    if (confirm(`Supprimer ${u.name} ?`)) deleteUser(u.id);
  };

  const toggleWs = (id: string) => {
    setForm(f => ({ ...f, workstreamIds: f.workstreamIds.includes(id) ? f.workstreamIds.filter(x => x !== id) : [...f.workstreamIds, id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-gray-500 mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''} dans le système</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Axes attribués</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => {
              const rc = ROLE_CONFIG[u.role];
              const RoleIcon = rc.icon;
              const wsNames = u.workstreamIds.map(id => workstreams.find(w => w.id === id)?.name).filter(Boolean);
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 w-fit px-2 py-1 rounded-full text-xs font-medium ${rc.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {rc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {wsNames.length === 0 ? (
                      <span className="text-gray-400 text-xs">Tous les axes</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {wsNames.map((name, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold">{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
                  <option value="membre">Membre</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Axes attribués (laisser vide = tous)</label>
                <div className="flex flex-wrap gap-2">
                  {workstreams.map(ws => (
                    <button key={ws.id} type="button" onClick={() => toggleWs(ws.id)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${form.workstreamIds.includes(ws.id) ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {ws.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                {editingUser ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
