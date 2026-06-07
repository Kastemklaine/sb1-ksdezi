import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Task, Workstream, GovernanceInstance, TaskStatus, Project, WorkspaceDocument, WorkspaceDiscussion } from '../types';

const WORKSTREAMS: Workstream[] = [
  { id: 'ws1', name: 'Communication', color: 'bg-yellow-400', textColor: 'text-yellow-900', description: 'Stratégie et actions de communication du projet', notes: '', icon: 'Megaphone', instance: 'both', assigneeIds: [] },
  { id: 'ws2', name: 'COPIL', color: 'bg-lime-600', textColor: 'text-white', description: 'Comité de Pilotage — gouvernance stratégique', notes: '', icon: 'Users', instance: 'copil', assigneeIds: [] },
  { id: 'ws3', name: 'COTEC', color: 'bg-teal-500', textColor: 'text-white', description: 'Comité Technique — suivi opérationnel', notes: '', icon: 'Settings', instance: 'cotec', assigneeIds: [] },
  { id: 'ws4', name: 'Participation citoyenne', color: 'bg-red-500', textColor: 'text-white', description: 'Engagement et concertation citoyenne', notes: '', icon: 'Heart', instance: 'none', assigneeIds: [] },
  { id: 'ws5', name: 'Sensibilisation & médiation', color: 'bg-pink-500', textColor: 'text-white', description: 'Actions de sensibilisation et médiation', notes: '', icon: 'BookOpen', instance: 'none', assigneeIds: [] },
  { id: 'ws6', name: 'Signalétique', color: 'bg-purple-600', textColor: 'text-white', description: 'Aménagement signalétique adaptée', notes: '', icon: 'MapPin', instance: 'cotec', assigneeIds: [] },
  { id: 'ws7', name: 'Gestion différenciée, fleurissement & propreté', color: 'bg-indigo-600', textColor: 'text-white', description: 'Gestion différenciée des espaces verts, fleurissement et propreté', notes: '', icon: 'Flower2', instance: 'cotec', assigneeIds: [] },
  { id: 'ws8', name: 'Aménagements & mobiliers urbains', color: 'bg-cyan-500', textColor: 'text-white', description: 'Mobiliers urbains et aménagements accessibles', notes: '', icon: 'Building2', instance: 'cotec', assigneeIds: [] },
  { id: 'ws9', name: 'Mobilité, voirie & accessibilité', color: 'bg-orange-500', textColor: 'text-white', description: 'Accessibilité des cheminements, voirie et mobilité douce', notes: '', icon: 'Car', instance: 'cotec', assigneeIds: [] },
];

const DEFAULT_PROJECT: Project = {
  id: 'proj1',
  name: "Ville à hauteur d'enfant ; handicaps",
  subtitle: 'Vers la 4e fleur',
  workstreams: WORKSTREAMS,
  tasks: [],
  governance: [
    { id: 'gov1', name: 'COPIL', description: 'Comité de Pilotage — décisions stratégiques et validation des grandes orientations du projet', memberIds: ['u1', 'u2'], workstreamIds: ['ws1', 'ws2'] },
    { id: 'gov2', name: 'COTEC', description: 'Comité Technique — suivi de la mise en œuvre opérationnelle et coordination des actions', memberIds: ['u2', 'u3'], workstreamIds: ['ws3', 'ws6', 'ws7', 'ws8'] },
  ],
  finalPage: { content: '<p>La page résultat du projet sera publiée ici par les super administrateurs.</p>', updatedAt: new Date().toISOString(), updatedBy: '' },
  createdAt: new Date().toISOString(),
};

interface ProjectState {
  projects: Project[];
  currentProjectId: string;
  // Project CRUD
  createProject: (name: string, subtitle: string) => void;
  deleteProject: (id: string) => void;
  switchProject: (id: string) => void;
  // Current project mutations
  updateProjectInfo: (name: string, subtitle: string) => void;
  updateWorkstream: (id: string, data: Partial<Workstream>) => void;
  createWorkstream: (data: Omit<Workstream, 'id'>) => void;
  deleteWorkstream: (id: string) => void;
  updateWorkstreamNotes: (workstreamId: string, notes: string) => void;
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateFinalPage: (content: string, userId: string) => void;
  updateGovernance: (id: string, data: Partial<GovernanceInstance>) => void;
}

type SetFn = (partial: ProjectState | Partial<ProjectState> | ((state: ProjectState) => ProjectState | Partial<ProjectState>), replace?: boolean) => void;

// Helper: update current project fields
const updateCur = (set: SetFn, updater: (p: Project) => Partial<Project>) => {
  set((s: ProjectState) => ({
    projects: s.projects.map(p =>
      p.id === s.currentProjectId ? { ...p, ...updater(p) } : p
    )
  }));
};

// Exported selector helper
export const curProject = (s: ProjectState) =>
  s.projects.find(p => p.id === s.currentProjectId)!;

export const useProjectStore = create<ProjectState>()(
  persist(
    (set: SetFn) => ({
      projects: [DEFAULT_PROJECT],
      currentProjectId: 'proj1',

      createProject: (name, subtitle) => {
        const project: Project = {
          id: uuid(),
          name,
          subtitle,
          workstreams: [],
          tasks: [],
          governance: [],
          finalPage: { content: '', updatedAt: new Date().toISOString(), updatedBy: '' },
          createdAt: new Date().toISOString(),
        };
        set(s => ({ projects: [...s.projects, project], currentProjectId: project.id }));
      },

      deleteProject: (id) => {
        set(s => {
          const remaining = s.projects.filter(p => p.id !== id);
          const newCurrent = s.currentProjectId === id
            ? (remaining[0]?.id ?? '')
            : s.currentProjectId;
          return { projects: remaining, currentProjectId: newCurrent };
        });
      },

      switchProject: (id) => set({ currentProjectId: id }),

      updateProjectInfo: (name, subtitle) => {
        updateCur(set, () => ({ name, subtitle }));
      },

      updateWorkstream: (id, data) => {
        updateCur(set, p => ({
          workstreams: p.workstreams.map(ws => ws.id === id ? { ...ws, ...data } : ws)
        }));
      },

      createWorkstream: (data) => {
        const ws: Workstream = { ...data, id: uuid() };
        updateCur(set, p => ({ workstreams: [...p.workstreams, ws] }));
      },

      deleteWorkstream: (id) => {
        updateCur(set, p => ({
          workstreams: p.workstreams.filter(ws => ws.id !== id),
          tasks: p.tasks.filter(t => t.workstreamId !== id),
        }));
      },

      updateWorkstreamNotes: (workstreamId, notes) => {
        updateCur(set, p => ({
          workstreams: p.workstreams.map(ws => ws.id === workstreamId ? { ...ws, notes } : ws)
        }));
      },

      createTask: (data) => {
        const task: Task = { ...data, id: uuid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        updateCur(set, p => ({ tasks: [...p.tasks, task] }));
        return task;
      },

      updateTask: (id, data) => {
        updateCur(set, p => ({
          tasks: p.tasks.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)
        }));
      },

      deleteTask: (id) => {
        updateCur(set, p => ({ tasks: p.tasks.filter(t => t.id !== id) }));
      },

      updateTaskStatus: (id, status) => {
        updateCur(set, p => ({
          tasks: p.tasks.map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)
        }));
      },

      updateFinalPage: (content, userId) => {
        updateCur(set, () => ({
          finalPage: { content, updatedAt: new Date().toISOString(), updatedBy: userId }
        }));
      },

      updateGovernance: (id, data) => {
        updateCur(set, p => ({
          governance: p.governance.map(g => g.id === id ? { ...g, ...data } : g)
        }));
      },
    }),
    { name: 'project-store-v2' }
  )
);
