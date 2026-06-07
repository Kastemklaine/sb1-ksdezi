import { useState } from 'react';
import { FileText, Lock, Pencil, Save } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import RichTextEditor from '../editor/RichTextEditor';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function FinalPageView() {
  const { finalPage, updateFinalPage } = useProjectStore();
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Page résultat</h1>
            <p className="text-gray-500 mt-0.5">Synthèse du projet — Vers la 4e fleur</p>
          </div>
        </div>

        {isSuperAdmin && !editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
            <Pencil className="w-4 h-4" />
            Modifier
          </button>
        )}

        {!isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            Lecture seule
          </div>
        )}
      </div>

      {finalPage.updatedBy && (
        <p className="text-xs text-gray-400">
          Dernière mise à jour le {updatedDate}{author ? ` par ${author.name}` : ''}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {editing ? (
          <>
            <RichTextEditor content={draft} onChange={setDraft} placeholder="Rédigez la synthèse du projet..." />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                <Save className="w-4 h-4" />
                Publier
              </button>
            </div>
          </>
        ) : (
          <div
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: finalPage.content }}
          />
        )}
      </div>
    </div>
  );
}
