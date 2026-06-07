import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Task, Workstream, GovernanceInstance, FinalPage, TaskStatus } from '../types';

const WORKSTREAMS: Workstream[] = [
  { id: 'ws1', name: 'Communication', color: 'bg-yellow-400', textColor: 'text-yellow-900', description: 'Stratégie et actions de communication du projet', notes: '', icon: 'Megaphone', instance: 'both', assigneeIds: [] },
  { id: 'ws2', name: 'COPIL', color: 'bg-lime-600', textColor: 'text-white', description: 'Comité de Pilotage — gouvernance stratégique', notes: '', icon: 'Users', instance: 'copil', assigneeIds: [] },
  { id: 'ws3', name: 'COTEC', color: 'bg-teal-500', textColor: 'text-white', description: 'Comité Technique — suivi opérationnel', notes: '', icon: 'Settings', instance: 'cotec', assigneeIds: [] },
  { id: 'ws4', name: 'Participation citoyenne', color: 'bg-red-500', textColor: 'text-white', description: 'Engagement et concertation citoyenne', notes: '', icon: 'Heart', instance: 'none', assigneeIds: [] },
  { id: 'ws5', name: 'Sensibilisation & médiation', color: 'bg-pink-500', textColor: 'text-white', description: 'Actions de sensibilisation et médiation', notes: '', icon: 'BookOpen', instance: 'none', assigneeIds: [] },
  { id: 'ws6', name: 'Signalétique + voirie', color: 'bg-purple-600', textColor: 'text-white', description: 'Aménagement signalétique et voirie adaptée', notes: '', icon: 'MapPin', instance: 'cotec', assigneeIds: [] },
  { id: 'ws7', name: 'Gestion différenciée + fleurissement', color: 'bg-indigo-600', textColor: 'text-white', description: 'Gestion différenciée des espaces verts et fleurissement', notes: '', icon: 'Flower2', instance: 'cotec', assigneeIds: [] },
  { id: 'ws8', name: 'Aménagements + mobiliers urbains', color: 'bg-cyan-500', textColor: 'text-white', description: 'Mobiliers urbains et aménagements accessibles', notes: '', icon: 'Building2', instance: 'cotec', assigneeIds: [] },
];

const GOVERNANCE: GovernanceInstance[] = [
  { id: 'gov1', name: 'COPIL', description: 'Comité de Pilotage — décisions stratégiques et validation des grandes orientations du projet', memberIds: ['u1', 'u2'], workstreamIds: ['ws1', 'ws2'] },
  { id: 'gov2', name: 'COTEC', description: 'Comité Technique — suivi de la mise en œuvre opérationnelle et coordination des actions', memberIds: ['u2', 'u3'], workstreamIds: ['ws3', 'ws6', 'ws7', 'ws8'] },
];

interface ProjectState {
  workstreams: Workstream[];
  tasks: Task[];
  governance: GovernanceInstance[];
  finalPage: FinalPage;
  projectName: string;
  projectSubtitle: string;
  updateProjectInfo: (name: string, subtitle: string) => void;
  updateWorkstream: (id: string, data: Partial<Workstream>) => void;
  updateWorkstreamNotes: (workstreamId: string, notes: string) => void;
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateFinalPage: (content: string, userId: string) => void;
  updateGovernance: (id: string, data: Partial<GovernanceInstance>) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      workstreams: WORKSTREAMS,
      tasks: [],
      governance: GOVERNANCE,
      finalPage: { content: '<p>La page résultat du projet sera publiée ici par les super administrateurs.</p>', updatedAt: new Date().toISOString(), updatedBy: '' },
      projectName: "Ville à hauteur d'enfant ; handicaps",
      projectSubtitle: 'Vers la 4e fleur',
      updateProjectInfo: (name, subtitle) => {
        set({ projectName: name, projectSubtitle: subtitle });
      },
      updateWorkstream: (id, data) => {
        set(state => ({ workstreams: state.workstreams.map(ws => ws.id === id ? { ...ws, ...data } : ws) }));
      },
      updateWorkstreamNotes: (workstreamId, notes) => {
        set(state => ({ workstreams: state.workstreams.map(ws => ws.id === workstreamId ? { ...ws, notes } : ws) }));
      },
      createTask: (data) => {
        const task: Task = { ...data, id: uuid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set(state => ({ tasks: [...state.tasks, task] }));
        return task;
      },
      updateTask: (id, data) => {
        set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t) }));
      },
      deleteTask: (id) => {
        set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
      },
      updateTaskStatus: (id, status) => {
        set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t) }));
      },
      updateFinalPage: (content, userId) => {
        set({ finalPage: { content, updatedAt: new Date().toISOString(), updatedBy: userId } });
      },
      updateGovernance: (id, data) => {
        set(state => ({ governance: state.governance.map(g => g.id === id ? { ...g, ...data } : g) }));
      },
    }),
    { name: 'project-store' }
  )
);
