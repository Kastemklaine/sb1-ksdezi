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
import { makePasswordRecord, verifyPassword, isHashedPassword } from '../lib/crypto';

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
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyTwoFactor: (email: string, token: string) => boolean;
  logout: () => void;
  // User CRUD
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'twoFactorEnabled' | 'twoFactorSecret'> & { password: string; projectName?: string }) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  updatePassword: (userId: string, newPassword: string) => Promise<void>;
  // Self-service profile
  updateMyProfile: (data: { name?: string; firstName?: string; lastName?: string; email?: string; fonction?: string; avatarUrl?: string }) => void;
  changeMyPassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
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

      login: async (email, password) => {
        const { users, passwords } = get();
        const user = users.find(u => u.email === email);
        if (!user) return { status: 'error', message: 'Utilisateur non trouvé' };
        const stored = passwords[email];
        const ok = await verifyPassword(password, stored);
        if (!ok) return { status: 'error', message: 'Mot de passe incorrect' };
        // Transparently migrate a legacy plaintext password to a salted hash.
        if (!isHashedPassword(stored)) {
          const record = await makePasswordRecord(password);
          set(state => ({ passwords: { ...state.passwords, [email]: record } }));
        }
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

      createUser: async ({ password, projectName, ...userData }) => {
        const newUser: User = {
          ...userData,
          id: uuid(),
          createdAt: new Date().toISOString(),
          twoFactorEnabled: false,
        };
        const record = await makePasswordRecord(password);
        set(state => ({
          users: [...state.users, newUser],
          passwords: { ...state.passwords, [newUser.email]: record },
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

      updateMyProfile: (data) => {
        const user = get().currentUser;
        if (!user) return;
        set(state => ({
          users: state.users.map(u => u.id === user.id ? { ...u, ...data } : u),
          currentUser: { ...user, ...data },
          passwords: data.email && data.email !== user.email
            ? { ...Object.fromEntries(Object.entries(state.passwords).filter(([k]) => k !== user.email)), [data.email]: state.passwords[user.email] }
            : state.passwords,
        }));
      },

      changeMyPassword: async (currentPassword, newPassword) => {
        const user = get().currentUser;
        if (!user) return false;
        const ok = await verifyPassword(currentPassword, get().passwords[user.email]);
        if (!ok) return false;
        if (newPassword.length < 8) return false;
        const record = await makePasswordRecord(newPassword);
        set(state => ({ passwords: { ...state.passwords, [user.email]: record } }));
        sendPasswordChangedEmail({ toEmail: user.email, toName: user.name });
        return true;
      },

      updatePassword: async (userId, newPassword) => {
        const user = get().users.find(u => u.id === userId);
        if (!user) return;
        const record = await makePasswordRecord(newPassword);
        set(state => ({ passwords: { ...state.passwords, [user.email]: record } }));
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
