import { useState } from 'react';
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

function AppInner({ view, setView }: { view: View; setView: (v: View) => void }) {
  useFirestoreSync();
  const currentUser = useAuthStore(s => s.currentUser);
  if (!currentUser) return <LoginPage />;
  return (
    <Layout view={view} setView={setView}>
      {view.type === 'dashboard' && <Dashboard setView={setView} />}
      {view.type === 'workstream' && <WorkstreamDetail workstreamId={view.id} setView={setView} />}
      {view.type === 'users' && <UserManagement />}
      {view.type === 'finalpage' && <FinalPageView />}
      {view.type === 'governance' && <GovernanceView />}
      {view.type === 'settings' && <SettingsView />}
      {view.type === 'messaging' && <MessagingView />}
      {view.type === 'calendar' && <CalendarView setView={setView} />}
      {view.type === 'projects' && <ProjectsView />}
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
