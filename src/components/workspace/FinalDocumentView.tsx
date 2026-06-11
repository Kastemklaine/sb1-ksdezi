import { useState } from 'react';
import { Printer, FileText, ChevronDown, ChevronRight, Pencil, Save, Send, BarChart2 } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';

type HeadingLevel = 1 | 2;

export default function FinalDocumentView() {
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const allDocuments = useProjectStore(s => curProject(s)?.documents ?? []);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const projectName = useProjectStore(s => curProject(s)?.name ?? '');
  const projectSubtitle = useProjectStore(s => curProject(s)?.subtitle ?? '');
  const updateFinalPage = useProjectStore(s => s.updateFinalPage);
  const currentUser = useAuthStore(s => s.currentUser);
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [globalIntro, setGlobalIntro] = useState('');
  const [globalConclusion, setGlobalConclusion] = useState('');
  const [wsLevels, setWsLevels] = useState<Record<string, HeadingLevel>>({});
  const [wsIntros, setWsIntros] = useState<Record<string, string>>({});
  const [wsCollapsed, setWsCollapsed] = useState<Record<string, boolean>>({});
  const [editingIntro, setEditingIntro] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editMode, setEditMode] = useState(false);

  const finalDocs = allDocuments.filter(d => d.space === 'final');

  const wsProgress = workstreams.map(ws => {
    const wsTasks = tasks.filter(t => t.workstreamId === ws.id);
    const done = wsTasks.filter(t => t.status === 'done').length;
    const pct = wsTasks.length === 0 ? 0 : Math.round(done / wsTasks.length * 100);
    return { ws, total: wsTasks.length, done, pct };
  });

  const generateDocHTML = () => {
    const sections = workstreams.map(ws => {
      const level = wsLevels[ws.id] ?? 1;
      const tag = `h${level}`;
      const intro = wsIntros[ws.id] ?? '';
      const docs = finalDocs.filter(d => d.workstreamId === ws.id);
      const { pct, done, total } = wsProgress.find(p => p.ws.id === ws.id) ?? { pct: 0, done: 0, total: 0 };
      return `
        <${tag} style="margin-top:2em;border-bottom:2px solid #e5e7eb;padding-bottom:0.3em">${ws.name}</${tag}>
        ${total > 0 ? `<p style="color:#6b7280;font-size:0.85em">Avancement : ${pct}% (${done}/${total} tâches)</p>` : ''}
        ${intro ? `<p style="font-style:italic;color:#374151">${intro}</p>` : ''}
        ${docs.map(doc => `<h3 style="margin-top:1.5em">${doc.title}</h3>${doc.content}`).join('')}
        ${docs.length === 0 ? '<p style="color:#9ca3af;font-style:italic">Aucun document final pour cet axe.</p>' : ''}
      `;
    }).join('');

    return `
      <h1 style="text-align:center;margin-bottom:0.2em">${projectName}</h1>
      <p style="text-align:center;color:#6b7280;font-style:italic;margin-bottom:2em">${projectSubtitle}</p>
      ${globalIntro ? `<div style="margin-bottom:2em;padding:1em;background:#f9fafb;border-left:4px solid #00c875">${globalIntro}</div>` : ''}
      ${sections}
      ${globalConclusion ? `<div style="margin-top:2em;padding:1em;background:#f9fafb;border-left:4px solid #00c875">${globalConclusion}</div>` : ''}
    `;
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"><title>${projectName} — Dossier Final</title>
      <style>
        body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; max-width: 800px; margin: 40px auto; color: #111; }
        h1 { font-size: 22pt; } h2 { font-size: 16pt; } h3 { font-size: 13pt; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>${generateDocHTML()}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  const handlePublish = () => {
    if (!currentUser) return;
    updateFinalPage(generateDocHTML(), currentUser.id);
    alert('Publié dans la Page Résultat !');
  };

  const startIntroEdit = (key: string, current: string) => {
    setEditingIntro(key);
    setEditDraft(current);
  };

  const saveIntroEdit = (key: string) => {
    if (key === '__global') setGlobalIntro(editDraft);
    else if (key === '__conclusion') setGlobalConclusion(editDraft);
    else setWsIntros(prev => ({ ...prev, [key]: editDraft }));
    setEditingIntro(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg"><FileText className="w-5 h-5 text-green-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dossier Final</h1>
            <p className="text-gray-500 text-sm mt-0.5">Vue globale des documents finaux par axe</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSuperAdmin && (
            <button onClick={() => setEditMode(m => !m)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editMode ? 'bg-gray-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              <Pencil className="w-4 h-4" /> {editMode ? 'Fermer édition' : 'Mode édition'}
            </button>
          )}
          <button onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" /> Impression / PDF
          </button>
          {isSuperAdmin && (
            <button onClick={handlePublish}
              className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Send className="w-4 h-4" /> Publier dans Page Résultat
            </button>
          )}
        </div>
      </div>

      {wsProgress.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Avancement global</h2>
          </div>
          <div className="space-y-2">
            {wsProgress.map(({ ws, pct, done, total }) => (
              <div key={ws.id} className="flex items-center gap-3">
                <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${ws.color}`} />
                <span className="text-xs text-gray-700 w-40 truncate shrink-0">{ws.name}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500 shrink-0 w-20 text-right">{pct}% ({done}/{total})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Introduction générale</h2>
            {editingIntro !== '__global' && (
              <button onClick={() => startIntroEdit('__global', globalIntro)} className="p-1 rounded hover:bg-gray-100">
                <Pencil className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          {editingIntro === '__global' ? (
            <div className="space-y-2">
              <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              <button onClick={() => saveIntroEdit('__global')}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg">
                <Save className="w-3.5 h-3.5" /> Enregistrer
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">{globalIntro || <span className="text-gray-300">Cliquez sur ✎ pour ajouter une introduction…</span>}</p>
          )}
        </div>
      )}

      {workstreams.map(ws => {
        const docs = finalDocs.filter(d => d.workstreamId === ws.id);
        const collapsed = wsCollapsed[ws.id] ?? false;
        const level = wsLevels[ws.id] ?? 1;
        const intro = wsIntros[ws.id] ?? '';
        const { pct, done, total } = wsProgress.find(p => p.ws.id === ws.id) ?? { pct: 0, done: 0, total: 0 };

        return (
          <div key={ws.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className={`${ws.color} px-5 py-3 flex items-center justify-between`}>
              <button onClick={() => setWsCollapsed(prev => ({ ...prev, [ws.id]: !collapsed }))}
                className="flex items-center gap-2 flex-1 min-w-0 text-left">
                {collapsed ? <ChevronRight className="w-4 h-4 text-white shrink-0" /> : <ChevronDown className="w-4 h-4 text-white shrink-0" />}
                <span className={`font-bold text-white ${level === 1 ? 'text-lg' : 'text-base'}`}>{ws.name}</span>
                {total > 0 && <span className="ml-2 text-xs text-white/70">{pct}%</span>}
              </button>
              {editMode && (
                <div className="flex gap-1 ml-2 shrink-0">
                  <button onClick={() => setWsLevels(prev => ({ ...prev, [ws.id]: 1 }))}
                    className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${level === 1 ? 'bg-white text-gray-800' : 'bg-white/20 text-white'}`}>H1</button>
                  <button onClick={() => setWsLevels(prev => ({ ...prev, [ws.id]: 2 }))}
                    className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${level === 2 ? 'bg-white text-gray-800' : 'bg-white/20 text-white'}`}>H2</button>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="p-5 space-y-4">
                {(editMode || intro) && (
                  <div className="flex items-start gap-2">
                    {editingIntro === ws.id ? (
                      <div className="flex-1 space-y-2">
                        <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                        <button onClick={() => saveIntroEdit(ws.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg">
                          <Save className="w-3.5 h-3.5" /> Enregistrer
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-sm text-gray-600 italic">{intro || <span className="text-gray-300">Introduction de l'axe…</span>}</p>
                        {editMode && (
                          <button onClick={() => startIntroEdit(ws.id, intro)} className="p-1 rounded hover:bg-gray-100 shrink-0">
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {total > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Avancement</span><span>{done}/{total} tâches</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {docs.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucun document final pour cet axe.</p>
                ) : (
                  <div className="space-y-3">
                    {docs.map(doc => (
                      <div key={doc.id} className="border border-gray-100 rounded-lg p-3">
                        <h3 className="font-semibold text-gray-800 text-sm mb-2">{doc.title}</h3>
                        <div className="prose prose-sm max-w-none text-gray-700 text-xs" dangerouslySetInnerHTML={{ __html: doc.content }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {editMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Conclusion générale</h2>
            {editingIntro !== '__conclusion' && (
              <button onClick={() => startIntroEdit('__conclusion', globalConclusion)} className="p-1 rounded hover:bg-gray-100">
                <Pencil className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          {editingIntro === '__conclusion' ? (
            <div className="space-y-2">
              <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              <button onClick={() => saveIntroEdit('__conclusion')}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg">
                <Save className="w-3.5 h-3.5" /> Enregistrer
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">{globalConclusion || <span className="text-gray-300">Cliquez sur ✎ pour ajouter une conclusion…</span>}</p>
          )}
        </div>
      )}
    </div>
  );
}
