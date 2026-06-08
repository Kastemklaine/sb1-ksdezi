import { format } from 'date-fns';

export interface ICSEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  alertMinutes?: number;
  organizerEmail?: string;
  location?: string;
}

export function generateICS(event: ICSEvent): string {
  const toICSDate = (iso: string, allDay: boolean) => {
    const d = new Date(iso);
    if (allDay) return format(d, 'yyyyMMdd');
    return format(d, "yyyyMMdd'T'HHmmss");
  };

  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

  const now = format(new Date(), "yyyyMMdd'T'HHmmss");
  const uid = `${event.id}@ville-enfant.fr`;
  const startStr = toICSDate(event.startDate, event.allDay);
  const endStr = toICSDate(event.endDate, event.allDay);

  const dtStartProp = event.allDay ? `DTSTART;VALUE=DATE:${startStr}` : `DTSTART:${startStr}`;
  const dtEndProp = event.allDay ? `DTEND;VALUE=DATE:${endStr}` : `DTEND:${endStr}`;

  let alertBlock = '';
  if (event.alertMinutes && event.alertMinutes > 0) {
    alertBlock = [
      'BEGIN:VALARM',
      `TRIGGER:-PT${event.alertMinutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escape(event.title)}`,
      'END:VALARM',
    ].join('\r\n');
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Projet's ma Ville//FR",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtStartProp,
    dtEndProp,
    `SUMMARY:${escape(event.title)}`,
    event.description ? `DESCRIPTION:${escape(event.description)}` : '',
    event.location ? `LOCATION:${escape(event.location)}` : '',
    event.organizerEmail ? `ORGANIZER:mailto:${event.organizerEmail}` : '',
    alertBlock,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

export function downloadICS(event: ICSEvent) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildMailtoLink(opts: {
  to?: string;
  subject: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.body) params.set('body', opts.body);
  const base = `mailto:${opts.to ?? ''}`;
  params.set('subject', opts.subject);
  return `${base}?${params.toString()}`;
}
