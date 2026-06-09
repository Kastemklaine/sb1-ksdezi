import { useState, lazy, Suspense } from 'react';
import React from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import LoginPage from './components/auth/LoginPage';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';

// Heavy modules loaded on demand
const WorkstreamDetail = lazy(() => import('./components/workstream/WorkstreamDetail'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));
const FinalPageView = lazy(() => import('./components/finalpage/FinalPageView'));
const GovernanceView = lazy(() => import('./components/governance/GovernanceView'));
const SettingsView = lazy(() => import('./components/admin/SettingsView'));
const MessagingView = lazy(() => import('./components/messaging/MessagingView'));
const CalendarView = lazy(() => import('./components/calendar/CalendarView'));
const ProjectsView = lazy(() => import('./components/projects/ProjectsView'));
const WorkspacesSelector = lazy(() => import('./components/workspace/WorkspacesSelector'));
const WorkspaceView = lazy(() => import('./components/workspace/WorkspaceView'));
const FinalDocumentView = lazy(() => import('./components/workspace/FinalDocumentView'));
const DiagramsView = lazy(() => import('./components/diagrams/DiagramsView'));
const LegalView = lazy(() => import('./components/legal/LegalView'));
const IAView = lazy(() => import('./components/ia/IAView'));

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
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400 text-sm">Chargement...</div>}>
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
      </Suspense>
    </Layout>
  );
}

export default function App() {
  const currentUser = useAuthStore(s => s.currentUser);
  const [view, setView] = useState<View>({ type: 'dashboard' });

  if (!currentUser) return <LoginPage />;

  return <AppInner view={view} setView={setView} />;
}
