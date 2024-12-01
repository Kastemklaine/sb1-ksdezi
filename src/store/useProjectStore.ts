import { create } from 'zustand';
import { Project } from '../types/project';
import { Track } from '../types/track';

interface ProjectStore {
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  updateBpm: (bpm: number) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  updateTrack: (trackId, updates) =>
    set((state) => ({
      currentProject: state.currentProject
        ? {
            ...state.currentProject,
            tracks: state.currentProject.tracks.map((track) =>
              track.id === trackId ? { ...track, ...updates } : track
            ),
          }
        : null,
    })),
  updateBpm: (bpm) =>
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, bpm }
        : null,
    })),
}));