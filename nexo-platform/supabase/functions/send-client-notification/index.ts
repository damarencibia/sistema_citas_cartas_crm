import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const metaToken = Deno.env.get('META_ACCESS_TOKEN');
const metaPhoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID');

const GRAPH_API = `https://graph.facebook.com/v21.0/${metaPhoneNumberId}/messages`;

const TEMPLATE_NAME: Record<string, string> = {
  booking_confirmed: 'booking_confirmed',
  booking_cancelled: 'booking_cancelled',
  booking_rescheduled: 'booking_rescheduled',
};

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('52')) return digits;
  if (digits.length === 10) return '52' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '52' + digits.slice(1);
  return digits.length >= 10 ? digits : null;
}

function formatDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function templateComponents(event: string, params: Record<string, string>) {
  const body = [
    params.service,
    params.date,
    params.time,
  ];
  if (event === 'booking_confirmed') {
    body.push(params.business);
  }
  return [{
    type: 'body',
    parameters: body.filter(Boolean).map((text) => ({ type: 'text', text })),
  }];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { event, booking_id } = await req.json();

    if (!event || !booking_id) {
      return new Response(
        JSON.stringify({ error: 'event and booking_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const templateName = TEMPLATE_NAME[event];
    if (!templateName) {
      return new Response(
        JSON.stringify({ error: `Unsupported event: ${event}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!metaToken || !metaPhoneNumberId) {
      console.warn('META_ACCESS_TOKEN / META_PHONE_NUMBER_ID not configured.');
      return new Response(
        JSON.stringify({
          success: true,
          booking_id,
          warning: 'WhatsApp service not configured',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, service:service_id(name), employee:employee_id(first_name, last_name)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!booking.whatsapp_consent) {
      return new Response(
        JSON.stringify({ success: true, booking_id, skipped: 'no whatsapp_consent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const to = normalizePhone(booking.customer_phone);
    if (!to) {
      return new Response(
        JSON.stringify({ success: true, booking_id, skipped: 'invalid customer_phone' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', booking.tenant_id)
      .single();

    const serviceName = (booking.service as any)?.name ?? 'Servicio';
    const businessName = tenant?.name ?? 'NexoPlatform';

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es_MX' },
        components: templateComponents(event, {
          service: serviceName,
          date: formatDate(booking.date),
          time: booking.start_time?.slice(0, 5) ?? '',
          business: businessName,
        }),
      },
    };

    const response = await fetch(GRAPH_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${metaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('WhatsApp error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: result }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, booking_id, whatsapp_message_id: result?.messages?.[0]?.id ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
