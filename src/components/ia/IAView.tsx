import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Plus, Trash2, BookOpen, MessageSquare,
  Pencil, Check, X, Lock, FileText, ChevronDown, Loader2, Settings2, Upload, Image as ImageIcon, Database, Search, Globe
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useIAStore, type IAProvider } from '../../store/useIAStore';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { IADocument } from '../../types';
import { encryptText, decryptText } from '../../lib/crypto';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

type Tab = 'chat' | 'knowledge';

const SYSTEM_PROMPT = (docs: IADocument[]) =>
  `Tu es l'assistant IA officiel du projet "Projet's ma Ville", un projet municipal de participation citoyenne.

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
    : docs.map(d => `--- [${d.title}] ---\n${d.content}`).join('\n\n')}`;

async function callOllama(
  url: string, model: string,
  messages: { role: string; content: string }[],
  onChunk: (t: string) => void
): Promise<string> {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama ${res.status}: ${txt}`);
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value, { stream: true }).split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const token = obj?.message?.content ?? '';
        if (token) { full += token; onChunk(full); }
      } catch { /* partial line */ }
    }
  }
  return full;
}

async function callAnthropic(
  apiKey: string,
  messages: { role: string; content: string }[],
  system: string,
  onChunk: (t: string) => void
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2048, stream: true, system, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let full = '', buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      try {
        const evt = JSON.parse(data);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          full += evt.delta.text; onChunk(full);
        }
      } catch { /* skip */ }
    }
  }
  return full;
}

// Simple but robust CSV parser (handles quoted fields)
function parseCSV(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const parse = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        result.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };
  const nonEmpty = lines.filter(l => l.trim());
  if (!nonEmpty.length) return { headers: [], rows: [] };
  // Detect separator: semicolon or comma
  const firstLine = nonEmpty[0];
  const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
  const parseSep = sep === ';'
    ? (line: string) => line.split(';').map(s => s.trim().replace(/^"|"$/g, ''))
    : parse;
  const headers = parseSep(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map(parseSep);
  return { headers, rows };
}

function csvToText(raw: string, filename: string): string {
  const { headers, rows } = parseCSV(raw);
  if (!headers.length) return raw;
  const maxRows = 500; // avoid huge documents
  const displayed = rows.slice(0, maxRows);
  const lines = displayed.map(row =>
    headers.map((h, i) => `${h}: ${row[i] ?? ''}`).join(' | ')
  );
  const footer = rows.length > maxRows ? `\n[... ${rows.length - maxRows} lignes supplémentaires non affichées]` : '';
  return `Fichier : ${filename}\nColonnes (${headers.length}) : ${headers.join(', ')}\nNombre de lignes : ${rows.length}\n\n${lines.join('\n')}${footer}`;
}

interface DataGouvDataset {
  id: string;
  title: string;
  description: string;
  organization?: { name: string };
  resources: { id: string; title: string; url: string; format: string; filesize?: number }[];
  tags: string[];
  page: string;
}

async function searchDataGouv(query: string): Promise<DataGouvDataset[]> {
  const res = await fetch(
    `https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(query)}&page_size=8&sort=-created`,
    { headers: { 'X-Fields': 'data{id,title,description,organization,resources,tags,page}' } }
  );
  if (!res.ok) throw new Error(`data.gouv.fr: ${res.status}`);
  const json = await res.json();
  return (json.data ?? []) as DataGouvDataset[];
}

export default function IAView() {
  const { config, setConfig, conversations, createConversation, addMessage, deleteConversation, renameConversation } = useIAStore();
  const documents = useProjectStore(s => curProject(s)?.iaDocuments ?? []);
  const projectAnthropicKey = useProjectStore(s => curProject(s)?.anthropicKey ?? '');
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  // Effective key: project-synced key takes priority over local config
  const effectiveAnthropicKey = projectAnthropicKey || config.anthropicKey;
  const addDocument = useProjectStore(s => s.addIADocument);
  const updateDocument = useProjectStore(s => s.updateIADocument);
  const deleteDocument = useProjectStore(s => s.deleteIADocument);
  const currentUser = useAuthStore(s => s.currentUser);
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const [tab, setTab] = useState<Tab>('chat');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [streamingText, setStreamingText] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [convSidebarOpen, setConvSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Config form state
  const [cfgProvider, setCfgProvider] = useState<IAProvider>(config.provider);
  const [cfgOllamaUrl, setCfgOllamaUrl] = useState(config.ollamaUrl);
  const [cfgOllamaModel, setCfgOllamaModel] = useState(config.ollamaModel);
  const [cfgAnthropicKey, setCfgAnthropicKey] = useState(config.anthropicKey);

  // Knowledge base editing
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImageData, setNewImageData] = useState<string | undefined>(undefined);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // data.gouv.fr search
  const [showDataGouv, setShowDataGouv] = useState(false);
  const [dataGouvQuery, setDataGouvQuery] = useState('');
  const [dataGouvResults, setDataGouvResults] = useState<DataGouvDataset[]>([]);
  const [dataGouvLoading, setDataGouvLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

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

  const isOllamaOnWeb = config.provider === 'ollama' && typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
  const isConfigured = !!effectiveAnthropicKey || (config.provider === 'ollama' && !isOllamaOnWeb);

  const ensureConv = () => {
    if (activeConvId && conversations.find(c => c.id === activeConvId)) return activeConvId;
    const id = createConversation();
    setActiveConvId(id);
    return id;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!isConfigured) { openConfig(); return; }

    const convId = ensureConv();
    setInput('');
    setLoading(true);
    setStreamingText('');

    const encUserMsg = await encryptText(text);
    addMessage(convId, { role: 'user', content: encUserMsg });

    const conv = conversations.find(c => c.id === convId);
    if (!conv || conv.messages.length === 0) renameConversation(convId, text.slice(0, 50));

    try {
      const history: { role: string; content: string }[] = [];
      for (const msg of (conv?.messages ?? [])) {
        try { history.push({ role: msg.role, content: await decryptText(msg.content) }); } catch { /* skip */ }
      }
      history.push({ role: 'user', content: text });

      const system = SYSTEM_PROMPT(documents);
      let fullText = '';

      if (config.provider === 'ollama' && !isOllamaOnWeb && !effectiveAnthropicKey) {
        const ollamaMessages = [{ role: 'system', content: system }, ...history];
        fullText = await callOllama(config.ollamaUrl, config.ollamaModel, ollamaMessages, setStreamingText);
      } else {
        fullText = await callAnthropic(effectiveAnthropicKey, history, system, setStreamingText);
      }

      addMessage(convId, { role: 'assistant', content: await encryptText(fullText) });
      setStreamingText('');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Failed to fetch' || msg.includes('Failed to fetch')) {
        if (config.provider === 'ollama') {
          msg = `Impossible de contacter Ollama à l'adresse "${config.ollamaUrl}". Vérifiez qu'Ollama est en cours d'exécution sur votre machine locale, ou configurez le fournisseur Anthropic (clé API) dans les paramètres de l'IA.`;
        } else {
          msg = `Impossible de contacter l'API Anthropic. Vérifiez votre connexion internet et votre clé API dans les paramètres de l'IA.`;
        }
      }
      addMessage(convId, { role: 'assistant', content: await encryptText(`⚠️ Erreur : ${msg}`) });
      setStreamingText('');
      openConfig();
    } finally {
      setLoading(false);
    }
  };

  const openConfig = () => {
    setCfgProvider(config.provider);
    setCfgOllamaUrl(config.ollamaUrl);
    setCfgOllamaModel(config.ollamaModel);
    setCfgAnthropicKey(config.anthropicKey);
    setShowConfig(true);
  };

  const saveConfig = () => {
    const trimmedKey = cfgAnthropicKey.trim();
    setConfig({ provider: cfgProvider, ollamaUrl: cfgOllamaUrl.trim(), ollamaModel: cfgOllamaModel.trim(), anthropicKey: trimmedKey });
    if (isAdmin && trimmedKey) {
      useProjectStore.getState().setAnthropicKey(trimmedKey);
    }
    setShowConfig(false);
  };

  const handleDataGouvSearch = async () => {
    if (!dataGouvQuery.trim()) return;
    setDataGouvLoading(true);
    setDataGouvResults([]);
    try {
      const results = await searchDataGouv(dataGouvQuery.trim());
      setDataGouvResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setDataGouvLoading(false);
    }
  };

  const handleImportDataset = async (dataset: DataGouvDataset) => {
    setImportingId(dataset.id);
    try {
      // Try to fetch first CSV resource
      const csvResource = dataset.resources.find(r =>
        r.format?.toLowerCase() === 'csv' || r.url?.endsWith('.csv')
      );

      let content = `Source : data.gouv.fr\nURL : ${dataset.page}\nOrganisation : ${dataset.organization?.name ?? 'Non précisée'}\nMots-clés : ${dataset.tags.join(', ')}\n\nDescription :\n${dataset.description ?? ''}`;

      if (csvResource) {
        try {
          const csvRes = await fetch(csvResource.url);
          if (csvRes.ok) {
            const rawCsv = await csvRes.text();
            content += `\n\nDonnées CSV (${csvResource.title}) :\n${csvToText(rawCsv, csvResource.title ?? dataset.title)}`;
          }
        } catch {
          content += `\n\nRessources disponibles :\n${dataset.resources.map(r => `- ${r.title} (${r.format?.toUpperCase() ?? '?'})`).join('\n')}`;
        }
      } else {
        content += `\n\nRessources disponibles :\n${dataset.resources.map(r => `- ${r.title} (${r.format?.toUpperCase() ?? '?'})`).join('\n')}`;
      }

      addDocument({ title: dataset.title, content });
    } finally {
      setImportingId(null);
    }
  };

  const startEditDoc = (doc: IADocument) => { setEditingDocId(doc.id); setEditTitle(doc.title); setEditContent(doc.content); };
  const saveEditDoc = () => { if (!editingDocId) return; updateDocument(editingDocId, { title: editTitle.trim(), content: editContent.trim() }); setEditingDocId(null); };
  const saveNewDoc = () => {
    if (!newTitle.trim()) return;
    addDocument({ title: newTitle.trim(), content: newContent.trim(), imageData: newImageData });
    setNewTitle(''); setNewContent(''); setNewImageData(undefined); setShowNewDoc(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n';
        }
        setNewTitle(file.name.replace(/\.pdf$/i, ''));
        setNewContent(text.trim());
        setNewImageData(undefined);
        setShowNewDoc(true);
      } else if (isCsv) {
        const raw = await file.text();
        const text = csvToText(raw, file.name);
        setNewTitle(file.name.replace(/\.csv$/i, ''));
        setNewContent(text);
        setNewImageData(undefined);
        setShowNewDoc(true);
      } else if (file.type.startsWith('image/')) {
        const ext = file.name.split('.').pop() ?? 'png';
        const path = `ia-images/${currentProjectId}/${Date.now()}.${ext}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, file, { contentType: file.type });
        const url = await getDownloadURL(fileRef);
        setNewTitle(file.name.replace(/\.[^.]+$/, ''));
        setNewContent('');
        setNewImageData(url);
        setShowNewDoc(true);
      }
    } catch (err) {
      console.error('Upload error', err);
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sidebarContent = (
    <>
      <button
        onClick={() => { const id = createConversation(); setActiveConvId(id); setTab('chat'); setConvSidebarOpen(false); }}
        className="flex items-center gap-2 mx-2 my-2 px-3 py-2 bg-[#00c875]/20 hover:bg-[#00c875]/30 text-[#00c875] rounded-lg text-sm font-medium transition-colors min-h-[44px]"
      >
        <Plus className="w-4 h-4" /> Nouvelle conversation
      </button>
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
        {conversations.map(c => (
          <button key={c.id} onClick={() => { setActiveConvId(c.id); setTab('chat'); setConvSidebarOpen(false); }}
            className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-colors group flex items-start gap-1 min-h-[44px] ${activeConvId === c.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
            <span className="truncate flex-1 py-1">{c.title}</span>
            <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); if (activeConvId === c.id) setActiveConvId(null); }}
              className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-600 hover:text-red-400 p-1">
              <X className="w-3 h-3" />
            </button>
          </button>
        ))}
        {conversations.length === 0 && <p className="text-xs text-gray-600 px-2 py-4 text-center">Aucune conversation</p>}
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 -mx-4 -mt-4 overflow-hidden">

      {/* Mobile sidebar backdrop */}
      {convSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setConvSidebarOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 flex flex-col border-r border-white/10 transition-transform duration-200 md:hidden ${convSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Conversations</span>
          <button onClick={() => setConvSidebarOpen(false)} className="p-2 rounded text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden md:flex flex-col bg-gray-900 border-r border-white/10 transition-all ${convSidebarOpen ? 'w-60' : 'w-12'} shrink-0`}>
        <div className={`flex items-center gap-2 px-3 py-3 border-b border-white/10 ${convSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {convSidebarOpen && <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Conversations</span>}
          <button onClick={() => setConvSidebarOpen(o => !o)} className="p-1 rounded text-gray-400 hover:text-white transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
        {convSidebarOpen && sidebarContent}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setConvSidebarOpen(o => !o)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </button>
            <Bot className="w-5 h-5 text-[#00c875]" />
            <span className="font-semibold text-gray-800 text-sm hidden sm:inline">Assistant IA</span>
            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:flex">
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
            <button onClick={openConfig}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isConfigured ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
              <Settings2 className="w-3.5 h-3.5" />
              {isConfigured ? (config.provider === 'ollama' ? `Ollama · ${config.ollamaModel}` : 'Anthropic') : 'Configurer'}
            </button>
          </div>
        </div>

        {/* Chat */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!activeConv || activeConv.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-[#00c875]/10 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-[#00c875]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 text-lg">Assistant du projet</p>
                    <p className="text-gray-500 text-sm mt-1 max-w-sm">Je réponds uniquement à partir de la base de connaissances du projet.</p>
                  </div>
                  <div className="flex flex-col gap-2 items-center text-xs text-gray-400">
                    {config.provider === 'ollama'
                      ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Ollama local — gratuit &amp; privé</span>
                      : <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">Anthropic Claude</span>}
                    {documents.length > 0 && <span className="bg-gray-100 px-3 py-1 rounded-full">{documents.length} document{documents.length > 1 ? 's' : ''} dans la base</span>}
                  </div>
                </div>
              ) : (
                <>
                  {activeConv.messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm ${msg.role === 'user' ? 'bg-[#00c875] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400"><Bot className="w-3 h-3" /><span>Assistant</span></div>
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
                      <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl rounded-bl-sm px-3 py-2.5 sm:px-4 sm:py-3 text-sm bg-white border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /><span>En train de répondre…</span></div>
                        <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{streamingText}</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            <div className="border-t border-gray-200 bg-white px-3 py-3 shrink-0">
              {(!isConfigured || isOllamaOnWeb) && (
                <div className="mb-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 flex items-center justify-between gap-2">
                  <span>{isOllamaOnWeb ? '⚠️ Ollama ne fonctionne pas en ligne — configurez Anthropic' : '⚠️ IA non configurée'}</span>
                  <button onClick={openConfig} className="underline font-medium whitespace-nowrap">Configurer</button>
                </div>
              )}
              {documents.length === 0 && (
                <div className="mb-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                  ⚠️ Base vide — {isAdmin ? <span>ajoutez des documents.</span> : "contactez un administrateur."}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre question…"
                  rows={1} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00c875] max-h-32" style={{ minHeight: '44px' }} />
                <button onClick={handleSend} disabled={!input.trim() || loading}
                  className="h-11 w-11 flex items-center justify-center bg-[#00c875] hover:bg-[#00b368] disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 min-w-[44px]">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge base */}
        {tab === 'knowledge' && isAdmin && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Base de connaissances</h2>
                <p className="text-xs text-gray-500 mt-0.5">L'IA répond <strong>uniquement</strong> à partir de ces documents.</p>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".pdf,.csv,text/csv,image/*" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}
                  className="flex items-center gap-2 border border-[#00c875] text-[#00c875] hover:bg-[#00c875]/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                  {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadLoading ? 'Chargement...' : 'PDF / CSV / Image'}
                </button>
                <button
                  onClick={() => { setShowDataGouv(v => !v); setDataGouvResults([]); setDataGouvQuery(''); }}
                  className="flex items-center gap-2 border border-blue-400 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Globe className="w-4 h-4" /> data.gouv.fr
                </button>
                <button onClick={() => { setNewImageData(undefined); setShowNewDoc(true); }} className="flex items-center gap-2 bg-[#00c875] hover:bg-[#00b368] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Texte libre
                </button>
              </div>
            </div>
            {/* data.gouv.fr search panel */}
            {showDataGouv && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">Rechercher sur data.gouv.fr</p>
                  <button onClick={() => setShowDataGouv(false)} className="ml-auto p-1 text-blue-400 hover:text-blue-700"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={dataGouvQuery}
                    onChange={e => setDataGouvQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDataGouvSearch()}
                    placeholder="Ex: équipements sportifs Bretagne, mobilité douce…"
                    className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <button
                    onClick={handleDataGouvSearch}
                    disabled={dataGouvLoading || !dataGouvQuery.trim()}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors min-h-[40px]"
                  >
                    {dataGouvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Chercher
                  </button>
                </div>
                {dataGouvResults.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {dataGouvResults.map(ds => (
                      <div key={ds.id} className="bg-white border border-blue-100 rounded-lg p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{ds.title}</p>
                          {ds.organization && <p className="text-xs text-blue-600">{ds.organization.name}</p>}
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ds.description?.slice(0, 120)}{(ds.description?.length ?? 0) > 120 ? '…' : ''}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ds.resources.filter(r => ['csv', 'json'].includes((r.format ?? '').toLowerCase())).slice(0, 3).map(r => (
                              <span key={r.id} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{(r.format ?? '?').toUpperCase()}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleImportDataset(ds)}
                          disabled={importingId === ds.id}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-[#00c875] hover:bg-[#00b368] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors min-h-[36px]"
                        >
                          {importingId === ds.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                          Importer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!dataGouvLoading && dataGouvResults.length === 0 && dataGouvQuery && (
                  <p className="text-xs text-blue-600 text-center py-2">Aucun résultat — essayez d'autres mots-clés</p>
                )}
              </div>
            )}

            {showNewDoc && (
              <div className="bg-[#00c875]/5 border-2 border-dashed border-[#00c875]/40 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-[#00c875]">
                  {newImageData ? 'Image importée' : 'Nouveau document'}
                </p>
                {newImageData && (
                  <div className="relative inline-block">
                    <img src={newImageData} alt="aperçu" className="max-h-48 rounded-lg border border-gray-200 object-contain bg-gray-50" />
                    <button onClick={() => setNewImageData(undefined)} className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 text-gray-500 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre du document" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875]" />
                <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                  placeholder={newImageData ? "Description de l'image (recommandé pour que l'IA puisse l'utiliser)..." : "Contenu — copiez-collez le texte complet..."}
                  rows={newImageData ? 4 : 8} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] resize-y" />
                {newImageData && (
                  <p className="text-xs text-amber-600 flex items-start gap-1">
                    <span className="shrink-0">💡</span>
                    Ajoutez une description pour que l'IA puisse répondre aux questions sur cette image.
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowNewDoc(false); setNewTitle(''); setNewContent(''); setNewImageData(undefined); }} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Annuler</button>
                  <button onClick={saveNewDoc} disabled={!newTitle.trim()} className="px-4 py-2 text-sm bg-[#00c875] text-white rounded-lg hover:bg-[#00b368] disabled:opacity-50 font-medium">Enregistrer</button>
                </div>
              </div>
            )}
            {documents.length === 0 && !showNewDoc && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun document</p>
                <p className="text-gray-400 text-sm mt-1">Importez des PDFs, captures d'écran ou rédigez du texte. L'IA n'utilisera que ces sources.</p>
              </div>
            )}
            {documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {editingDocId === doc.id ? (
                  <div className="p-4 space-y-3">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00c875]" />
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={10} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c875] resize-y" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingDocId(null)} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"><X className="w-3.5 h-3.5" />Annuler</button>
                      <button onClick={saveEditDoc} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#00c875] text-white rounded-lg hover:bg-[#00b368] font-medium"><Check className="w-3.5 h-3.5" />Sauvegarder</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {doc.imageData ? <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" /> : <FileText className="w-4 h-4 text-[#00c875] shrink-0" />}
                        <p className="font-semibold text-gray-800 truncate">{doc.title}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEditDoc(doc)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm(`Supprimer "${doc.title}" ?`)) deleteDocument(doc.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{format(parseISO(doc.updatedAt), 'd MMM yyyy à HH:mm', { locale: fr })} · {doc.content.length.toLocaleString('fr-FR')} caractères</p>
                    {doc.imageData && (
                      <img src={doc.imageData} alt={doc.title} className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain bg-gray-50" />
                    )}
                    {doc.content && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-1"><ChevronDown className="w-3 h-3" />Aperçu</summary>
                        <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">{doc.content}</p>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Config modal */}
      {showConfig && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowConfig(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-lg">Configuration de l'IA</h2>
                <button onClick={() => setShowConfig(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
              </div>

              {/* Provider toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Moteur IA</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setCfgProvider('ollama')}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left ${cfgProvider === 'ollama' ? 'border-[#00c875] bg-[#00c875]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="font-semibold text-sm text-gray-800">Ollama</span>
                    <span className="text-xs text-green-600 font-medium">100% gratuit · 100% local</span>
                    <span className="text-xs text-gray-500">Tourne sur votre ordinateur</span>
                  </button>
                  <button onClick={() => setCfgProvider('anthropic')}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left ${cfgProvider === 'anthropic' ? 'border-[#00c875] bg-[#00c875]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="font-semibold text-sm text-gray-800">Anthropic Claude</span>
                    <span className="text-xs text-blue-600 font-medium">Meilleure qualité</span>
                    <span className="text-xs text-gray-500">Nécessite une clé API payante</span>
                  </button>
                </div>
              </div>

              {cfgProvider === 'ollama' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                    <p className="font-bold">⚠️ Ollama fonctionne uniquement en local</p>
                    <p>Si l'application est hébergée en ligne (web), Ollama ne peut pas fonctionner — il tourne sur votre ordinateur, pas sur un serveur. Dans ce cas, utilisez <strong>Anthropic Claude</strong>.</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 space-y-1">
                    <p className="font-semibold">Installation Ollama (une seule fois) :</p>
                    <p>1. Téléchargez <strong>ollama.com</strong> et installez-le</p>
                    <p>2. Ouvrez un terminal et tapez : <code className="bg-green-100 px-1 rounded">ollama pull llama3.2</code></p>
                    <p>3. Ollama démarre automatiquement sur <code className="bg-green-100 px-1 rounded">localhost:11434</code></p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">URL Ollama</label>
                    <input value={cfgOllamaUrl} onChange={e => setCfgOllamaUrl(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00c875]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Modèle</label>
                    <input value={cfgOllamaModel} onChange={e => setCfgOllamaModel(e.target.value)} placeholder="llama3.2" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00c875]" />
                    <p className="text-xs text-gray-400 mt-1">Modèles recommandés (gratuits) : <code>llama3.2</code> · <code>mistral</code> · <code>phi3</code></p>
                  </div>
                </div>
              )}

              {cfgProvider === 'anthropic' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                    Clé API disponible sur <strong>console.anthropic.com</strong> → API Keys. Facturé à l'usage (~0,003€/message).
                  </div>
                  <div>
                    {projectAnthropicKey ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Clé API configurée par l'administrateur et synchronisée sur tous les appareils.
                        {isAdmin && (
                          <button onClick={() => { useProjectStore.getState().setAnthropicKey(''); }} className="ml-auto text-red-500 hover:text-red-700 underline">Retirer</button>
                        )}
                      </div>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                          Clé API (sk-ant-…)
                          {isAdmin && <span className="normal-case font-normal text-green-600 ml-1">— sera synchronisée sur tous les appareils</span>}
                        </label>
                        <input type="password" value={cfgAnthropicKey} onChange={e => setCfgAnthropicKey(e.target.value)} placeholder="sk-ant-api03-..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00c875]" />
                        {!isAdmin && <p className="text-xs text-amber-600 mt-1">Seul un administrateur peut configurer la clé partagée. Contactez votre super admin.</p>}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Annuler</button>
                <button onClick={saveConfig} className="px-4 py-2 text-sm bg-[#00c875] text-white rounded-lg hover:bg-[#00b368] font-medium">Enregistrer</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
