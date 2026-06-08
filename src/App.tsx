import { useState } from 'react';
import React from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import LoginPage from './components/auth/LoginPage';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import WorkstreamDetail from './components/workstream/WorkstreamDetail';
import UserManagement from './components/admin/UserManagement';
import FinalPageView from './components/finalpage/FinalPageView';
import GovernanceView from './components/governance/GovernanceView';
import SettingsView from './components/admin/SettingsView';
import MessagingView from './components/messaging/MessagingView';
import CalendarView from './components/calendar/CalendarView';
import ProjectsView from './components/projects/ProjectsView';
import WorkspacesSelector from './components/workspace/WorkspacesSelector';
import WorkspaceView from './components/workspace/WorkspaceView';
import FinalDocumentView from './components/workspace/FinalDocumentView';
import DiagramsView from './components/diagrams/DiagramsView';
import LegalView from './components/legal/LegalView';
import IAView from './components/ia/IAView';

export type View =
  | { type: 'dashboard' }
  | { type: 'workstream'; id: string }
  | { type: 'users' }
  | { type: 'finalpage' }
  | { type: 'governance' }
  | { type: 'settings' }
  | { type: 'messaging' }
  | { type: 'calendar' }
  | { type: 'projects' }
  | { type: 'workspaces' }
  | { type: 'workspace'; workstreamId: string }
  | { type: 'final-document' }
  | { type: 'diagrams' }
  | { type: 'legal' }
  | { type: 'ia' };

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
      <span className="text-4xl">🔒</span>
      <p className="text-lg font-semibold">Accès refusé</p>
      <p className="text-sm">Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
    </div>
  );
}

function AppInner({ view, setView }: { view: View; setView: (v: View) => void }) {
  useFirestoreSync();
  const currentUser = useAuthStore(s => s.currentUser);
  if (!currentUser) return <LoginPage />;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdmin = isSuperAdmin || currentUser.role === 'admin';

  const guard = (allowed: boolean, component: React.ReactNode) => allowed ? component : <Forbidden />;

  return (
    <Layout view={view} setView={setView}>
      {view.type === 'dashboard' && <Dashboard setView={setView} />}
      {view.type === 'workstream' && <WorkstreamDetail workstreamId={view.id} setView={setView} />}
      {view.type === 'users' && guard(isSuperAdmin, <UserManagement />)}
      {view.type === 'finalpage' && <FinalPageView />}
      {view.type === 'governance' && guard(isAdmin, <GovernanceView />)}
      {view.type === 'settings' && guard(isSuperAdmin, <SettingsView />)}
      {view.type === 'messaging' && <MessagingView />}
      {view.type === 'calendar' && <CalendarView setView={setView} />}
      {view.type === 'projects' && guard(isSuperAdmin, <ProjectsView />)}
      {view.type === 'workspaces' && <WorkspacesSelector setView={setView} />}
      {view.type === 'workspace' && <WorkspaceView workstreamId={view.workstreamId} setView={setView} />}
      {view.type === 'final-document' && <FinalDocumentView />}
      {view.type === 'diagrams' && <DiagramsView setView={setView} />}
      {view.type === 'legal' && <LegalView />}
      {view.type === 'ia' && <IAView />}
    </Layout>
  );
}

export default function App() {
  const currentUser = useAuthStore(s => s.currentUser);
  const [view, setView] = useState<View>({ type: 'dashboard' });

  if (!currentUser) return <LoginPage />;

  return <AppInner view={view} setView={setView} />;
}
