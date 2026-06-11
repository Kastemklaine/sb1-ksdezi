import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, CheckSquare, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { View } from '../../App';

interface Props {
  setView: (v: View) => void;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  task_assigned: CheckSquare,
  task_comment: MessageSquare,
  message: MessageSquare,
  task_due: AlertTriangle,
};

const TYPE_COLOR: Record<string, string> = {
  task_assigned: 'text-green-500',
  task_comment: 'text-blue-500',
  message: 'text-purple-500',
  task_due: 'text-orange-500',
};

export default function NotificationBell({ setView }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const { notifications, markRead, markAllRead, clearAll } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const userId = currentUser?.id ?? '';
  const mine = notifications.filter(n => n.userId === userId);
  const unread = mine.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n: typeof mine[0]) => {
    markRead(n.id);
    if (n.link) setView({ type: 'workstream', id: n.link });
    else if (n.type === 'message') setView({ type: 'messaging' });
    setOpen(false);
  };

  const timeAgo = (iso: string) => {
    try { return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: fr }); } catch { return ''; }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[150] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            <div className="flex gap-1">
              {unread > 0 && (
                <button onClick={() => markAllRead(userId)} title="Tout marquer lu"
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {mine.length > 0 && (
                <button onClick={() => clearAll(userId)} title="Tout supprimer"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {mine.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                <Clock className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              mine.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                const color = TYPE_COLOR[n.type] ?? 'text-gray-500';
                return (
                  <button key={n.id} onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.read ? 'bg-blue-50/40' : ''}`}>
                    <div className={`mt-0.5 shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
