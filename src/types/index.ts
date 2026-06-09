export type Role = 'superadmin' | 'admin' | 'membre';

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: Role;
  fonction?: string;
  workstreamIds: string[];
  createdAt: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

export type TaskStatus = 'todo' | 'inprogress' | 'done' | 'blocked';

export interface TaskComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  data: string; // base64 data URL
  type: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  id: string;
  workstreamId: string;
  title: string;
  description: string;
  notes?: string;
  assigneeIds: string[];
  status: TaskStatus;
  startDate: string;
  endDate: string;
  budget: number;
  dependsOn: string[];
  order: number;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
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
  content: string;
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
  color: string;
  textColor: string;
  description: string;
  notes: string;
  icon: string;
  instance: 'copil' | 'cotec' | 'both' | 'none';
  assigneeIds: string[];
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
  url: string;
  type: string;
  size: number;
}

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  toId: string | null;
  subject: string;
  body: string;
  attachments: MessageAttachment[];
  createdAt: string;
  readBy: string[];
}

export interface GovernanceInstance {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  workstreamIds: string[];
  order?: number;
}

export interface FinalPage {
  content: string;
  updatedAt: string;
  updatedBy: string;
}

export interface IADocument {
  id: string;
  title: string;
  content: string;
  imageData?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'task_assigned' | 'task_comment' | 'message' | 'task_due';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string; // e.g. workstreamId
  read: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  subtitle: string;
  fonctions: string[];
  groqKey?: string;
  groqModel?: string;
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
