import { uuid } from '../../../shared/utils/helpers';

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
  if (Number.isNaN(date.getTime())) return '';
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

export function wallClockToUTC(carrier: Date, timeZone: string): Date {
  if (Number.isNaN(carrier.getTime())) return carrier;
  const wall = new Date(
    Date.UTC(
      carrier.getUTCFullYear(),
      carrier.getUTCMonth(),
      carrier.getUTCDate(),
      carrier.getUTCHours(),
      carrier.getUTCMinutes(),
      carrier.getUTCSeconds(),
    ),
  );
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
  const parts = Object.fromEntries(dtf.formatToParts(wall).map((p) => [p.type, p.value]));
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const wallInTz = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMinutes = (wallInTz - wall.getTime()) / 60000;
  return new Date(wall.getTime() - offsetMinutes * 60000);
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
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
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

function buildVTimezone(timeZone: string, date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const offset = tzOffsetMinutes(date, timeZone);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const utcOffset = `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
  const localDate = formatIcsDate(new Date(date.getTime() + offset * 60000));
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${timeZone}`,
    'BEGIN:STANDARD',
    `DTSTART:${localDate}T000000`,
    `TZOFFSETFROM:${utcOffset}`,
    `TZOFFSETTO:${utcOffset}`,
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n');
}

export function buildBookingIcs(params: BookingEventParams): string {
  const uid = params.uid ?? `${uuid()}@nexo.booking`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const startUtc = wallClockToUTC(params.start, params.timezone);
  const endUtc = wallClockToUTC(params.end, params.timezone);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nexo Platform//Booking//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const vtimezone = buildVTimezone(params.timezone, params.start);
  if (vtimezone) lines.push(vtimezone);

  lines.push(
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatIcsDate(startUtc)}Z`,
    `DTEND:${formatIcsDate(endUtc)}Z`,
    `SUMMARY:${escapeIcs(params.summary)}`,
    `DESCRIPTION:${escapeIcs(params.description)}`,
  );

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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareIcs(blob: Blob, title: string, text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  const file = new File([blob], 'cita.ics', { type: 'text/calendar;charset=utf-8' });
  if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title, text });
    return true;
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return true;
    return false;
  }
}

export function buildGoogleCalendarUrl(params: BookingEventParams): string {
  if (Number.isNaN(params.start.getTime()) || Number.isNaN(params.end.getTime())) return '';
  const utc = (d: Date) => wallClockToUTC(d, params.timezone).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const search = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.summary,
    dates: `${utc(params.start)}/${utc(params.end)}`,
    details: params.description,
  });
  if (params.location) search.set('location', params.location);
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}

export interface BookingIcsRow {
  date: string;
  start_time: string;
  custom_duration_minutes?: number | null;
  customer_name?: string | null;
  notes?: string | null;
  services?: { name?: string; duration_minutes?: number } | null;
  employees?: { first_name?: string; last_name?: string } | null;
  tenants?: { name?: string; address?: string; email?: string; timezone?: string | null } | null;
}

export function buildBookingIcsFromRow(row: BookingIcsRow): string {
  const startTime = row.start_time.slice(0, 5);
  const start = new Date(`${row.date}T${startTime}:00Z`);
  const duration = row.custom_duration_minutes ?? row.services?.duration_minutes ?? 30;
  const end = new Date(start.getTime() + duration * 60000);
  const serviceName = row.services?.name ?? 'Cita';
  const workerName = `${row.employees?.first_name ?? ''} ${row.employees?.last_name ?? ''}`.trim();
  const description = [
    `Cita: ${serviceName}`,
    workerName ? `Especialista: ${workerName}` : '',
    row.customer_name ? `Cliente: ${row.customer_name}` : '',
    row.notes ? `Notas: ${row.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return buildBookingIcs({
    summary: serviceName + (workerName ? ` — ${workerName}` : ''),
    description,
    location: row.tenants?.address || row.tenants?.name || undefined,
    organizerName: row.tenants?.name,
    organizerEmail: row.tenants?.email,
    start,
    end,
    timezone: row.tenants?.timezone ?? 'America/Mexico_City',
  });
}
