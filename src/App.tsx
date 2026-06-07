import { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
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

export type View =
  | { type: 'dashboard' }
  | { type: 'workstream'; id: string }
  | { type: 'users' }
  | { type: 'finalpage' }
  | { type: 'governance' }
  | { type: 'settings' }
  | { type: 'messaging' }
  | { type: 'calendar' };

export default function App() {
  const currentUser = useAuthStore(s => s.currentUser);
  const [view, setView] = useState<View>({ type: 'dashboard' });

  if (!currentUser) return <LoginPage />;

  return (
    <Layout view={view} setView={setView}>
      {view.type === 'dashboard' && <Dashboard setView={setView} />}
      {view.type === 'workstream' && <WorkstreamDetail workstreamId={view.id} />}
      {view.type === 'users' && <UserManagement />}
      {view.type === 'finalpage' && <FinalPageView />}
      {view.type === 'governance' && <GovernanceView />}
      {view.type === 'settings' && <SettingsView />}
      {view.type === 'messaging' && <MessagingView />}
      {view.type === 'calendar' && <CalendarView />}
    </Layout>
  );
}
