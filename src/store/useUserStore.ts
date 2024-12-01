import { create } from 'zustand';
import { User } from '../types/user';

interface UserStore {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));