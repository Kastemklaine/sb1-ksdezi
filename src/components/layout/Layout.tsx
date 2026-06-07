import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FileText, Network, LogOut, Menu, X,
  ChevronDown, ChevronRight, Settings, Bell, MessageSquare, Calendar, FolderKanban
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { View } from '../../App';

interface Props {
  view: View;
  setView: (v: View) => void;
  children: React.ReactNode;
}

// Map tailwind color class to hex for sidebar dot
const COLOR_HEX: Record<string, string> = {
  'bg-yellow-400': '#facc15',
  'bg-lime-600': '#65a30d',
  'bg-teal-500': '#14b8a6',
  'bg-red-500': '#ef4444',
  'bg-pink-500': '#ec4899',
  'bg-purple-600': '#9333ea',
  'bg-indigo-600': '#4f46e5',
  'bg-cyan-500': '#06b6d4',
  'bg-orange-500': '#f97316',
  'bg-emerald-600': '#059669',
  'bg-blue-600': '#2563eb',
  'bg-gray-500': '#6b7280',
};

export default function Layout({ view, setView, children }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const logout = useAuthStore(s => s.logout);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const projectName = useProjectStore(s => curProject(s)?.name ?? '');
  const projectSubtitle = useProjectStore(s => curProject(s)?.subtitle ?? '');
  // On mobile: drawer closed by default. On tablet/desktop: open by default.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wsExpanded, setWsExpanded] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialise sidebar state based on screen width after mount
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.docs.filter(d => {
        const data = d.data();
        const readBy: string[] = data.readBy ?? [];
        const fromId: string = data.fromId ?? '';
        const toId: string | null = data.toId ?? null;
        const isForMe = toId === null || toId === currentUser.id;
        return isForMe && fromId !== currentUser.id && !readBy.includes(currentUser.id);
      }).length;
      setUnreadCount(count);
    });
    return () => unsub();
  }, [currentUser]);

  const navigateTo = (v: View) => {
    setView(v);
    // Close drawer on mobile after navigation
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const isActive = (v: View) =>
    view.type === v.type && (!('id' in v) || !('id' in view) || (view as { id?: string }).id === (v as { id?: string }).id);

  // sidebarOpen on md+ means "expanded" (w-60 vs w-14)
  // sidebarOpen on mobile means "drawer visible"
  const navItem = (label: string, NavIcon: React.ElementType, v: View) => {
    const active = isActive(v);
    const expanded = sidebarOpen;
    return (
      <button
        key={label}
        onClick={() => navigateTo(v)}
        title={!expanded ? label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative min-h-[44px] ${
          active
            ? 'bg-[#00c875]/20 text-[#00c875] font-semibold'
            : 'text-gray-400 hover:bg-white/10 hover:text-white'
        }`}
      >
        <NavIcon className="w-4 h-4 shrink-0" />
        {expanded && <span className="truncate">{label}</span>}
        {!expanded && (
          <span className="absolute left-full ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
            {label}
          </span>
        )}
      </button>
    );
  };

  const currentPageTitle = () => {
    if (view.type === 'dashboard') return 'Tableau de bord';
    if (view.type === 'workstream') {
      const ws = workstreams.find(w => w.id === (view as { id: string }).id);
      return ws?.name ?? 'Axe';
    }
    if (view.type === 'users') return 'Gestion des utilisateurs';
    if (view.type === 'finalpage') return 'Page résultat';
    if (view.type === 'governance') return 'Gouvernance';
    if (view.type === 'settings') return 'Paramètres';
    if (view.type === 'messaging') return 'Messagerie';
    if (view.type === 'calendar') return 'Agenda';
    if (view.type === 'projects') return 'Projets';
    return '';
  };

  // On md+: sidebar is always rendered (collapsed or expanded)
  // On mobile (<768px): sidebar is a drawer (fixed, slides from left)
  const sidebarContent = (isMobileDrawer: boolean) => {
    const expanded = isMobileDrawer ? true : sidebarOpen;
    return (
      <>
        {/* Logo / project name */}
        <div className={`flex items-center gap-2 px-3 py-4 border-b border-white/10 ${expanded ? 'justify-between' : 'justify-center'}`}>
          {expanded && (
            <div className="min-w-0">
              <p className="font-bold text-white text-xs leading-tight truncate">{projectName}</p>
              <p className="text-[#00c875] text-xs mt-0.5 truncate">{projectSubtitle}</p>
            </div>
          )}
          {isMobileDrawer ? (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            >
              {expanded ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItem('Tableau de bord', LayoutDashboard, { type: 'dashboard' })}
          {navItem('Gouvernance', Network, { type: 'governance' })}
          {navItem('Page résultat', FileText, { type: 'finalpage' })}

          {/* Messagerie with unread badge */}
          <button
            onClick={() => navigateTo({ type: 'messaging' })}
            title={!expanded ? 'Messagerie' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative min-h-[44px] ${
              view.type === 'messaging'
                ? 'bg-[#00c875]/20 text-[#00c875] font-semibold'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            {expanded && <span className="truncate flex-1 text-left">Messagerie</span>}
            {expanded && unreadCount > 0 && (
              <span className="bg-green-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0">
                {unreadCount}
              </span>
            )}
            {!expanded && unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />
            )}
            {!expanded && (
              <span className="absolute left-full ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                Messagerie
              </span>
            )}
          </button>

          {navItem('Agenda', Calendar, { type: 'calendar' })}
          {currentUser?.role === 'superadmin' && navItem('Utilisateurs', Users, { type: 'users' })}
          {currentUser?.role === 'superadmin' && navItem('Paramètres', Settings, { type: 'settings' })}
          {currentUser?.role === 'superadmin' && navItem('Projets', FolderKanban, { type: 'projects' })}

          {/* Workstreams section */}
          <div className="pt-3">
            <button
              onClick={() => setWsExpanded(e => !e)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors ${!expanded ? 'justify-center' : ''}`}
            >
              {expanded ? (
                <>
                  {wsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span>Axes du projet</span>
                </>
              ) : (
                <span className="w-1 h-4 bg-gray-600 rounded-full" />
              )}
            </button>

            {wsExpanded && workstreams.map(ws => {
              const active = view.type === 'workstream' && (view as { id: string }).id === ws.id;
              const dotColor = COLOR_HEX[ws.color] ?? '#888';
              return (
                <button
                  key={ws.id}
                  onClick={() => navigateTo({ type: 'workstream', id: ws.id })}
                  title={!expanded ? ws.name : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative min-h-[44px] ${
                    active ? 'bg-[#00c875]/20 text-[#00c875] font-semibold' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  } ${!expanded ? 'justify-center' : ''}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  {expanded && <span className="truncate text-left">{ws.name}</span>}
                  {!expanded && (
                    <span className="absolute left-full ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {ws.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className={`p-2 border-t border-white/10 ${!expanded ? 'flex justify-center' : ''}`}>
          <button
            onClick={logout}
            title={!expanded ? 'Se déconnecter' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-red-400 transition-colors group relative min-h-[44px] ${!expanded ? 'justify-center' : ''}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#00c875] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {currentUser?.name.charAt(0)}
            </div>
            {expanded && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
              </div>
            )}
            {expanded && <LogOut className="w-4 h-4 shrink-0" />}
            {!expanded && (
              <span className="absolute left-full ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                Se déconnecter
              </span>
            )}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-[#f6f7fb] overflow-hidden">
      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile drawer (<768px) ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col bg-[#1e1f28] transition-transform duration-200 w-60
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:hidden
        `}
      >
        {sidebarContent(true)}
      </aside>

      {/* ── Desktop / tablet sidebar (≥768px, always rendered) ── */}
      <aside
        className={`
          hidden md:flex flex-col bg-[#1e1f28] transition-all duration-200 shrink-0
          ${sidebarOpen ? 'w-60' : 'w-14'}
        `}
      >
        {sidebarContent(false)}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Mobile top bar (visible only on <768px) ── */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1e1f28] border-b border-white/10 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-white text-sm font-bold truncate flex-1 mx-3 text-center">{projectName}</p>
          <div className="w-8 h-8 rounded-full bg-[#00c875] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {currentUser?.name.charAt(0)}
          </div>
        </header>

        {/* ── Desktop top header (visible on ≥768px) ── */}
        <header className="hidden md:flex bg-white border-b border-gray-200 px-4 md:px-6 py-3 items-center justify-between gap-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-400 font-medium hidden md:block">{projectName}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 hidden md:block" />
              <span className="font-semibold text-gray-800">{currentPageTitle()}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </button>
            {/* User avatar menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-full bg-[#00c875] flex items-center justify-center text-white text-xs font-bold">
                  {currentUser?.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block">{currentUser?.name}</span>
                <ChevronDown className="w-3 h-3 text-gray-400 hidden md:block" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">{currentUser?.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{currentUser?.role}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
