export type Role = 'superadmin' | 'admin' | 'membre';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  workstreamIds: string[];
  createdAt: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

export type TaskStatus = 'todo' | 'inprogress' | 'done' | 'blocked';

export interface Task {
  id: string;
  workstreamId: string;
  title: string;
  description: string; // HTML from Tiptap
  assigneeIds: string[];
  status: TaskStatus;
  startDate: string;
  endDate: string;
  budget: number;
  dependsOn: string[]; // task ids
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Workstream {
  id: string;
  name: string;
  color: string; // tailwind bg class
  textColor: string;
  description: string;
  notes: string; // HTML from Tiptap
  icon: string; // lucide icon name
  instance: 'copil' | 'cotec' | 'both' | 'none';
  assigneeIds: string[]; // users responsible for this workstream
}

export interface GovernanceInstance {
  id: string;
  name: string; // COPIL or COTEC
  description: string;
  memberIds: string[];
  workstreamIds: string[];
}

export interface FinalPage {
  content: string; // HTML from Tiptap
  updatedAt: string;
  updatedBy: string;
}

export interface Project {
  id: string;
  name: string;
  subtitle: string;
  workstreams: Workstream[];
  tasks: Task[];
  governance: GovernanceInstance[];
  finalPage: FinalPage;
  createdAt: string;
}
