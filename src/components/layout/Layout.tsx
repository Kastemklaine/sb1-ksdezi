import { useState } from 'react';
import {
  LayoutDashboard, Users, FileText, Network, LogOut, Menu, X,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import type { View } from '../../App';

interface Props {
  view: View;
  setView: (v: View) => void;
  children: React.ReactNode;
}

export default function Layout({ view, setView, children }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const logout = useAuthStore(s => s.logout);
  const workstreams = useProjectStore(s => s.workstreams);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wsExpanded, setWsExpanded] = useState(true);

  const navItem = (label: string, NavIcon: React.ElementType, v: View, extra?: string) => {
    const active = view.type === v.type && (!('id' in v) || !('id' in view) || (view as { id?: string }).id === (v as { id?: string }).id);
    return (
      <button
        key={label}
        onClick={() => { setView(v); setSidebarOpen(window.innerWidth >= 768); }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-600 hover:bg-gray-100'} ${extra ?? ''}`}
      >
        <NavIcon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      <div className="p-4 border-b border-gray-200">
        <p className="font-bold text-gray-900 text-sm leading-tight">Ville à hauteur d'enfant</p>
        <p className="text-green-600 text-xs mt-0.5">Vers la 4e fleur</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItem('Tableau de bord', LayoutDashboard, { type: 'dashboard' })}
        {navItem('Gouvernance', Network, { type: 'governance' })}

        <div className="pt-2">
          <button
            onClick={() => setWsExpanded(e => !e)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
          >
            {wsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Axes du projet
          </button>
          {wsExpanded && workstreams.map(ws => {
            const active = view.type === 'workstream' && (view as { id: string }).id === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => setView({ type: 'workstream', id: ws.id })}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ws.color}`} />
                <span className="truncate text-left">{ws.name}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          {navItem('Page résultat', FileText, { type: 'finalpage' })}
          {currentUser?.role === 'superadmin' && navItem('Utilisateurs', Users, { type: 'users' })}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2 px-2 py-1 mb-2">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{currentUser?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{currentUser?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:static md:translate-x-0 z-30 h-full transition-transform duration-200`}>
        {sidebar}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(o => !o)} className="p-1">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-semibold text-gray-800 text-sm">Ville à hauteur d'enfant</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
