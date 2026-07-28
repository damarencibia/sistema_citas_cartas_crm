import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const appUrl = Deno.env.get('APP_URL') || 'https://nexoplatform.app';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, tenant_id } = await req.json();

    if (!token || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'token and tenant_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: entry, error: entryError } = await supabase
      .from('waitlist')
      .select('*, service:service_id(name, duration_minutes), employee:employee_id(first_name, last_name)')
      .eq('offer_token', token)
      .single();

    if (entryError || !entry) {
      return new Response(
        JSON.stringify({ error: 'Entry not found or already processed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (entry.status !== 'notified' || !entry.offer_expires_at) {
      return new Response(
        JSON.stringify({ error: 'Offer is no longer active', status: entry.status }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (new Date(entry.offer_expires_at) < new Date()) {
      await supabase
        .from('waitlist')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', entry.id);

      return new Response(
        JSON.stringify({ error: 'Offer has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', tenant_id)
      .single();

    const serviceName = (entry.service as any)?.name ?? 'Servicio';
    const durationMin = (entry.service as any)?.duration_minutes ?? 30;
    const employeeName = entry.employee
      ? `${(entry.employee as any).first_name} ${(entry.employee as any).last_name}`
      : 'Cualquier disponible';
    const businessName = tenant?.name ?? 'NexoPlatform';
    const slug = tenant?.slug ?? 'nexo';

    const offerDate = new Date(entry.offered_slot_date + 'T00:00:00');
    const formattedDate = offerDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = entry.offered_slot_time?.slice(0, 5) ?? '';
    const expiresAt = new Date(entry.offer_expires_at);
    const minutesLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60000));

    const acceptUrl = `${appUrl}/${slug}/waitlist/accept/${token}`;
    const declineUrl = `${appUrl}/${slug}/waitlist/decline/${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="background:#1a1a2e;padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">Espacio disponible</h1>
      <p style="margin:8px 0 0;color:#a0aec0;font-size:14px;">${businessName}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">
        Hola <strong>${entry.customer_name}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
        Se ha liberado un espacio para <strong>${serviceName}</strong> que coincide con tu preferencia.
        <strong>Tienes ${minutesLeft} minutos para confirmar</strong> antes de que se ofrezca a otra persona.
      </p>

      <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Servicio</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;text-align:right;">${serviceName} (${durationMin} min)</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Profesional</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;text-align:right;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Fecha</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;text-align:right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Hora</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;text-align:right;">${formattedTime}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${acceptUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-size:15px;font-weight:600;">
          Reservar ahora
        </a>
      </div>

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${declineUrl}" style="color:#6b7280;font-size:13px;text-decoration:underline;">
          No me interesa, pasar al siguiente
        </a>
      </div>

      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
        Esta oferta expira en ${minutesLeft} minutos. Si no confirmas a tiempo, se ofrecerá automáticamente a la siguiente persona en la fila.
      </p>
    </div>
  </div>
</body>
</html>`;

    if (resendApiKey) {
      const emailPayload = {
        from: `${businessName} <noreply@${slug}.nexoplatform.app>`,
        to: [entry.customer_email],
        subject: `Tienes un espacio disponible para ${serviceName} — ${minutesLeft} min para confirmar`,
        html,
      };

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Resend error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: errorText }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const emailResult = await emailResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          entry_id: entry.id,
          email_id: emailResult.id,
          offer_expires_at: entry.offer_expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.warn('RESEND_API_KEY not configured. Email not sent.');
    return new Response(
      JSON.stringify({
        success: true,
        entry_id: entry.id,
        email_id: null,
        offer_expires_at: entry.offer_expires_at,
        warning: 'Email service not configured',
      }),
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
