import { useState } from 'react';
import { Save, Settings, FolderKanban } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { Workstream } from '../../types';

type Tab = 'workstreams' | 'project';

const PRESET_COLORS: { label: string; tailwind: string; hex: string }[] = [
  { label: 'Jaune', tailwind: 'bg-yellow-400', hex: '#facc15' },
  { label: 'Vert citron', tailwind: 'bg-lime-600', hex: '#65a30d' },
  { label: 'Sarcelle', tailwind: 'bg-teal-500', hex: '#14b8a6' },
  { label: 'Rouge', tailwind: 'bg-red-500', hex: '#ef4444' },
  { label: 'Rose', tailwind: 'bg-pink-500', hex: '#ec4899' },
  { label: 'Violet', tailwind: 'bg-purple-600', hex: '#9333ea' },
  { label: 'Indigo', tailwind: 'bg-indigo-600', hex: '#4f46e5' },
  { label: 'Cyan', tailwind: 'bg-cyan-500', hex: '#06b6d4' },
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
};

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
  instance: Workstream['instance'];
  assigneeIds: string[];
  saved: boolean;
}

export default function SettingsView() {
  const [tab, setTab] = useState<Tab>('workstreams');
  const workstreams = useProjectStore(s => s.workstreams);
  const updateWorkstream = useProjectStore(s => s.updateWorkstream);
  const projectName = useProjectStore(s => s.projectName);
  const projectSubtitle = useProjectStore(s => s.projectSubtitle);
  const updateProjectInfo = useProjectStore(s => s.updateProjectInfo);
  const users = useAuthStore(s => s.users);

  const [rows, setRows] = useState<Record<string, WsRowState>>(() =>
    Object.fromEntries(workstreams.map(ws => [ws.id, {
      name: ws.name,
      description: ws.description,
      color: ws.color,
      instance: ws.instance,
      assigneeIds: ws.assigneeIds ?? [],
      saved: false,
    }]))
  );

  const [pName, setPName] = useState(projectName);
  const [pSubtitle, setPSubtitle] = useState(projectSubtitle);
  const [projectSaved, setProjectSaved] = useState(false);

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
    updateWorkstream(id, {
      name: row.name,
      description: row.description,
      color: row.color,
      textColor: TEXT_COLOR_MAP[row.color] ?? 'text-white',
      instance: row.instance,
      assigneeIds: row.assigneeIds,
    });
    setRows(r => ({ ...r, [id]: { ...r[id], saved: true } }));
    setTimeout(() => setRows(r => ({ ...r, [id]: { ...r[id], saved: false } })), 2000);
  };

  const saveProject = () => {
    updateProjectInfo(pName, pSubtitle);
    setProjectSaved(true);
    setTimeout(() => setProjectSaved(false), 2000);
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
      </div>

      {tab === 'workstreams' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Modifiez le nom, la description, la couleur et l'instance de chaque axe.</p>
          {workstreams.map(ws => {
            const row = rows[ws.id];
            if (!row) return null;
            const hexColor = COLOR_HEX[row.color] ?? '#888';
            return (
              <div key={ws.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-stretch">
                  {/* Color bar */}
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: hexColor }} />
                  <div className="flex-1 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {/* Name */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Nom</label>
                        <input
                          value={row.name}
                          onChange={e => updateRow(ws.id, { name: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
                        />
                      </div>

                      {/* Description */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Description</label>
                        <input
                          value={row.description}
                          onChange={e => updateRow(ws.id, { description: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
                        />
                      </div>

                      {/* Color */}
                      <div className="md:col-span-2">
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

                      {/* Instance */}
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Instance</label>
                        <select
                          value={row.instance}
                          onChange={e => updateRow(ws.id, { instance: e.target.value as Workstream['instance'] })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent bg-white"
                        >
                          {INSTANCE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Assignees */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Responsables</label>
                        <div className="flex flex-wrap gap-2">
                          {users.map(u => {
                            const assigned = row.assigneeIds.includes(u.id);
                            return (
                              <button
                                key={u.id}
                                type="button"
                                title={u.name}
                                onClick={() => toggleWsAssignee(ws.id, u.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border-2 text-xs font-medium transition-all min-h-[36px] ${assigned ? 'border-[#00c875] bg-[#00c875] text-white' : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400'}`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 ${assigned ? 'bg-white/30' : 'bg-gray-200'}`}>
                                  {u.name.charAt(0)}
                                </span>
                                <span className="hidden sm:inline">{u.name.split(' ')[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                        {row.assigneeIds.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {row.assigneeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Save button */}
                      <div className="md:col-span-1 flex items-end">
                        <button
                          onClick={() => saveRow(ws.id)}
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${row.saved ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-[#00c875] hover:bg-[#00b368] text-white'}`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          {row.saved ? 'Sauvé' : 'Sauver'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
              placeholder="Nom du projet"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
            <input
              value={pSubtitle}
              onChange={e => { setPSubtitle(e.target.value); setProjectSaved(false); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent"
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
