export interface BookingEventParams {
  summary: string;
  description: string;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  start: Date;
  end: Date;
  timezone: string;
  uid?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatIcsDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

export function zonedDateToUTC(date: Date, timeZone: string): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second),
    ),
  );
}

export function buildBookingIcs(params: BookingEventParams): string {
  const uid = params.uid ?? `${crypto.randomUUID()}@nexo.booking`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nexo Platform//Booking//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${params.timezone}:${formatIcsDate(params.start)}`,
    `DTEND;TZID=${params.timezone}:${formatIcsDate(params.end)}`,
    `SUMMARY:${escapeIcs(params.summary)}`,
    `DESCRIPTION:${escapeIcs(params.description)}`,
  ];

  if (params.location) lines.push(`LOCATION:${escapeIcs(params.location)}`);
  if (params.organizerName && params.organizerEmail) {
    lines.push(`ORGANIZER;CN=${escapeIcs(params.organizerName)}:mailto:${params.organizerEmail}`);
  }

  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de tu cita',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return lines.join('\r\n') + '\r\n';
}

export function getIcsBlob(ics: string): Blob {
  return new Blob([ics], { type: 'text/calendar;charset=utf-8' });
}

export function downloadIcs(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function shareIcs(blob: Blob, title: string, text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  const file = new File([blob], 'cita.ics', { type: 'text/calendar;charset=utf-8' });
  if (!navigator.canShare({ files: [file] })) return false;
  await navigator.share({ files: [file], title, text });
  return true;
}

export function buildGoogleCalendarUrl(params: BookingEventParams): string {
  const utc = (d: Date) => zonedDateToUTC(d, params.timezone).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const search = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.summary,
    dates: `${utc(params.start)}/${utc(params.end)}`,
    details: params.description,
  });
  if (params.location) search.set('location', params.location);
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}
