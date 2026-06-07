import { useState } from 'react';
import { GitBranch, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import DiagramEditor, { type DiagramData } from './DiagramEditor';
import type { View } from '../../App';

interface Props {
  setView: (v: View) => void;
}

export default function DiagramsView({ setView: _setView }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const allDocuments = useProjectStore(s => curProject(s)?.documents ?? []);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const createDocument = useProjectStore(s => s.createDocument);
  const updateDocument = useProjectStore(s => s.updateDocument);
  const deleteDocument = useProjectStore(s => s.deleteDocument);

  const diagrams = allDocuments.filter(d => d.type === 'diagram');

  const [editingDiagramId, setEditingDiagramId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingData, setEditingData] = useState<DiagramData>({ nodes: [], edges: [] });
  const [showWorkstreamPicker, setShowWorkstreamPicker] = useState(false);
  const [newDiagramWsId, setNewDiagramWsId] = useState('');

  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const openNewDiagram = () => {
    if (workstreams.length === 0) return;
    setShowWorkstreamPicker(true);
    setNewDiagramWsId(workstreams[0].id);
  };

  const startNewDiagram = () => {
    setShowWorkstreamPicker(false);
    setEditingDiagramId('new');
    setEditingTitle('Nouveau schéma');
    setEditingData({ nodes: [], edges: [] });
  };

  const openDiagram = (docId: string) => {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    try {
      const data = JSON.parse(doc.content) as DiagramData;
      setEditingData(data);
    } catch {
      setEditingData({ nodes: [], edges: [] });
    }
    setEditingTitle(doc.title);
    setEditingDiagramId(docId);
  };

  const handleSave = (data: DiagramData) => {
    if (!currentUser) return;
    const content = JSON.stringify(data);
    if (editingDiagramId === 'new') {
      createDocument({
        workstreamId: newDiagramWsId,
        title: editingTitle || 'Schéma sans titre',
        content,
        space: 'travail',
        type: 'diagram',
        authorId: currentUser.id,
      });
    } else if (editingDiagramId) {
      updateDocument(editingDiagramId, { title: editingTitle, content });
    }
    setEditingDiagramId(null);
  };

  if (editingDiagramId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-3 no-print shrink-0">
          <button
            onClick={() => setEditingDiagramId(null)}
            className="flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700 min-h-[44px] touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <input
            type="text"
            value={editingTitle}
            onChange={e => setEditingTitle(e.target.value)}
            className="flex-1 text-base font-semibold text-gray-800 border-b border-gray-300 focus:outline-none focus:border-green-500 px-1 py-0.5"
            placeholder="Titre du schéma"
          />
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-0">
          <DiagramEditor
            initialData={editingData}
            onSave={handleSave}
            onClose={() => setEditingDiagramId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Schémas</h2>
        </div>
        <button
          onClick={openNewDiagram}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors touch-manipulation min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Nouveau schéma
        </button>
      </div>

      {showWorkstreamPicker && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-800">Choisir l'axe du projet</h3>
          <select
            value={newDiagramWsId}
            onChange={e => setNewDiagramWsId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {workstreams.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button
              onClick={() => setShowWorkstreamPicker(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] touch-manipulation"
            >
              Annuler
            </button>
            <button
              onClick={startNewDiagram}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px] touch-manipulation"
            >
              Créer le schéma
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {diagrams.map(doc => {
          const ws = workstreams.find(w => w.id === doc.workstreamId);
          return (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="w-4 h-4 text-purple-500 shrink-0" />
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{doc.title}</h3>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {ws && (
                <div className="flex items-center gap-1.5 mb-3">
                  <div className={`w-2 h-2 rounded-full ${ws.color}`} />
                  <span className="text-xs text-gray-500">{ws.name}</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mb-4">
                Modifié le {new Date(doc.updatedAt).toLocaleDateString('fr-FR')}
              </p>
              <button
                onClick={() => openDiagram(doc.id)}
                className="w-full text-center text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 py-2 rounded-lg transition-colors touch-manipulation min-h-[36px]"
              >
                Ouvrir l'éditeur
              </button>
            </div>
          );
        })}
      </div>

      {diagrams.length === 0 && !showWorkstreamPicker && (
        <div className="text-center py-16 text-gray-400">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun schéma créé</p>
          <p className="text-xs mt-1">Cliquez sur "Nouveau schéma" pour commencer</p>
        </div>
      )}
    </div>
  );
}
