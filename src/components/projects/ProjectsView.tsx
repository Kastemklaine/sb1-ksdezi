import { useState } from 'react';
import { Plus, Trash2, FolderKanban, ChevronRight, AlertTriangle, Check, Pencil, X } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { Project } from '../../types';

export default function ProjectsView() {
  const projects = useProjectStore(s => s.projects);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const createProject = useProjectStore(s => s.createProject);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const switchProject = useProjectStore(s => s.switchProject);
  const updateProjectInfo = useProjectStore(s => s.updateProjectInfo);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject(newName.trim(), newSubtitle.trim());
    setNewName('');
    setNewSubtitle('');
    setShowCreate(false);
  };

  const startEdit = (p: Project) => {
    setEditing(p.id);
    setEditName(p.name);
    setEditSubtitle(p.subtitle);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    const prev = currentProjectId;
    switchProject(id);
    updateProjectInfo(editName.trim(), editSubtitle.trim());
    if (prev !== id) switchProject(prev);
    setEditing(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-500 mt-1 text-sm">Gérez vos projets. Chaque projet a ses propres axes, tâches et gouvernance.</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau projet</span>
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#00c875]/5 border-2 border-[#00c875]/30 border-dashed rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-[#00c875]">Nouveau projet</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Nom du projet *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex : Embellissement du centre-ville"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Sous-titre</label>
              <input
                value={newSubtitle}
                onChange={e => setNewSubtitle(e.target.value)}
                placeholder="Ex : Vers la 5e fleur"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875]"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setShowCreate(false); setNewName(''); setNewSubtitle(''); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 min-h-[44px]">
              Annuler
            </button>
            <button onClick={handleCreate} disabled={!newName.trim()}
              className="px-4 py-2 bg-[#00c875] hover:bg-[#00b368] text-white text-sm font-medium rounded-lg disabled:opacity-50 min-h-[44px]">
              Créer le projet
            </button>
          </div>
        </div>
      )}

      {/* Project cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.map(p => {
          const isCurrent = p.id === currentProjectId;
          const isEditingThis = editing === p.id;
          const isDeletingThis = confirmDelete === p.id;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${isCurrent ? 'border-[#00c875] shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
            >
              {isCurrent && (
                <div className="bg-[#00c875] px-4 py-1.5 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-semibold">Projet actif</span>
                </div>
              )}
              <div className="p-5">
                {isEditingThis ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#00c875]"
                    />
                    <input
                      value={editSubtitle}
                      onChange={e => setEditSubtitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(p.id)}
                        className="flex-1 py-2 bg-[#00c875] text-white text-sm font-medium rounded-lg min-h-[44px]">
                        Enregistrer
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 min-h-[44px]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base leading-snug">{p.name}</h3>
                        <p className="text-sm text-[#00c875] mt-0.5">{p.subtitle}</p>
                      </div>
                      <button onClick={() => startEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-3 mt-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-3.5 h-3.5" />
                        {p.workstreams.length} axe{p.workstreams.length !== 1 ? 's' : ''}
                      </span>
                      <span>{p.tasks.length} tâche{p.tasks.length !== 1 ? 's' : ''}</span>
                      <span className="text-gray-300">·</span>
                      <span>{new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {!isCurrent && (
                        <button
                          onClick={() => switchProject(p.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors min-h-[44px]"
                        >
                          <ChevronRight className="w-4 h-4" />
                          Ouvrir ce projet
                        </button>
                      )}
                      {isCurrent && (
                        <div className="flex-1 py-2 text-center text-sm text-[#00c875] font-medium">
                          Projet ouvert
                        </div>
                      )}
                      {projects.length > 1 && (
                        isDeletingThis ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Supprimer ?</span>
                            <button onClick={() => deleteProject(p.id)} className="font-bold underline">Oui</button>
                            <button onClick={() => setConfirmDelete(null)} className="text-gray-400 underline">Non</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(p.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
