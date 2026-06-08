import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Plus, Trash2, BookOpen, MessageSquare,
  Pencil, Check, X, Lock, FileText, ChevronDown, ChevronRight, Loader2, Key
} from 'lucide-react';
import { useIAStore, type KnowledgeDoc } from '../../store/useIAStore';
import { useAuthStore } from '../../store/useAuthStore';
import { encryptText, decryptText } from '../../lib/crypto';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'chat' | 'knowledge';

const SYSTEM_PROMPT = (docs: KnowledgeDoc[]) => {
  const base = `Tu es l'assistant IA officiel du projet "Projet's ma Ville", un projet municipal de participation citoyenne centré sur les enfants.

RÈGLES STRICTES :
1. Tu ne réponds qu'à partir des documents de la base de connaissances fournie ci-dessous.
2. Si l'information n'est pas dans les documents, tu dis EXACTEMENT : "Cette information n'est pas dans ma base de connaissances. Je ne peux pas répondre à cette question sans risquer de me tromper."
3. Tu ne complètes JAMAIS par des suppositions, même si elles semblent logiques.
4. Tu n'es pas complaisant : si une question est hors sujet ou ne peut pas être répondue avec certitude, tu le dis clairement.
5. Quand tu cites une information, tu indiques le document source entre crochets [Titre du document].
6. Tu réponds toujours en français.
7. Si les documents permettent une réponse partielle, tu précises quelle partie tu peux confirmer et quelle partie reste inconnue.

BASE DE CONNAISSANCES :
${docs.length === 0
    ? '⚠️ Aucun document dans la base de connaissances. Tu ne peux répondre à aucune question factuelle pour l\'instant.'
    : docs.map(d => `--- [${d.title}] ---\n${d.content}`).join('\n\n')
  }`;
  return base;
};

export default function IAView() {
  const { apiKey, setApiKey, documents, addDocument, updateDocument, deleteDocument,
    conversations, createConversation, addMessage, deleteConversation, renameConversation } = useIAStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const [tab, setTab] = useState<Tab>('chat');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [streamingText, setStreamingText] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [convSidebarOpen, setConvSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Knowledge base editing
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  // Decrypt messages when conversation changes
  useEffect(() => {
    if (!activeConv) return;
    const decrypt = async () => {
      const map: Record<string, string> = {};
      for (const msg of activeConv.messages) {
        try { map[msg.id] = await decryptText(msg.content); } catch { map[msg.id] = msg.content; }
      }
      setDecrypted(map);
    };
    decrypt();
  }, [activeConv?.id, activeConv?.messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [decrypted, streamingText]);

  const ensureConv = () => {
    if (activeConvId && conversations.find(c => c.id === activeConvId)) return activeConvId;
    const id = createConversation();
    setActiveConvId(id);
    return id;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!apiKey) { setShowKeyModal(true); return; }

    const convId = ensureConv();
    setInput('');
    setLoading(true);
    setStreamingText('');

    const encUserMsg = await encryptText(text);
    addMessage(convId, { role: 'user', content: encUserMsg });

    // Auto-title on first message
    const conv = conversations.find(c => c.id === convId);
    if (!conv || conv.messages.length === 0) {
      renameConversation(convId, text.slice(0, 50));
    }

    try {
      // Build history (decrypt previous messages)
      const history: { role: 'user' | 'assistant'; content: string }[] = [];
      for (const msg of (conv?.messages ?? [])) {
        try {
          const plain = await decryptText(msg.content);
          history.push({ role: msg.role, content: plain });
        } catch { /* skip */ }
      }
      history.push({ role: 'user', content: text });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          stream: true,
          system: SYSTEM_PROMPT(documents),
          messages: history,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(err?.error?.message ?? `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              fullText += evt.delta.text;
              setStreamingText(fullText);
            }
          } catch { /* malformed SSE line */ }
        }
      }

      const encReply = await encryptText(fullText);
      addMessage(convId, { role: 'assistant', content: encReply });
      setStreamingText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const encErr = await encryptText(`⚠️ Erreur : ${msg}`);
      addMessage(convId, { role: 'assistant', content: encErr });
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  };

  const startEditDoc = (doc: KnowledgeDoc) => {
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content);
  };

  const saveEditDoc = () => {
    if (!editingDocId) return;
    updateDocument(editingDocId, { title: editTitle.trim(), content: editContent.trim() });
    setEditingDocId(null);
  };

  const saveNewDoc = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    addDocument({ title: newTitle.trim(), content: newContent.trim() });
    setNewTitle('');
    setNewContent('');
    setShowNewDoc(false);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 -mx-4 -mt-4 overflow-hidden">

      {/* Left sidebar — conversations */}
      <div className={`bg-gray-900 flex flex-col border-r border-white/10 transition-all ${convSidebarOpen ? 'w-60' : 'w-12'} shrink-0`}>
        <div className={`flex items-center gap-2 px-3 py-3 border-b border-white/10 ${convSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {convSidebarOpen && <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Conversations</span>}
          <button onClick={() => setConvSidebarOpen(o => !o)} className="p-1 rounded text-gray-400 hover:text-white transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center">
            {convSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
          </button>
        </div>

        {convSidebarOpen && (
          <>
            <button
              onClick={() => { const id = createConversation(); setActiveConvId(id); setTab('chat'); }}
              className="flex items-center gap-2 mx-2 my-2 px-3 py-2 bg-[#00c875]/20 hover:bg-[#00c875]/30 text-[#00c875] rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle
            </button>
            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setActiveConvId(c.id); setTab('chat'); }}
                  className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-colors group flex items-start gap-1 ${activeConvId === c.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                >
                  <span className="truncate flex-1">{c.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); if (activeConvId === c.id) setActiveConvId(null); }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-gray-600 px-2 py-4 text-center">Aucune conversation</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#00c875]" />
            <span className="font-semibold text-gray-800 text-sm">Assistant IA — Projet's ma Ville</span>
            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Chiffré
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setTab('chat')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'chat' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </button>
                <button onClick={() => setTab('knowledge')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'knowledge' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  <BookOpen className="w-3.5 h-3.5" /> Base de connaissances
                  {documents.length > 0 && <span className="bg-[#00c875] text-white rounded-full px-1.5 text-xs">{documents.length}</span>}
                </button>
              </div>
            )}
            <button
              onClick={() => { setApiKeyInput(apiKey); setShowKeyModal(true); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${apiKey ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}
            >
              <Key className="w-3.5 h-3.5" />
              {apiKey ? 'Clé configurée' : 'Configurer la clé'}
            </button>
          </div>
        </div>

        {/* Chat tab */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!activeConv || activeConv.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-[#00c875]/10 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-[#00c875]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 text-lg">Assistant du projet</p>
                    <p className="text-gray-500 text-sm mt-1 max-w-sm">
                      Je réponds uniquement à partir de la base de connaissances du projet.
                      {documents.length === 0 && isAdmin && (
                        <span className="text-orange-600"> Ajoutez des documents dans "Base de connaissances" pour commencer.</span>
                      )}
                    </p>
                  </div>
                  {documents.length > 0 && (
                    <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
                      {documents.length} document{documents.length > 1 ? 's' : ''} dans la base
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {activeConv.messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-[#00c875] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400">
                            <Bot className="w-3 h-3" />
                            <span>Assistant</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{decrypted[msg.id] ?? '…'}</p>
                        <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                          {format(parseISO(msg.createdAt), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {streamingText && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-white border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>En train de répondre…</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{streamingText}</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Posez votre question… (Entrée pour envoyer, Maj+Entrée pour sauter une ligne)"
                  rows={1}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00c875] focus:border-transparent max-h-32"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="h-11 w-11 flex items-center justify-center bg-[#00c875] hover:bg-[#00b368] disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {documents.length === 0 && (
                <p className="text-xs text-orange-500 mt-1.5">
                  ⚠️ Base de connaissances vide — l'IA ne peut pas répondre factuellement. {isAdmin ? 'Ajoutez des documents dans l\'onglet "Base de connaissances".' : 'Demandez à un administrateur d\'ajouter des documents.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Knowledge base tab */}
        {tab === 'knowledge' && isAdmin && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Base de connaissances</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  L'IA répond <strong>uniquement</strong> à partir de ces documents. Soyez précis et complet.
                </p>
              </div>
              <button
                onClick={() => setShowNewDoc(true)}
                className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter un document
              </button>
            </div>

            {/* New doc form */}
            {showNewDoc && (
              <div className="bg-[#00c875]/5 border-2 border-dashed border-[#00c875]/40 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-[#00c875]">Nouveau document</p>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Titre du document (ex: Compte-rendu réunion 15/01)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875]"
                />
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Contenu du document — copiez-collez le texte complet que l'IA devra utiliser comme source..."
                  rows={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] resize-y"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowNewDoc(false); setNewTitle(''); setNewContent(''); }} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Annuler</button>
                  <button onClick={saveNewDoc} disabled={!newTitle.trim() || !newContent.trim()} className="px-4 py-2 text-sm bg-[#00c875] text-white rounded-lg hover:bg-[#00b368] disabled:opacity-50 font-medium">Enregistrer</button>
                </div>
              </div>
            )}

            {documents.length === 0 && !showNewDoc && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun document</p>
                <p className="text-gray-400 text-sm mt-1">Ajoutez vos comptes-rendus, délibérations, notes de projet… L'IA n'utilisera que ces sources.</p>
              </div>
            )}

            {documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {editingDocId === doc.id ? (
                  <div className="p-4 space-y-3">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00c875]"
                    />
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={10}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] resize-y"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingDocId(null)} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"><X className="w-3.5 h-3.5" />Annuler</button>
                      <button onClick={saveEditDoc} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#00c875] text-white rounded-lg hover:bg-[#00b368] font-medium"><Check className="w-3.5 h-3.5" />Sauvegarder</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#00c875] shrink-0" />
                        <p className="font-semibold text-gray-800 truncate">{doc.title}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEditDoc(doc)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm(`Supprimer "${doc.title}" ?`)) deleteDocument(doc.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Mis à jour {format(parseISO(doc.updatedAt), 'd MMM yyyy à HH:mm', { locale: fr })} · {doc.content.length.toLocaleString('fr-FR')} caractères
                    </p>
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-1">
                        <ChevronDown className="w-3 h-3" />Aperçu du contenu
                      </summary>
                      <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">{doc.content}</p>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Key modal */}
      {showKeyModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowKeyModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#00c875]/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-[#00c875]" />
                  </div>
                  <h2 className="font-semibold text-gray-900">Clé API Anthropic</h2>
                </div>
                <button onClick={() => setShowKeyModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                Votre clé API est <strong>stockée localement sur cet appareil</strong> (jamais envoyée à nos serveurs). Elle est utilisée pour appeler l'IA Claude (Anthropic) directement depuis votre navigateur.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Clé API (commence par "sk-ant-")</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00c875]"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Obtenez votre clé sur <span className="font-mono">console.anthropic.com</span> → API Keys
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Annuler</button>
                <button
                  onClick={() => { setApiKey(apiKeyInput.trim()); setShowKeyModal(false); }}
                  disabled={!apiKeyInput.trim()}
                  className="px-4 py-2 text-sm bg-[#00c875] text-white rounded-lg hover:bg-[#00b368] disabled:opacity-50 font-medium"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
