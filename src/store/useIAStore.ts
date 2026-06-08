import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IAProvider = 'ollama' | 'groq';

export interface IAConfig {
  provider: IAProvider;
  ollamaUrl: string;
  ollamaModel: string;
  groqKey: string;
  groqModel: string;
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
  conversations: IAConversation[];
  setConfig: (c: Partial<IAConfig>) => void;
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
        groqKey: '',
        groqModel: 'llama-3.1-8b-instant',
      },
      conversations: [],

      setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),

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
    {
      name: 'ia-store-v1',
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<IAStore>;
        return {
          ...current,
          ...p,
          config: {
            ...current.config,
            ...(p.config ?? {}),
          },
        };
      },
    }
  )
);
