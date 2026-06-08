import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore, curProject } from '../../store/useProjectStore';
import { Calendar, Plus, X, ChevronLeft, ChevronRight, Download, Trash2, RefreshCw, CheckSquare, Info, Pencil, FolderOpen, Link, Loader2 } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, format, addMonths, subMonths, parseISO, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CalendarEvent, Task } from '../../types';
import type { View } from '../../App';

const ALERT_OPTIONS = [
  { value: 0, label: 'Aucune alerte' },
  { value: 15, label: '15 minutes avant' },
  { value: 30, label: '30 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 1440, label: '1 jour avant' },
];

const DEFAULT_COLOR = '#00c875';
const TASK_COLOR = '#6366f1'; // indigo for tasks

function eventToVEVENT(event: CalendarEvent): string {
  const toICSDate = (iso: string, allDay: boolean) => {
    const d = new Date(iso);
    if (allDay) return format(d, 'yyyyMMdd');
    return format(d, "yyyyMMdd'T'HHmmss");
  };
  const escape = (s: string) => s.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const now = format(new Date(), "yyyyMMdd'T'HHmmss");
  const dtStart = event.allDay ? `DTSTART;VALUE=DATE:${toICSDate(event.startDate, true)}` : `DTSTART:${toICSDate(event.startDate, false)}`;
  const dtEnd = event.allDay ? `DTEND;VALUE=DATE:${toICSDate(event.endDate, true)}` : `DTEND:${toICSDate(event.endDate, false)}`;
  const alert = event.alertMinutes > 0
    ? `BEGIN:VALARM\r\nTRIGGER:-PT${event.alertMinutes}M\r\nACTION:DISPLAY\r\nDESCRIPTION:${escape(event.title)}\r\nEND:VALARM`
    : '';
  return [
    'BEGIN:VEVENT',
    `UID:evt-${event.id}@ville-enfant.fr`,
    `DTSTAMP:${now}`,
    dtStart, dtEnd,
    `SUMMARY:${escape(event.title)}`,
    event.description ? `DESCRIPTION:${escape(event.description)}` : '',
    alert,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n');
}

function taskToVEVENT(task: Task, wsName: string): string {
  const escape = (s: string) => s.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const now = format(new Date(), "yyyyMMdd'T'HHmmss");
  if (!task.startDate) return '';
  const startStr = format(parseISO(task.startDate), 'yyyyMMdd');
  const endDate = task.endDate ? task.endDate : task.startDate;
  // DTEND for all-day is exclusive (day after)
  const endDateObj = new Date(endDate);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const endStr = format(endDateObj, 'yyyyMMdd');
  const statusMap: Record<string, string> = { todo: 'NEEDS-ACTION', inprogress: 'IN-PROCESS', done: 'COMPLETED', blocked: 'CANCELLED' };
  return [
    'BEGIN:VEVENT',
    `UID:task-${task.id}@ville-enfant.fr`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${startStr}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:[Tâche] ${escape(task.title)}`,
    `DESCRIPTION:Axe: ${escape(wsName)}\\nStatut: ${statusMap[task.status] ?? task.status}`,
    `CATEGORIES:TACHE`,
    `STATUS:${statusMap[task.status] ?? 'NEEDS-ACTION'}`,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n');
}

function generateICS(event: CalendarEvent): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', "PRODID:-//Projet's ma Ville//FR", 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', eventToVEVENT(event), 'END:VCALENDAR'].join('\r\n');
}

function generateFullICS(events: CalendarEvent[], tasks: Task[], workstreams: { id: string; name: string }[]): string {
  const getWsName = (id: string) => workstreams.find(w => w.id === id)?.name ?? '';
  const vevents = [
    ...events.map(eventToVEVENT),
    ...tasks.filter(t => t.startDate).map(t => taskToVEVENT(t, getWsName(t.workstreamId))),
  ].filter(Boolean);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Projet's ma Ville - Quimperlé//FR",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Projet's ma Ville`,
    'X-WR-TIMEZONE:Europe/Paris',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}


interface Props { setView: (v: View) => void; }

export default function CalendarView({ setView }: Props) {
  const currentUser = useAuthStore(s => s.currentUser);
  const users = useAuthStore(s => s.users);
  const workstreams = useProjectStore(s => curProject(s)?.workstreams ?? []);
  const events = useProjectStore(s => curProject(s)?.events ?? []);
  const tasks = useProjectStore(s => (curProject(s)?.tasks ?? []).filter(t => t.startDate));
  const { createEvent, updateEvent, deleteEvent } = useProjectStore();
  const [showOutlookModal, setShowOutlookModal] = useState(false);
  const [webcalUrl, setWebcalUrl] = useState<string>('');
  const [publishingICS, setPublishingICS] = useState(false);
  const [copied, setCopied] = useState(false);
  const publishDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const [taskMenu, setTaskMenu] = useState<{ task: Task; x: number; y: number } | null>(null);

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

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
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

  // Publish ICS to Firebase Storage for webcal subscription (debounced)
  useEffect(() => {
    if (publishDebounce.current) clearTimeout(publishDebounce.current);
    publishDebounce.current = setTimeout(async () => {
      try {
        const ics = generateFullICS(events, tasks, workstreams);
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const fileRef = storageRef(storage, `calendars/${currentProjectId}.ics`);
        await uploadBytes(fileRef, blob, { contentType: 'text/calendar', cacheControl: 'public, max-age=3600' });
        const url = await getDownloadURL(fileRef);
        setWebcalUrl(url.replace(/^https:\/\//, 'webcal://'));
      } catch {
        // Storage rules may not allow yet — silently fail
      }
    }, 3000);
    return () => { if (publishDebounce.current) clearTimeout(publishDebounce.current); };
  }, [events, tasks, workstreams, currentProjectId]);

  const handlePublishAndCopy = async () => {
    setPublishingICS(true);
    try {
      const ics = generateFullICS(events, tasks, workstreams);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const fileRef = storageRef(storage, `calendars/${currentProjectId}.ics`);
      await uploadBytes(fileRef, blob, { contentType: 'text/calendar', cacheControl: 'public, max-age=3600' });
      const url = await getDownloadURL(fileRef);
      const wc = url.replace(/^https:\/\//, 'webcal://');
      setWebcalUrl(wc);
      await navigator.clipboard.writeText(wc);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setPublishingICS(false);
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

  const handleSave = () => {
    if (!currentUser || !formTitle.trim()) return;
    const data = {
      title: formTitle.trim(),
      description: formDescription,
      startDate: formStartDate,
      endDate: formEndDate || formStartDate,
      allDay: formAllDay,
      workstreamId: formWorkstreamId || undefined,
      assigneeIds: formAssigneeIds,
      createdBy: currentUser.id,
      color: formColor,
      alertMinutes: formAlertMinutes,
    };
    if (selectedEvent) {
      updateEvent(selectedEvent.id, data);
    } else {
      createEvent(data);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!selectedEvent) return;
    deleteEvent(selectedEvent.id);
    setShowModal(false);
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

  const handleExportFullICS = () => {
    const ics = generateFullICS(events, tasks, workstreams);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agenda-ville-hauteur-enfant.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEventsForDay = (day: Date) =>
    events.filter(e => {
      try { return isSameDay(parseISO(e.startDate), day); } catch { return false; }
    });

  const getTasksForDay = (day: Date) =>
    tasks.filter(t => {
      try {
        if (!t.startDate) return false;
        const start = parseISO(t.startDate);
        const end = t.endDate ? parseISO(t.endDate) : start;
        return (isSameDay(start, day)) || (day >= start && day <= end);
      } catch { return false; }
    });

  // Abbreviated day names for mobile, full for desktop
  const dayNamesMobile = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const dayNamesDesktop = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Agenda</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm sm:text-base font-semibold text-gray-800 capitalize min-w-[120px] sm:min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => setShowOutlookModal(true)} className="flex items-center gap-1.5 border border-blue-300 text-blue-700 hover:bg-blue-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px]">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Sync Outlook</span>
          </button>
          <button onClick={handleExportFullICS} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px]">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter tout (.ics)</span>
          </button>
          <button onClick={() => openNewEvent()} className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors min-h-[44px]">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un événement</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {(
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNamesDesktop.map((d, idx) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2 sm:py-3 uppercase tracking-wider">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{dayNamesMobile[idx]}</span>
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const dayTasks = getTasksForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const todayDay = isToday(day);
              const selected = selectedDay && isSameDay(day, selectedDay);
              const totalItems = dayEvents.length + dayTasks.length;
              return (
                <div
                  key={i}
                  onClick={() => { setSelectedDay(day); openNewEvent(day); }}
                  className={`min-h-[60px] sm:min-h-[100px] border-b border-r border-gray-100 p-1 sm:p-2 cursor-pointer hover:bg-gray-50 transition-colors ${!inMonth ? 'bg-gray-50/50' : ''} ${selected ? 'bg-green-50' : ''}`}
                >
                  <div className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mb-0.5 sm:mb-1 ${todayDay ? 'bg-green-600 text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(event => (
                      <button key={event.id} onClick={e => { e.stopPropagation(); openEditEvent(event); }}
                        className="w-full text-left text-xs px-1 sm:px-1.5 py-0.5 rounded truncate text-white font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: event.color }}>
                        {event.title}
                      </button>
                    ))}
                    {dayTasks.slice(0, Math.max(0, 2 - dayEvents.length)).map(task => {
                      const ws = workstreams.find(w => w.id === task.workstreamId);
                      return (
                        <button key={task.id}
                          onClick={e => { e.stopPropagation(); setTaskMenu({ task, x: e.clientX, y: e.clientY }); }}
                          className="w-full text-left text-xs px-1 sm:px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-0.5 hover:opacity-80"
                          style={{ backgroundColor: TASK_COLOR + '22', color: TASK_COLOR }}>
                          <CheckSquare className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{ws ? `[${ws.name.slice(0,6)}] ` : ''}{task.title}</span>
                        </button>
                      );
                    })}
                    {totalItems > 2 && (
                      <p className="text-xs text-gray-400 pl-1">+{totalItems - 2}</p>
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Titre de l'événement"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 min-h-[44px]">
                <input
                  id="allday"
                  type="checkbox"
                  checked={formAllDay}
                  onChange={e => setFormAllDay(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 w-4 h-4"
                />
                <label htmlFor="allday" className="text-sm text-gray-700">Toute la journée</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                  <input
                    type={formAllDay ? 'date' : 'datetime-local'}
                    value={formAllDay ? formStartDate.slice(0, 10) : formStartDate}
                    onChange={e => setFormStartDate(formAllDay ? e.target.value + 'T00:00' : e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input
                    type={formAllDay ? 'date' : 'datetime-local'}
                    value={formAllDay ? formEndDate.slice(0, 10) : formEndDate}
                    onChange={e => setFormEndDate(formAllDay ? e.target.value + 'T23:59' : e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    <label key={u.id} className="flex items-center gap-1.5 text-sm min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={formAssigneeIds.includes(u.id)}
                        onChange={e => setFormAssigneeIds(prev =>
                          e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                        )}
                        className="rounded border-gray-300 text-green-600 w-4 h-4"
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                  <input
                    type="color"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="w-full h-11 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alerte</label>
                  <select
                    value={formAlertMinutes}
                    onChange={e => setFormAlertMinutes(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {ALERT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-4 border-t border-gray-100">
              <div>
                {selectedEvent && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                    <button
                      onClick={() => handleExportICS(selectedEvent)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Exporter (.ics)</span>
                      <span className="sm:hidden">.ics</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formTitle.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {selectedEvent ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outlook sync modal */}
      {showOutlookModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Synchroniser avec Outlook
              </h3>
              <button onClick={() => setShowOutlookModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Subscription — recommended */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-green-600" />
                  <h4 className="font-semibold text-green-800">Abonnement automatique (recommandé)</h4>
                </div>
                <p className="text-sm text-green-700">
                  Outlook se synchronise automatiquement — plus besoin de télécharger à chaque fois.
                </p>

                {webcalUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs text-green-700 font-medium">Lien webcal (copié automatiquement) :</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-2 py-1.5 truncate text-gray-700">{webcalUrl}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(webcalUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors min-h-[36px]"
                      >
                        {copied ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handlePublishAndCopy}
                    disabled={publishingICS}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
                  >
                    {publishingICS ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                    {publishingICS ? 'Publication...' : 'Générer le lien d\'abonnement'}
                  </button>
                )}

                {webcalUrl && (
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-1.5">Étapes Outlook (bureau) :</p>
                    <ol className="space-y-1 text-xs text-green-700">
                      <li className="flex gap-2"><span className="font-bold shrink-0">1.</span>Copiez le lien ci-dessus</li>
                      <li className="flex gap-2"><span className="font-bold shrink-0">2.</span>Dans Outlook : <strong>Ajouter un calendrier → À partir d'Internet</strong></li>
                      <li className="flex gap-2"><span className="font-bold shrink-0">3.</span>Collez l'URL → <strong>OK</strong></li>
                      <li className="flex gap-2"><span className="font-bold shrink-0">4.</span>Outlook rafraîchit automatiquement le calendrier (toutes les heures)</li>
                    </ol>
                    <p className="text-xs font-semibold text-green-800 mt-2 mb-1.5">Outlook.com / Microsoft 365 :</p>
                    <ol className="space-y-1 text-xs text-green-700">
                      <li className="flex gap-2"><span className="font-bold shrink-0">1.</span>Calendrier → <strong>Ajouter un calendrier → S'abonner depuis le web</strong></li>
                      <li className="flex gap-2"><span className="font-bold shrink-0">2.</span>Collez l'URL → <strong>Importer</strong></li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Manual download — fallback */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold text-gray-700 text-sm">Téléchargement manuel (ponctuel)</h4>
                <p className="text-xs text-gray-500">Import unique — à refaire à chaque mise à jour.</p>
                <button onClick={() => { handleExportFullICS(); }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors min-h-[44px]">
                  <Download className="w-4 h-4" />
                  Télécharger le fichier ICS
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Le calendrier contient tous les événements <strong>et toutes les tâches avec dates</strong>. Il est mis à jour automatiquement dès qu'un événement ou une tâche est modifié.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowOutlookModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Task context menu */}
      {taskMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTaskMenu(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[180px]"
            style={{ left: Math.min(taskMenu.x, window.innerWidth - 200), top: Math.min(taskMenu.y, window.innerHeight - 150) }}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800 truncate">{taskMenu.task.title}</p>
              <p className="text-xs text-gray-400">{workstreams.find(w => w.id === taskMenu.task.workstreamId)?.name}</p>
            </div>
            <button
              onClick={() => { setView({ type: 'workspace', workstreamId: taskMenu.task.workstreamId }); setTaskMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              <FolderOpen className="w-4 h-4 text-green-600" />
              Accéder à l'espace de travail
            </button>
            <button
              onClick={() => { setView({ type: 'workstream', id: taskMenu.task.workstreamId }); setTaskMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              <Pencil className="w-4 h-4 text-blue-600" />
              Modifier la tâche
            </button>
            <button
              onClick={() => setTaskMenu(null)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors min-h-[44px] border-t border-gray-100"
            >
              <X className="w-4 h-4" />
              Fermer
            </button>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: DEFAULT_COLOR }} />
          Événements
        </span>
        <span className="flex items-center gap-1">
          <CheckSquare className="w-3 h-3" style={{ color: TASK_COLOR }} />
          Tâches du projet
        </span>
      </div>
    </div>
  );
}
