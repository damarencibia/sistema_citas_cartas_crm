import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, config')
      .is('deleted_at', null)
      .eq('status', 'active');

    if (tenantsError) throw tenantsError;

    let totalStarted = 0;
    const results: { tenant_id: string; started: number }[] = [];

    for (const tenant of tenants ?? []) {
      const config = (tenant.config as any)?.appointments;
      if (!config?.auto_start) continue;

      const graceMinutes = config.no_show_policy?.grace_period_minutes ?? 15;

      const cutoffTime = new Date(now.getTime() - graceMinutes * 60 * 1000);
      const cutoffTimeStr = `${String(cutoffTime.getHours()).padStart(2, '0')}:${String(cutoffTime.getMinutes()).padStart(2, '0')}:00`;

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, start_time')
        .eq('tenant_id', tenant.id)
        .eq('date', today)
        .eq('status', 'confirmed')
        .lte('start_time', cutoffTimeStr)
        .is('deleted_at', null);

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) continue;

      const bookingIds = bookings.map((b) => b.id);

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'in_progress',
          updated_at: now.toISOString(),
        })
        .in('id', bookingIds);

      if (updateError) throw updateError;

      const logEntries = bookingIds.map((bookingId) => ({
        tenant_id: tenant.id,
        booking_id: bookingId,
        old_status: 'confirmed',
        new_status: 'in_progress',
        changed_by: 'system',
        changed_by_name: 'Auto-start',
        reason: `Auto-started after ${graceMinutes} min grace period`,
      }));

      const { error: logError } = await supabase
        .from('booking_status_log')
        .insert(logEntries);

      if (logError) throw logError;

      totalStarted += bookings.length;
      results.push({ tenant_id: tenant.id, started: bookings.length });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_started: totalStarted,
        tenants_processed: results.length,
        details: results,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
