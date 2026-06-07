import { useState } from 'react';
import { Plus, Trash2, X, FileText, MessageSquare, Send, ChevronDown, ChevronRight, FolderPlus, ArrowLeft } from 'lucide-react';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import SimpleRichTextEditor from './RichTextEditor';
import type { WorkspaceDocument } from '../../types';
import type { View } from '../../App';

interface Props {
  workstreamId: string;
  setView: (v: View) => void;
}

type TabType = 'travail' | 'final';

export default function WorkspaceView({ workstreamId, setView }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const users = useAuthStore(s => s.users);

  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const allDocuments = useProjectStore(s => curProject(s)?.documents ?? []);
  const allDiscussions = useProjectStore(s => curProject(s)?.discussions ?? []);

  const createDocument = useProjectStore(s => s.createDocument);
  const updateDocument = useProjectStore(s => s.updateDocument);
  const deleteDocument = useProjectStore(s => s.deleteDocument);
  const createSubSection = useProjectStore(s => s.createSubSection);
  const deleteSubSection = useProjectStore(s => s.deleteSubSection);
  const addDiscussionMessage = useProjectStore(s => s.addDiscussionMessage);

  const workstream = workstreams.find(ws => ws.id === workstreamId);
  const subSections = workstream?.subSections ?? [];

  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isMember = isAdmin || (currentUser?.workstreamIds ?? []).includes(workstreamId);

  const [activeTab, setActiveTab] = useState<TabType>('travail');
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(null);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [msgInput, setMsgInput] = useState('');

  // Document editor state
  const [editingDoc, setEditingDoc] = useState<WorkspaceDocument | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [showNewSubSection, setShowNewSubSection] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  // Collapsed state for final sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const discussion = allDiscussions.find(d => d.workstreamId === workstreamId);
  const messages = discussion?.messages ?? [];

  const travailDocs = allDocuments.filter(d => d.workstreamId === workstreamId && d.space === 'travail');
  const finalDocs = allDocuments.filter(d => d.workstreamId === workstreamId && d.space === 'final');

  const filteredTravailDocs = selectedSubSection
    ? travailDocs.filter(d => d.subSectionId === selectedSubSection)
    : travailDocs.filter(d => !d.subSectionId);

  const openNewDoc = (space: 'travail' | 'final') => {
    const newDoc: WorkspaceDocument = {
      id: '',
      workstreamId,
      subSectionId: selectedSubSection ?? undefined,
      title: 'Nouveau document',
      content: '',
      space,
      authorId: currentUser?.id ?? '',
      createdAt: '',
      updatedAt: '',
    };
    setEditingDoc(newDoc);
    setDocTitle('Nouveau document');
    setDocContent('');
  };

  const openExistingDoc = (doc: WorkspaceDocument) => {
    setEditingDoc(doc);
    setDocTitle(doc.title);
    setDocContent(doc.content);
  };

  const handleSaveDoc = () => {
    if (!editingDoc || !currentUser) return;
    if (editingDoc.id === '') {
      createDocument({
        workstreamId,
        subSectionId: editingDoc.subSectionId,
        title: docTitle || 'Sans titre',
        content: docContent,
        space: editingDoc.space,
        type: 'document',
        authorId: currentUser.id,
      });
    } else {
      updateDocument(editingDoc.id, { title: docTitle, content: docContent });
    }
    setEditingDoc(null);
  };

  const handleSendMessage = () => {
    if (!msgInput.trim() || !currentUser) return;
    addDiscussionMessage(workstreamId, currentUser.id, msgInput.trim());
    setMsgInput('');
  };

  const handleAddSubSection = () => {
    if (!newSubName.trim()) return;
    createSubSection(workstreamId, newSubName.trim());
    setNewSubName('');
    setShowNewSubSection(false);
  };

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name ?? userId;

  if (!workstream) return <div className="text-gray-500">Axe introuvable.</div>;

  // Document editor overlay
  if (editingDoc) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setEditingDoc(null)}
            className="flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700 min-h-[44px] touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">{workstream.name}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              type="text"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              className="w-full text-xl font-bold text-gray-900 border-none outline-none bg-transparent"
              placeholder="Titre du document"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SimpleRichTextEditor
              content={docContent}
              onChange={setDocContent}
              onSave={handleSaveDoc}
              placeholder="Rédigez votre contenu..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView({ type: 'workspaces' })}
            className="flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700 min-h-[44px] touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4" />
            Espaces de travail
          </button>
          <span className="text-gray-300">/</span>
          <div className={`w-3 h-3 rounded-full ${workstream.color}`} />
          <h2 className="text-lg font-bold text-gray-900">{workstream.name}</h2>
        </div>
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveTab('travail')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors touch-manipulation min-h-[36px] ${
              activeTab === 'travail' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Travail &amp; Réflexion
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors touch-manipulation min-h-[36px] ${
              activeTab === 'final' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dossier Final
          </button>
        </div>
      </div>

      {/* ── Tab: Travail & Réflexion ── */}
      {activeTab === 'travail' && (
        !isMember ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700 text-sm">
            Accès réservé aux membres de cet axe et aux administrateurs.
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
            {/* Sidebar: sub-sections + discussion toggle */}
            <div className="md:w-56 shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sections</p>
                <button
                  onClick={() => setSelectedSubSection(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors touch-manipulation min-h-[40px] ${
                    selectedSubSection === null ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Général
                </button>
                {subSections.map(ss => (
                  <div key={ss.id} className="flex items-center group">
                    <button
                      onClick={() => setSelectedSubSection(ss.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors touch-manipulation min-h-[40px] ${
                        selectedSubSection === ss.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {ss.name}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => deleteSubSection(workstreamId, ss.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  showNewSubSection ? (
                    <div className="mt-2 flex gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={newSubName}
                        onChange={e => setNewSubName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSubSection()}
                        placeholder="Nom..."
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      <button onClick={handleAddSubSection} className="p-1 bg-green-600 text-white rounded text-xs touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewSubSection(true)}
                      className="mt-2 w-full flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-green-600 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation"
                    >
                      <FolderPlus className="w-3 h-3" />
                      Nouvelle section
                    </button>
                  )
                )}
              </div>
              <div className="p-3">
                <button
                  onClick={() => setShowDiscussion(d => !d)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors touch-manipulation min-h-[40px] ${
                    showDiscussion ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Discussions
                  {messages.length > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold rounded-full px-1.5">
                      {messages.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Main area */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {/* Documents list */}
              {!showDiscussion && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 text-sm">
                      Documents — {selectedSubSection ? subSections.find(s => s.id === selectedSubSection)?.name : 'Général'}
                    </h3>
                    <button
                      onClick={() => openNewDoc('travail')}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors touch-manipulation min-h-[36px]"
                    >
                      <Plus className="w-3 h-3" />
                      Nouveau document
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredTravailDocs.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Aucun document
                      </div>
                    ) : (
                      filteredTravailDocs.map(doc => (
                        <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => openExistingDoc(doc)}
                              className="font-medium text-sm text-gray-800 hover:text-green-700 text-left touch-manipulation"
                            >
                              {doc.title}
                            </button>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Par {getUserName(doc.authorId)} — {new Date(doc.updatedAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Discussion panel */}
              {showDiscussion && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      Discussions
                    </h3>
                    <button onClick={() => setShowDiscussion(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 touch-manipulation">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Aucun message</div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.authorId === currentUser?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${isMe ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                              {!isMe && (
                                <p className="text-xs font-semibold mb-1 opacity-70">{getUserName(msg.authorId)}</p>
                              )}
                              <p>{msg.content}</p>
                              <p className={`text-xs mt-1 opacity-60`}>
                                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Votre message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!msgInput.trim()}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── Tab: Dossier Final ── */}
      {activeTab === 'final' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Dossier Final</h3>
            {isMember && (
              <button
                onClick={() => openNewDoc('final')}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors touch-manipulation min-h-[36px]"
              >
                <Plus className="w-3 h-3" />
                Nouveau document final
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Documents without sub-section */}
            {finalDocs.filter(d => !d.subSectionId).map(doc => (
              <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                <FileText className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <button onClick={() => openExistingDoc(doc)} className="font-medium text-sm text-gray-800 hover:text-green-700 text-left touch-manipulation">
                    {doc.title}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(doc.updatedAt).toLocaleDateString('fr-FR')}</p>
                </div>
                {isMember && (
                  <button onClick={() => deleteDocument(doc.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {/* Documents grouped by sub-section */}
            {subSections.map(ss => {
              const ssDocs = finalDocs.filter(d => d.subSectionId === ss.id);
              if (ssDocs.length === 0) return null;
              const isCollapsed = collapsed[ss.id];
              return (
                <div key={ss.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [ss.id]: !c[ss.id] }))}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700 transition-colors touch-manipulation"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {ss.name}
                    <span className="ml-auto text-xs font-normal text-gray-400">{ssDocs.length} doc{ssDocs.length > 1 ? 's' : ''}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="p-3 space-y-2">
                      {ssDocs.map(doc => (
                        <div key={doc.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 group">
                          <FileText className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <button onClick={() => openExistingDoc(doc)} className="flex-1 text-left text-sm text-gray-800 hover:text-green-700 font-medium touch-manipulation">
                            {doc.title}
                          </button>
                          {isMember && (
                            <button onClick={() => deleteDocument(doc.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {finalDocs.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucun document dans le dossier final
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
