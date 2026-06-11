import { useState } from 'react';
import { FileText, Lock, Pencil, Save, CheckCircle2, Clock, Circle } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import RichTextEditor from '../editor/RichTextEditor';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function FinalPageView() {
  const finalPage = useProjectStore(s => curProject(s)?.finalPage ?? { content: '', updatedAt: '', updatedBy: '' });
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const updateFinalPage = useProjectStore(s => s.updateFinalPage);
  const currentUser = useAuthStore(s => s.currentUser);
  const users = useAuthStore(s => s.users);
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(finalPage.content);

  const handleSave = () => {
    updateFinalPage(draft, currentUser?.id ?? '');
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(finalPage.content);
    setEditing(false);
  };

  const author = users.find(u => u.id === finalPage.updatedBy);
  const updatedDate = (() => {
    try { return format(parseISO(finalPage.updatedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr }); } catch { return ''; }
  })();

  // Compute progress per workstream
  const wsProgress = workstreams.map(ws => {
    const wsTasks = tasks.filter(t => t.workstreamId === ws.id);
    const total = wsTasks.length;
    const done = wsTasks.filter(t => t.status === 'done').length;
    const inProgress = wsTasks.filter(t => t.status === 'inprogress').length;
    const pct = total === 0 ? 0 : Math.round(done / total * 100);
    return { ws, total, done, inProgress, pct };
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overallPct = totalTasks === 0 ? 0 : Math.round(doneTasks / totalTasks * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Page résultat</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Synthèse du projet — publiée depuis le Dossier Final</p>
          </div>
        </div>
        {isSuperAdmin && !editing && (
          <button onClick={() => { setDraft(finalPage.content); setEditing(true); }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[40px]">
            <Pencil className="w-4 h-4" /> Modifier
          </button>
        )}
        {!isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
            <Lock className="w-3.5 h-3.5" /> Lecture seule
          </div>
        )}
      </div>

      {/* Progress timeline / Frise d'avancement */}
      {workstreams.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Avancement du projet</h2>
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${overallPct === 100 ? 'bg-green-100 text-green-700' : overallPct > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {overallPct}% terminé
            </span>
          </div>

          {/* Overall bar */}
          <div className="mb-5">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${overallPct === 100 ? 'bg-green-500' : overallPct > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{doneTasks} / {totalTasks} tâche{totalTasks > 1 ? 's' : ''} terminée{doneTasks > 1 ? 's' : ''}</p>
          </div>

          {/* Per-workstream frise */}
          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 hidden sm:block" />
            <div className="space-y-3">
              {wsProgress.map(({ ws, total, done, inProgress, pct }) => {
                const isDone = pct === 100;
                const isStarted = pct > 0 || inProgress > 0;
                return (
                  <div key={ws.id} className="flex items-start gap-3 sm:gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${isDone ? 'bg-green-500 text-white' : isStarted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : isStarted ? <Clock className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${ws.color}`} />
                          <span className="font-medium text-gray-800 text-sm truncate">{ws.name}</span>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${isDone ? 'text-green-600' : isStarted ? 'text-blue-600' : 'text-gray-400'}`}>
                          {pct}%
                        </span>
                      </div>
                      {total > 0 && (
                        <>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{done}/{total} tâche{total > 1 ? 's' : ''}</p>
                        </>
                      )}
                      {total === 0 && <p className="text-xs text-gray-400 mt-0.5 italic">Aucune tâche</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {finalPage.updatedBy && (
        <p className="text-xs text-gray-400">
          Dernière mise à jour le {updatedDate}{author ? ` par ${author.name}` : ''}
        </p>
      )}

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {editing ? (
          <>
            <RichTextEditor content={draft} onChange={setDraft} placeholder="Rédigez la synthèse ou publiez depuis le Dossier Final…" enableImageUpload />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium min-h-[40px]">
                <Save className="w-4 h-4" /> Enregistrer
              </button>
            </div>
          </>
        ) : finalPage.content ? (
          <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: finalPage.content }} />
        ) : (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun contenu publié</p>
            <p className="text-xs mt-1">Cliquez sur &quot;Publier dans Page Résultat&quot; depuis le Dossier Final pour publier automatiquement.</p>
          </div>
        )}
      </div>
    </div>
  );
}
