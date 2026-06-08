import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IAProvider = 'ollama' | 'anthropic';

export interface IAConfig {
  provider: IAProvider;
  ollamaUrl: string;   // default: http://localhost:11434
  ollamaModel: string; // default: llama3.2
  anthropicKey: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string; // encrypted
  createdAt: string;
}

export interface IAConversation {
  id: string;
  title: string;
  messages: IAMessage[];
  createdAt: string;
}

interface IAStore {
  config: IAConfig;
  documents: KnowledgeDoc[];
  conversations: IAConversation[];
  setConfig: (c: Partial<IAConfig>) => void;
  addDocument: (doc: Omit<KnowledgeDoc, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDocument: (id: string, patch: Partial<Pick<KnowledgeDoc, 'title' | 'content'>>) => void;
  deleteDocument: (id: string) => void;
  createConversation: () => string;
  addMessage: (convId: string, msg: Omit<IAMessage, 'id' | 'createdAt'>) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
}

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useIAStore = create<IAStore>()(
  persist(
    (set) => ({
      config: {
        provider: 'ollama' as IAProvider,
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'llama3.2',
        anthropicKey: '',
      },
      documents: [],
      conversations: [],

      setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),

      addDocument: (doc) => set(s => ({
        documents: [...s.documents, {
          ...doc,
          id: uuid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      })),

      updateDocument: (id, patch) => set(s => ({
        documents: s.documents.map(d => d.id === id
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d),
      })),

      deleteDocument: (id) => set(s => ({
        documents: s.documents.filter(d => d.id !== id),
      })),

      createConversation: () => {
        const id = uuid();
        set(s => ({
          conversations: [{
            id,
            title: 'Nouvelle conversation',
            messages: [],
            createdAt: new Date().toISOString(),
          }, ...s.conversations],
        }));
        return id;
      },

      addMessage: (convId, msg) => set(s => ({
        conversations: s.conversations.map(c => c.id === convId
          ? { ...c, messages: [...c.messages, { ...msg, id: uuid(), createdAt: new Date().toISOString() }] }
          : c),
      })),

      deleteConversation: (id) => set(s => ({
        conversations: s.conversations.filter(c => c.id !== id),
      })),

      renameConversation: (id, title) => set(s => ({
        conversations: s.conversations.map(c => c.id === id ? { ...c, title } : c),
      })),
    }),
    { name: 'ia-store-v1' }
  )
);
