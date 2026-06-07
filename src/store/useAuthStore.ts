import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { v4 as uuid } from 'uuid';

const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Super Administrateur', email: 'admin@ville-enfant.fr', role: 'superadmin', workstreamIds: [], createdAt: new Date().toISOString() },
  { id: 'u2', name: 'Marie Dupont', email: 'marie@ville-enfant.fr', role: 'admin', workstreamIds: ['ws1', 'ws2'], createdAt: new Date().toISOString() },
  { id: 'u3', name: 'Jean Martin', email: 'jean@ville-enfant.fr', role: 'membre', workstreamIds: ['ws3'], createdAt: new Date().toISOString() },
];

const PASSWORDS: Record<string, string> = {
  'admin@ville-enfant.fr': 'admin123',
  'marie@ville-enfant.fr': 'marie123',
  'jean@ville-enfant.fr': 'jean123',
};

interface AuthState {
  currentUser: User | null;
  users: User[];
  passwords: Record<string, string>;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'createdAt'> & { password: string }) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  updatePassword: (userId: string, newPassword: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: DEFAULT_USERS,
      passwords: PASSWORDS,
      login: (email, password) => {
        const users = get().users;
        const passwords = get().passwords;
        const user = users.find(u => u.email === email);
        if (!user) return { success: false, error: 'Utilisateur non trouvé' };
        if (passwords[email] !== password) return { success: false, error: 'Mot de passe incorrect' };
        set({ currentUser: user });
        return { success: true };
      },
      logout: () => set({ currentUser: null }),
      createUser: (data) => {
        const { password, ...userData } = data;
        const newUser: User = { ...userData, id: uuid(), createdAt: new Date().toISOString() };
        set(state => ({
          users: [...state.users, newUser],
          passwords: { ...state.passwords, [newUser.email]: password },
        }));
      },
      updateUser: (id, data) => {
        set(state => ({
          users: state.users.map(u => u.id === id ? { ...u, ...data } : u),
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...data } : state.currentUser,
        }));
      },
      deleteUser: (id) => {
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
      },
      updatePassword: (userId, newPassword) => {
        const user = get().users.find(u => u.id === userId);
        if (!user) return;
        set(state => ({ passwords: { ...state.passwords, [user.email]: newPassword } }));
      },
    }),
    { name: 'auth-store' }
  )
);
