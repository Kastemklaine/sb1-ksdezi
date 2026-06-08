export type Role = 'superadmin' | 'admin' | 'membre';

export interface User {
  id: string;
  name: string; // computed: firstName + ' ' + lastName
  firstName?: string;
  lastName?: string;
  email: string;
  role: Role;
  fonction?: string; // e.g. "Adjoint(e)", "Directeur/Directrice"
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
  notes?: string; // HTML — working notes visible to members only
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

export interface WorkstreamSubSection {
  id: string;
  name: string;
  order: number;
}

export interface WorkspaceDocument {
  id: string;
  workstreamId: string;
  subSectionId?: string;
  title: string;
  content: string; // rich text as HTML string or JSON for diagrams
  space: 'travail' | 'final';
  type?: 'document' | 'diagram';
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDiscussion {
  id: string;
  workstreamId: string;
  messages: { id: string; authorId: string; content: string; createdAt: string }[];
  createdAt: string;
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
  subSections: WorkstreamSubSection[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  workstreamId?: string;
  assigneeIds: string[];
  createdBy: string;
  color: string;
  alertMinutes: number;
  createdAt: string;
}

export interface MessageAttachment {
  name: string;
  url: string; // base64 data URL or remote URL
  type: string;
  size: number;
}

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  toId: string | null; // null = broadcast to all
  subject: string;
  body: string;
  attachments: MessageAttachment[];
  createdAt: string;
  readBy: string[];
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

export interface IADocument {
  id: string;
  title: string;
  content: string;
  imageData?: string; // base64 data URL for image documents
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  subtitle: string;
  fonctions: string[];
  anthropicKey?: string; // stored once by superadmin, synced to all devices
  workstreams: Workstream[];
  tasks: Task[];
  governance: GovernanceInstance[];
  finalPage: FinalPage;
  documents: WorkspaceDocument[];
  discussions: WorkspaceDiscussion[];
  events: CalendarEvent[];
  messages: Message[];
  iaDocuments: IADocument[];
  createdAt: string;
}
