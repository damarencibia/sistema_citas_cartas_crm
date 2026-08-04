import { describe, it, expect } from 'vitest';
import { buildBookingIcs, buildBookingIcsFromRow, buildGoogleCalendarUrl, wallClockToUTC } from '@/modules/appointments/utils/ics';
import { uuid } from '@/shared/utils/helpers';

const baseParams = {
  summary: 'Corte de cabello, barba — Diana',
  description: 'Cita: Corte de cabello\nEspecialista: Diana',
  location: 'Av. Reforma 123',
  organizerName: 'Mora Barber Studio',
  organizerEmail: 'admin@nexo.com',
  start: new Date('2026-09-01T09:00:00Z'),
  end: new Date('2026-09-01T09:30:00Z'),
  timezone: 'America/Mexico_City',
};

describe('buildBookingIcs', () => {
  it('genera un VCALENDAR con DTSTART/DTEND UTC, VTIMEZONE, VALARM y SUMMARY escapado', () => {
    const ics = buildBookingIcs(baseParams);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    // 09:00 en America/Mexico_City (UTC-6) = 15:00Z
    expect(ics).toContain('DTSTART:20260901T150000Z');
    expect(ics).toContain('DTEND:20260901T153000Z');
    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(ics).toContain('TZID:America/Mexico_City');
    expect(ics).toContain('TZOFFSETFROM:-0600');
    expect(ics).toContain('TZOFFSETTO:-0600');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT30M');
    expect(ics).toContain('SUMMARY:Corte de cabello\\, barba — Diana');
    expect(ics).toContain('LOCATION:Av. Reforma 123');
    expect(ics).toContain('ORGANIZER;CN=Mora Barber Studio:mailto:admin@nexo.com');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('no lanza excepción con fechas válidas con segundos en la hora', () => {
    const start = new Date('2026-09-01T09:00:00Z');
    const end = new Date('2026-09-01T09:30:00Z');
    expect(() => buildBookingIcs({ ...baseParams, start, end })).not.toThrow();
  });
});

describe('buildGoogleCalendarUrl', () => {
  it('genera un enlace con action=TEMPLATE y fechas UTC reales', () => {
    const url = buildGoogleCalendarUrl(baseParams);
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Corte de cabello, barba — Diana');
    // 09:00 en America/Mexico_City (UTC-6) = 15:00Z
    expect(parsed.searchParams.get('dates')).toBe('20260901T150000Z/20260901T153000Z');
  });

  it('devuelve cadena vacía si start o end son fechas inválidas', () => {
    const url = buildGoogleCalendarUrl({
      ...baseParams,
      start: new Date('invalid'),
      end: new Date('2026-09-01T09:30:00Z'),
    });
    expect(url).toBe('');
  });
});

describe('wallClockToUTC', () => {
  it('convierte la hora de pared del carrier al instante UTC real', () => {
    const utc = wallClockToUTC(baseParams.start, 'America/Mexico_City');
    expect(utc.toISOString()).toBe('2026-09-01T15:00:00.000Z');
  });

  it('round-trip: al volver a formatear en la misma zona se conserva la hora local', () => {
    const utc = wallClockToUTC(baseParams.start, 'America/Mexico_City');
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(utc).map((p) => [p.type, p.value]),
    );
    expect(`${parts.hour}:${parts.minute}`).toBe('09:00');
  });

  it('devuelve la misma fecha inválida sin lanzar', () => {
    const invalid = new Date('invalid');
    expect(wallClockToUTC(invalid, 'America/Mexico_City')).toBe(invalid);
  });
});

describe('buildBookingIcsFromRow', () => {
  const row = {
    date: '2026-09-01',
    start_time: '09:00:00',
    custom_duration_minutes: null,
    customer_name: 'Ana Pérez',
    notes: 'Prefiere barbero hombre',
    services: { name: 'Corte de cabello', duration_minutes: 30 },
    employees: { first_name: 'Diana', last_name: 'Mora' },
    tenants: { name: 'Mora Barber Studio', address: 'Av. Reforma 123', email: 'admin@nexo.com', timezone: 'America/Mexico_City' },
  };

  it('genera el evento con summary, descripción y UTC correctos', () => {
    const ics = buildBookingIcsFromRow(row);

    expect(ics).toContain('DTSTART:20260901T150000Z');
    expect(ics).toContain('DTEND:20260901T153000Z');
    expect(ics).toContain('SUMMARY:Corte de cabello — Diana');
    expect(ics).toContain('LOCATION:Av. Reforma 123');
    expect(ics).toContain('ORGANIZER;CN=Mora Barber Studio:mailto:admin@nexo.com');
    expect(ics).toContain('Especialista: Diana');
    expect(ics).toContain('Cliente: Ana Pérez');
  });

  it('respeta custom_duration_minutes y usa zona horaria por defecto si no hay tenant', () => {
    const ics = buildBookingIcsFromRow({ ...row, custom_duration_minutes: 60, tenants: null });

    expect(ics).toContain('DTSTART:20260901T150000Z');
    expect(ics).toContain('DTEND:20260901T160000Z');
    expect(ics).toContain('TZID:America/Mexico_City');
  });
});

describe('uuid', () => {
  it('genera un UUID v4 sin crypto.randomUUID (fallback)', () => {
    const original = (globalThis as { crypto?: Crypto }).crypto?.randomUUID;
    try {
      Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
      const id = uuid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
