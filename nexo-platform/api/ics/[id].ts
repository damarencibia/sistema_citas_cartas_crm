import { createClient } from '@supabase/supabase-js';
import { buildBookingIcsFromRow, type BookingIcsRow } from '../../src/modules/appointments/utils/ics';

export default async function handler(req: { query: Record<string, string | string[] | undefined> }, res: {
  status: (code: number) => { end: (body?: string) => void; send: (body: string) => void };
  setHeader: (name: string, value: string) => void;
}) {
  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).end('Missing booking id');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).end('Server misconfigured');

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'date, start_time, custom_duration_minutes, customer_name, notes, services(name, duration_minutes), employees(first_name, last_name), tenants(name, address, email, timezone)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return res.status(404).end('Booking not found');

  const ics = buildBookingIcsFromRow(data as BookingIcsRow);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    req.query.inline === '1' ? 'inline' : 'attachment; filename="cita.ics"',
  );
  res.status(200).send(ics);
}
