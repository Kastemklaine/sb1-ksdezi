import { useState, useRef } from 'react';
import { Save, Settings, FolderKanban, Plus, Trash2, AlertTriangle, Image } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { sendAssignmentEmail } from '../../lib/emailService';
import type { Workstream } from '../../types';

type Tab = 'workstreams' | 'project' | 'branding';

const PRESET_COLORS: { label: string; tailwind: string; hex: string }[] = [
  { label: 'Jaune', tailwind: 'bg-yellow-400', hex: '#facc15' },
  { label: 'Vert citron', tailwind: 'bg-lime-600', hex: '#65a30d' },
  { label: 'Sarcelle', tailwind: 'bg-teal-500', hex: '#14b8a6' },
  { label: 'Rouge', tailwind: 'bg-red-500', hex: '#ef4444' },
  { label: 'Rose', tailwind: 'bg-pink-500', hex: '#ec4899' },
  { label: 'Violet', tailwind: 'bg-purple-600', hex: '#9333ea' },
  { label: 'Indigo', tailwind: 'bg-indigo-600', hex: '#4f46e5' },
  { label: 'Cyan', tailwind: 'bg-cyan-500', hex: '#06b6d4' },
  { label: 'Orange', tailwind: 'bg-orange-500', hex: '#f97316' },
  { label: 'Émeraude', tailwind: 'bg-emerald-600', hex: '#059669' },
  { label: 'Bleu', tailwind: 'bg-blue-600', hex: '#2563eb' },
  { label: 'Gris', tailwind: 'bg-gray-500', hex: '#6b7280' },
];

const COLOR_HEX: Record<string, string> = Object.fromEntries(PRESET_COLORS.map(c => [c.tailwind, c.hex]));

const TEXT_COLOR_MAP: Record<string, string> = {
  'bg-yellow-400': 'text-yellow-900',
  'bg-lime-600': 'text-white',
  'bg-teal-500': 'text-white',
  'bg-red-500': 'text-white',
  'bg-pink-500': 'text-white',
  'bg-purple-600': 'text-white',
  'bg-indigo-600': 'text-white',
  'bg-cyan-500': 'text-white',
  'bg-orange-500': 'text-white',
  'bg-emerald-600': 'text-white',
  'bg-blue-600': 'text-white',
  'bg-gray-500': 'text-white',
};

const ICON_OPTIONS = [
  'Megaphone', 'Settings', 'Heart', 'BookOpen', 'MapPin', 'Flower2',
  'Building2', 'Users', 'Car', 'Trash2', 'Bike', 'TreePine', 'Accessibility',
  'Star', 'Leaf', 'Globe', 'Home', 'Landmark', 'Lightbulb', 'Pencil',
];

const INSTANCE_OPTIONS: { value: Workstream['instance']; label: string }[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'copil', label: 'COPIL' },
  { value: 'cotec', label: 'COTEC' },
  { value: 'both', label: 'COPIL & COTEC' },
];

interface WsRowState {
  name: string;
  description: string;
  color: string;
  icon: string;
  instance: Workstream['instance'];
  assigneeIds: string[];
  saved: boolean;
}

const DEFAULT_NEW_WS = {
  name: '',
  description: '',
  color: 'bg-blue-600',
  icon: 'Star',
  instance: 'none' as Workstream['instance'],
  assigneeIds: [],
};

export default function SettingsView() {
  const [tab, setTab] = useState<Tab>('workstreams');
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const updateWorkstream = useProjectStore(s => s.updateWorkstream);
  const createWorkstream = useProjectStore(s => s.createWorkstream);
  const deleteWorkstream = useProjectStore(s => s.deleteWorkstream);
  const projectName = useProjectStore(s => curProject(s)?.name ?? 'le projet');
  const projectSubtitle = useProjectStore(s => curProject(s)?.subtitle ?? '');
  const logoUrl = useProjectStore(s => curProject(s)?.logoUrl ?? '');
  const updateProjectInfo = useProjectStore(s => s.updateProjectInfo);
  const updateProjectLogo = useProjectStore(s => s.updateProjectLogo);
  const users = useAuthStore(s => s.users);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Record<string, WsRowState>>(() =>
    Object.fromEntries(workstreams.map(ws => [ws.id, {
      name: ws.name,
      description: ws.description,
      color: ws.color,
      icon: ws.icon,
      instance: ws.instance,
      assigneeIds: ws.assigneeIds ?? [],
      saved: false,
    }]))
  );

  const [pName, setPName] = useState(projectName);
  const [pSubtitle, setPSubtitle] = useState(projectSubtitle);
  const [projectSaved, setProjectSaved] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWs, setNewWs] = useState(DEFAULT_NEW_WS);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Sync rows when workstreams change (new one added)
  const syncRow = (ws: Workstream) => {
    if (!rows[ws.id]) {
      setRows(r => ({
        ...r,
        [ws.id]: { name: ws.name, description: ws.description, color: ws.color, icon: ws.icon, instance: ws.instance, assigneeIds: ws.assigneeIds ?? [], saved: false },
      }));
    }
  };
  workstreams.forEach(syncRow);

  const updateRow = (id: string, patch: Partial<WsRowState>) => {
    setRows(r => ({ ...r, [id]: { ...r[id], ...patch, saved: false } }));
  };

  const toggleWsAssignee = (wsId: string, userId: string) => {
    setRows(r => ({
      ...r,
      [wsId]: {
        ...r[wsId],
        assigneeIds: r[wsId].assigneeIds.includes(userId)
          ? r[wsId].assigneeIds.filter(id => id !== userId)
          : [...r[wsId].assigneeIds, userId],
        saved: false,
      },
    }));
  };

  const saveRow = (id: string) => {
    const row = rows[id];
    const currentWs = workstreams.find(ws => ws.id === id);
    const prevAssignees = currentWs?.assigneeIds ?? [];
    const newAssignees = row.assigneeIds.filter(uid => !prevAssignees.includes(uid));

    updateWorkstream(id, {
      name: row.name,
      description: row.description,
      color: row.color,
      textColor: TEXT_COLOR_MAP[row.color] ?? 'text-white',
      icon: row.icon,
      instance: row.instance,
      assigneeIds: row.assigneeIds,
    });

    // Email newly added assignees
    newAssignees.forEach(uid => {
      const u = users.find(x => x.id === uid);
      if (u) sendAssignmentEmail({ toEmail: u.email, toName: u.name, workstreamName: row.name, projectName });
    });

    setRows(r => ({ ...r, [id]: { ...r[id], saved: true } }));
    setTimeout(() => setRows(r => ({ ...r, [id]: { ...r[id], saved: false } })), 2000);
  };

  const handleCreate = () => {
    if (!newWs.name.trim()) return;
    createWorkstream({
      name: newWs.name.trim(),
      description: newWs.description.trim(),
      color: newWs.color,
      textColor: TEXT_COLOR_MAP[newWs.color] ?? 'text-white',
      icon: newWs.icon,
      instance: newWs.instance,
      assigneeIds: newWs.assigneeIds,
      notes: '',
      subSections: [],
    });
    setNewWs(DEFAULT_NEW_WS);
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    deleteWorkstream(id);
    setConfirmDelete(null);
    setRows(r => { const next = { ...r }; delete next[id]; return next; });
  };

  const saveProject = () => {
    updateProjectInfo(pName, pSubtitle);
    setProjectSaved(true);
    setTimeout(() => setProjectSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProjectLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-1">Configuration du projet et des axes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('workstreams')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'workstreams' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FolderKanban className="w-4 h-4" />
          Axes du projet
        </button>
        <button
          onClick={() => setTab('project')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'project' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Settings className="w-4 h-4" />
          Projet
        </button>
        <button
          onClick={() => setTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'branding' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Image className="w-4 h-4" />
          Branding
        </button>
      </div>

      {tab === 'workstreams' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Modifiez, ajoutez ou supprimez des axes. Les responsables assignés peuvent créer et gérer les tâches de leur axe.</p>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvel axe</span>
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="bg-[#00c875]/5 border-2 border-[#00c875]/30 border-dashed rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-[#00c875]">Nouvel axe</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Nom *</label>
                  <input
                    value={newWs.name}
                    onChange={e => setNewWs(w => ({ ...w, name: e.target.value }))}
                    placeholder="Nom de l'axe"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Description</label>
                  <input
                    value={newWs.description}
                    onChange={e => setNewWs(w => ({ ...w, description: e.target.value }))}
                    placeholder="Description courte"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Couleur</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(pc => (
                      <button
                        key={pc.tailwind}
                        title={pc.label}
                        onClick={() => setNewWs(w => ({ ...w, color: pc.tailwind }))}
                        className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${newWs.color === pc.tailwind ? 'ring-2 ring-offset-1 ring-gray-800 scale-110' : ''}`}
                        style={{ backgroundColor: pc.hex }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Instance</label>
                  <select
                    value={newWs.instance}
                    onChange={e => setNewWs(w => ({ ...w, instance: e.target.value as Workstream['instance'] }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875] bg-white"
                  >
                    {INSTANCE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Icône</label>
                  <select
                    value={newWs.icon}
                    onChange={e => setNewWs(w => ({ ...w, icon: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875] bg-white"
                  >
                    {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button
                  onClick={() => { setShowAddForm(false); setNewWs(DEFAULT_NEW_WS); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 min-h-[44px]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newWs.name.trim()}
                  className="px-4 py-2 bg-[#00c875] hover:bg-[#00b368] text-white text-sm font-medium rounded-lg disabled:opacity-50 min-h-[44px]"
                >
                  Créer l'axe
                </button>
              </div>
            </div>
          )}

          {/* Existing workstream rows */}
          {workstreams.map(ws => {
            const row = rows[ws.id];
            if (!row) return null;
            const hexColor = COLOR_HEX[row.color] ?? '#888';
            return (
              <div key={ws.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-stretch">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: hexColor }} />
                  <div className="flex-1 p-4 space-y-3">
                    {/* Row 1: name + description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Nom</label>
                        <input
                          value={row.name}
                          onChange={e => updateRow(ws.id, { name: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Description</label>
                        <input
                          value={row.description}
                          onChange={e => updateRow(ws.id, { description: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Row 2: color + instance + icon */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Couleur</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {PRESET_COLORS.map(pc => (
                            <button
                              key={pc.tailwind}
                              title={pc.label}
                              onClick={() => updateRow(ws.id, { color: pc.tailwind })}
                              className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${row.color === pc.tailwind ? 'ring-2 ring-offset-1 ring-gray-800 scale-110' : ''}`}
                              style={{ backgroundColor: pc.hex }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Instance</label>
                        <select
                          value={row.instance}
                          onChange={e => updateRow(ws.id, { instance: e.target.value as Workstream['instance'] })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent bg-white"
                        >
                          {INSTANCE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Icône</label>
                        <select
                          value={row.icon}
                          onChange={e => updateRow(ws.id, { icon: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent bg-white"
                        >
                          {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Row 3: assignees */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Responsables</label>
                      <div className="flex flex-wrap gap-2">
                        {users.map(u => {
                          const assigned = row.assigneeIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              title={u.name}
                              onClick={() => toggleWsAssignee(ws.id, u.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 text-xs font-medium transition-all min-h-[36px] ${assigned ? 'border-[#00c875] bg-[#00c875] text-white' : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400'}`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 ${assigned ? 'bg-white/30' : 'bg-gray-200'}`}>
                                {u.name.charAt(0)}
                              </span>
                              <span className="hidden sm:inline">{u.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                        {users.length === 0 && <span className="text-xs text-gray-400 italic">Aucun utilisateur</span>}
                      </div>
                      {row.assigneeIds.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {row.assigneeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Row 4: save + delete */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      {confirmDelete === ws.id ? (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Supprimer cet axe et toutes ses tâches ?</span>
                          <button onClick={() => handleDelete(ws.id)} className="font-semibold underline ml-1">Oui</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-gray-500 underline">Non</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(ws.id)}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors min-h-[36px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Supprimer l'axe
                        </button>
                      )}
                      <button
                        onClick={() => saveRow(ws.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${row.saved ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-[#00c875] hover:bg-[#00b368] text-white'}`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {row.saved ? 'Sauvé ✓' : 'Sauver'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'branding' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-lg">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Logo du projet</h2>
            <p className="text-sm text-gray-500">Le logo apparaît dans la barre latérale en remplacement du nom du projet.</p>
          </div>

          {logoUrl && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <img src={logoUrl} alt="Logo" className="h-14 w-auto max-w-[160px] object-contain rounded-lg" />
              <div>
                <p className="text-sm text-gray-700 font-medium">Logo actuel</p>
                <button onClick={() => updateProjectLogo('')} className="text-xs text-red-500 hover:text-red-700 mt-1 transition-colors">
                  Supprimer le logo
                </button>
              </div>
            </div>
          )}

          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <button onClick={() => logoInputRef.current?.click()}
            className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]">
            <Image className="w-4 h-4" />
            {logoUrl ? 'Changer le logo' : 'Téléverser un logo'}
          </button>
          <p className="text-xs text-gray-400">Formats acceptés : PNG, JPG, SVG. Taille recommandée : 200×60 px.</p>
        </div>
      )}

      {tab === 'project' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-lg">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Informations du projet</h2>
            <p className="text-sm text-gray-500">Ces informations apparaissent dans l'en-tête et la barre latérale.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet</label>
            <input
              value={pName}
              onChange={e => { setPName(e.target.value); setProjectSaved(false); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
              placeholder="Nom du projet"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
            <input
              value={pSubtitle}
              onChange={e => { setPSubtitle(e.target.value); setProjectSaved(false); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
              placeholder="Sous-titre du projet"
            />
          </div>
          <button
            onClick={saveProject}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] w-full sm:w-auto ${projectSaved ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-[#00c875] hover:bg-[#00b368] text-white'}`}
          >
            <Save className="w-4 h-4" />
            {projectSaved ? 'Modifications sauvegardées !' : 'Enregistrer les modifications'}
          </button>
        </div>
      )}
    </div>
  );
}
