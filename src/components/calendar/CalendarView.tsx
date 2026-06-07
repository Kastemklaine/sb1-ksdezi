import { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import { Calendar, Plus, X, ChevronLeft, ChevronRight, Loader2, Download, Trash2 } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, format, addMonths, subMonths, parseISO, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface CalendarEvent {
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

const ALERT_OPTIONS = [
  { value: 0, label: 'Aucune alerte' },
  { value: 15, label: '15 minutes avant' },
  { value: 30, label: '30 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 1440, label: '1 jour avant' },
];

const DEFAULT_COLOR = '#00c875';

function generateICS(event: CalendarEvent): string {
  const toICSDate = (iso: string, allDay: boolean) => {
    const d = new Date(iso);
    if (allDay) {
      return format(d, 'yyyyMMdd');
    }
    return format(d, "yyyyMMdd'T'HHmmss");
  };

  const escape = (s: string) => s.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

  const now = format(new Date(), "yyyyMMdd'T'HHmmss");
  const uid = `${event.id}@ville-enfant.fr`;
  const startStr = toICSDate(event.startDate, event.allDay);
  const endStr = toICSDate(event.endDate, event.allDay);

  const dtStartProp = event.allDay ? `DTSTART;VALUE=DATE:${startStr}` : `DTSTART:${startStr}`;
  const dtEndProp = event.allDay ? `DTEND;VALUE=DATE:${endStr}` : `DTEND:${endStr}`;

  let alertBlock = '';
  if (event.alertMinutes > 0) {
    alertBlock = `BEGIN:VALARM\r\nTRIGGER:-PT${event.alertMinutes}M\r\nACTION:DISPLAY\r\nDESCRIPTION:${escape(event.title)}\r\nEND:VALARM\r\n`;
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ville à hauteur d\'enfant//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtStartProp,
    dtEndProp,
    `SUMMARY:${escape(event.title)}`,
    event.description ? `DESCRIPTION:${escape(event.description)}` : '',
    alertBlock.trim(),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export default function CalendarView() {
  const currentUser = useAuthStore(s => s.currentUser);
  const users = useAuthStore(s => s.users);
  const workstreams = useProjectStore(s => s.workstreams);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formAllDay, setFormAllDay] = useState(true);
  const [formWorkstreamId, setFormWorkstreamId] = useState('');
  const [formAssigneeIds, setFormAssigneeIds] = useState<string[]>([]);
  const [formColor, setFormColor] = useState(DEFAULT_COLOR);
  const [formAlertMinutes, setFormAlertMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Check for upcoming events and show alerts
    if (!currentUser || events.length === 0) return;
    const now = new Date();
    events.forEach(event => {
      if (event.alertMinutes === 0) return;
      const start = new Date(event.startDate);
      const diffMs = start.getTime() - now.getTime();
      const diffMinutes = diffMs / 60000;
      if (diffMinutes > 0 && diffMinutes <= event.alertMinutes) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Rappel : ${event.title}`, {
            body: `Dans ${Math.round(diffMinutes)} minute${Math.round(diffMinutes) > 1 ? 's' : ''}`,
          });
        }
      }
    });
  }, [events, currentUser]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'events'), orderBy('startDate', 'asc'));
      const snap = await getDocs(q);
      const evts: CalendarEvent[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? '',
          description: data.description ?? '',
          startDate: data.startDate ?? '',
          endDate: data.endDate ?? '',
          allDay: data.allDay ?? true,
          workstreamId: data.workstreamId,
          assigneeIds: data.assigneeIds ?? [],
          createdBy: data.createdBy ?? '',
          color: data.color ?? DEFAULT_COLOR,
          alertMinutes: data.alertMinutes ?? 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        };
      });
      setEvents(evts);
    } finally {
      setLoading(false);
    }
  };

  const openNewEvent = (day?: Date) => {
    const d = day ?? new Date();
    const dateStr = format(d, "yyyy-MM-dd'T'HH:mm");
    setFormTitle('');
    setFormDescription('');
    setFormStartDate(dateStr);
    setFormEndDate(dateStr);
    setFormAllDay(true);
    setFormWorkstreamId('');
    setFormAssigneeIds([]);
    setFormColor(DEFAULT_COLOR);
    setFormAlertMinutes(0);
    setSelectedEvent(null);
    setShowModal(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    setFormTitle(event.title);
    setFormDescription(event.description);
    setFormStartDate(event.startDate.slice(0, 16));
    setFormEndDate(event.endDate.slice(0, 16));
    setFormAllDay(event.allDay);
    setFormWorkstreamId(event.workstreamId ?? '');
    setFormAssigneeIds(event.assigneeIds);
    setFormColor(event.color);
    setFormAlertMinutes(event.alertMinutes);
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentUser || !formTitle.trim()) return;
    setSaving(true);
    try {
      const data = {
        title: formTitle.trim(),
        description: formDescription,
        startDate: formStartDate,
        endDate: formEndDate || formStartDate,
        allDay: formAllDay,
        workstreamId: formWorkstreamId || null,
        assigneeIds: formAssigneeIds,
        createdBy: currentUser.id,
        color: formColor,
        alertMinutes: formAlertMinutes,
        createdAt: serverTimestamp(),
      };
      if (selectedEvent) {
        await updateDoc(doc(db, 'events', selectedEvent.id), data);
      } else {
        await addDoc(collection(db, 'events'), data);
      }
      setShowModal(false);
      await loadEvents();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'events', selectedEvent.id));
      setShowModal(false);
      await loadEvents();
    } finally {
      setSaving(false);
    }
  };

  const handleExportICS = (event: CalendarEvent) => {
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const getEventsForDay = (day: Date) =>
    events.filter(e => {
      try {
        return isSameDay(parseISO(e.startDate), day);
      } catch {
        return false;
      }
    });

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Agenda</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold text-gray-800 capitalize min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => openNewEvent()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un événement
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-3 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const todayDay = isToday(day);
              const selected = selectedDay && isSameDay(day, selectedDay);
              return (
                <div
                  key={i}
                  onClick={() => { setSelectedDay(day); openNewEvent(day); }}
                  className={`min-h-[100px] border-b border-r border-gray-100 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !inMonth ? 'bg-gray-50/50' : ''
                  } ${selected ? 'bg-green-50' : ''}`}
                >
                  <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                    todayDay ? 'bg-green-600 text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(event => (
                      <button
                        key={event.id}
                        onClick={e => { e.stopPropagation(); openEditEvent(event); }}
                        className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: event.color }}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} autres</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Titre de l'événement"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="allday"
                  type="checkbox"
                  checked={formAllDay}
                  onChange={e => setFormAllDay(e.target.checked)}
                  className="rounded border-gray-300 text-green-600"
                />
                <label htmlFor="allday" className="text-sm text-gray-700">Toute la journée</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                  <input
                    type={formAllDay ? 'date' : 'datetime-local'}
                    value={formAllDay ? formStartDate.slice(0, 10) : formStartDate}
                    onChange={e => setFormStartDate(formAllDay ? e.target.value + 'T00:00' : e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input
                    type={formAllDay ? 'date' : 'datetime-local'}
                    value={formAllDay ? formEndDate.slice(0, 10) : formEndDate}
                    onChange={e => setFormEndDate(formAllDay ? e.target.value + 'T23:59' : e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Axe du projet (optionnel)</label>
                <select
                  value={formWorkstreamId}
                  onChange={e => {
                    setFormWorkstreamId(e.target.value);
                    if (e.target.value) {
                      const ws = workstreams.find(w => w.id === e.target.value);
                      // map tailwind color to hex
                      const colorMap: Record<string, string> = {
                        'bg-yellow-400': '#facc15', 'bg-lime-600': '#65a30d',
                        'bg-teal-500': '#14b8a6', 'bg-red-500': '#ef4444',
                        'bg-pink-500': '#ec4899', 'bg-purple-600': '#9333ea',
                        'bg-indigo-600': '#4f46e5', 'bg-cyan-500': '#06b6d4',
                      };
                      if (ws) setFormColor(colorMap[ws.color] ?? DEFAULT_COLOR);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Aucun axe</option>
                  {workstreams.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={formAssigneeIds.includes(u.id)}
                        onChange={e => setFormAssigneeIds(prev =>
                          e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                        )}
                        className="rounded border-gray-300 text-green-600"
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <input
                    type="color"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="w-full h-9 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alerte</label>
                  <select
                    value={formAlertMinutes}
                    onChange={e => setFormAlertMinutes(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {ALERT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <div>
                {selectedEvent && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                    <button
                      onClick={() => handleExportICS(selectedEvent)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Exporter (.ics)
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formTitle.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {selectedEvent ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
