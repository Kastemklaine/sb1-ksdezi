import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { verifySync, generateSecret } from 'otplib';
import type { User } from '../types';
import { v4 as uuid } from 'uuid';
import {
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendTwoFaResetEmail,
} from '../lib/emailService';

const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Super Administrateur', email: 'admin@ville-enfant.fr', role: 'superadmin', workstreamIds: [], createdAt: new Date().toISOString(), twoFactorEnabled: false },
  { id: 'u2', name: 'Marie Dupont', email: 'marie@ville-enfant.fr', role: 'admin', workstreamIds: ['ws1', 'ws2'], createdAt: new Date().toISOString(), twoFactorEnabled: false },
  { id: 'u3', name: 'Jean Martin', email: 'jean@ville-enfant.fr', role: 'membre', workstreamIds: ['ws3'], createdAt: new Date().toISOString(), twoFactorEnabled: false },
];

const PASSWORDS: Record<string, string> = {
  'admin@ville-enfant.fr': 'admin123',
  'marie@ville-enfant.fr': 'marie123',
  'jean@ville-enfant.fr': 'jean123',
};

export type LoginResult =
  | { status: 'ok' }
  | { status: 'needs_2fa' }
  | { status: 'error'; message: string };

interface AuthState {
  currentUser: User | null;
  users: User[];
  passwords: Record<string, string>;
  // Auth
  login: (email: string, password: string) => LoginResult;
  verifyTwoFactor: (email: string, token: string) => boolean;
  logout: () => void;
  // User CRUD
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'twoFactorEnabled' | 'twoFactorSecret'> & { password: string; projectName?: string }) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  updatePassword: (userId: string, newPassword: string) => void;
  // 2FA
  generateTwoFactorSecret: (userId: string) => string;
  enableTwoFactor: (userId: string, secret: string, token: string) => boolean;
  disableTwoFactor: (userId: string) => void;
  resetTwoFactor: (userId: string) => void; // superadmin action
}

// Pending 2FA email (user has passed password check but not 2FA yet)
let pendingTwoFactorEmail: string | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: DEFAULT_USERS,
      passwords: PASSWORDS,

      login: (email, password) => {
        const { users, passwords } = get();
        const user = users.find(u => u.email === email);
        if (!user) return { status: 'error', message: 'Utilisateur non trouvé' };
        if (passwords[email] !== password) return { status: 'error', message: 'Mot de passe incorrect' };
        if (user.twoFactorEnabled) {
          pendingTwoFactorEmail = email;
          return { status: 'needs_2fa' };
        }
        set({ currentUser: user });
        return { status: 'ok' };
      },

      verifyTwoFactor: (email, token) => {
        const { users } = get();
        const user = users.find(u => u.email === email);
        if (!user?.twoFactorSecret) return false;
        const valid = !!verifySync({ token, secret: user.twoFactorSecret });
        if (valid) {
          pendingTwoFactorEmail = null;
          set({ currentUser: user });
        }
        return valid;
      },

      logout: () => {
        pendingTwoFactorEmail = null;
        set({ currentUser: null });
      },

      createUser: ({ password, projectName, ...userData }) => {
        const newUser: User = {
          ...userData,
          id: uuid(),
          createdAt: new Date().toISOString(),
          twoFactorEnabled: false,
        };
        set(state => ({
          users: [...state.users, newUser],
          passwords: { ...state.passwords, [newUser.email]: password },
        }));
        sendWelcomeEmail({
          toEmail: newUser.email,
          toName: newUser.name,
          password,
          role: newUser.role,
          projectName: projectName ?? 'le projet',
        });
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
        sendPasswordChangedEmail({ toEmail: user.email, toName: user.name });
      },

      generateTwoFactorSecret: (userId) => {
        const user = get().users.find(u => u.id === userId);
        if (!user) return '';
        const secret = generateSecret();
        // Save temporary secret (not enabled yet)
        set(state => ({
          users: state.users.map(u => u.id === userId ? { ...u, twoFactorSecret: secret } : u),
        }));
        return secret;
      },

      enableTwoFactor: (userId, secret, token) => {
        const valid = !!verifySync({ token, secret });
        if (!valid) return false;
        set(state => ({
          users: state.users.map(u =>
            u.id === userId ? { ...u, twoFactorEnabled: true, twoFactorSecret: secret } : u
          ),
          currentUser: state.currentUser?.id === userId
            ? { ...state.currentUser, twoFactorEnabled: true, twoFactorSecret: secret }
            : state.currentUser,
        }));
        return true;
      },

      disableTwoFactor: (userId) => {
        set(state => ({
          users: state.users.map(u =>
            u.id === userId ? { ...u, twoFactorEnabled: false, twoFactorSecret: undefined } : u
          ),
          currentUser: state.currentUser?.id === userId
            ? { ...state.currentUser, twoFactorEnabled: false, twoFactorSecret: undefined }
            : state.currentUser,
        }));
      },

      resetTwoFactor: (userId) => {
        const user = get().users.find(u => u.id === userId);
        if (!user) return;
        set(state => ({
          users: state.users.map(u =>
            u.id === userId ? { ...u, twoFactorEnabled: false, twoFactorSecret: undefined } : u
          ),
        }));
        sendTwoFaResetEmail({ toEmail: user.email, toName: user.name });
      },
    }),
    { name: 'auth-store' }
  )
);

export const getPendingTwoFactorEmail = () => pendingTwoFactorEmail;
