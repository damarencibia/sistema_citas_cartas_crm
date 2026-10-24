// Edge Function: send-email-fallback
// Canal de respaldo garantizado del sistema de notificaciones.
// Cuando una notificación crítica lleva >= N minutos sin leerse,
// el cron `escalate-notifications` (notification_escalation.sql)
// invoca esta función para enviar un email vía Resend.
//
// Auth: mismo header x-push-secret que send-push (secreto compartido).
// Idempotencia: la función marca escalation_level = 2 en la
// notificación tras enviar el email con éxito; si falla antes,
// la fila queda en nivel 1 y el cron reintenta.
//
// Secrets requeridos:
//   PUSH_SECRET      — secreto compartido con el trigger SQL
//   RESEND_API_KEY   — clave de API de Resend
//   APP_URL          — URL base de la app (link del botón)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PUSH_SECRET = Deno.env.get('PUSH_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://nexoplatform.app';
// Remitente de email. TEMPORAL: onboarding@resend.dev solo funciona
// hacia la dirección de la propia cuenta de Resend. Cuando se tenga
// dominio propio verificado en Resend, fijar el secret EMAIL_FROM a
// `Nexo Platform <noreply@<dominio>>` y redeployear sin tocar código.
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'Nexo Platform <onboarding@resend.dev>';

function buildNotificationUrl(data: Record<string, unknown>): string {
  const type = typeof data?.notification_type === 'string' ? data.notification_type : '';
  if (type === 'booking_created' || type === 'booking_pending_approval' || type === 'waitlist_offer') {
    return `${APP_URL}/appointments/bookings`;
  }
  return `${APP_URL}/`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!PUSH_SECRET || req.headers.get('x-push-secret') !== PUSH_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const payload = await req.json();
    const notificationId: string | undefined = payload?.notification_id;
    if (!notificationId) {
      return new Response(
        JSON.stringify({ error: 'notification_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, title, body, data, is_read, escalation_level, recipient_user_id, tenant_id')
      .eq('id', notificationId)
      .maybeSingle();

    if (notifError) {
      return new Response(
        JSON.stringify({ error: notifError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Nada que enviar: notificación inexistente, ya leída o ya escalada.
    if (
      !notification ||
      notification.is_read ||
      notification.escalation_level !== 1
    ) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'nada que escalar (leída, inexistente o nivel != 1)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', notification.recipient_user_id)
      .single();

    if (!user?.email) {
      // Sin email disponible: cerrar el escalado para no reintentar eternamente.
      await supabase.from('notifications').update({ escalation_level: 2 }).eq('id', notification.id);
      return new Response(
        JSON.stringify({ sent: false, reason: 'email no disponible' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!RESEND_API_KEY) {
      console.warn('send-email-fallback: RESEND_API_KEY no configurada. Email no enviado.');
      return new Response(
        JSON.stringify({ sent: false, reason: 'email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const notifData = (notification.data ?? {}) as Record<string, unknown>;
    const targetUrl = buildNotificationUrl(notifData);

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', notification.tenant_id)
      .single();
    const businessName = (tenant as { name?: string } | null)?.name ?? 'Nexo Platform';
    const slug = (tenant as { slug?: string } | null)?.slug ?? 'nexo';

    const firstName = escapeHtml(user.first_name ?? '');
    const title = escapeHtml(notification.title);
    const body = escapeHtml(notification.body);

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
      <h1 style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">Copia de seguridad de notificación</h1>
      <p style="margin:8px 0 0;color:#a0aec0;font-size:13px;">${escapeHtml(businessName)}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">
        Hola <strong>${firstName}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
        Te escribimos porque no hemos podido confirmar que la siguiente notificación llegó a tu dispositivo:
      </p>

      <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#111827;font-size:15px;font-weight:600;">${title}</p>
        <p style="margin:0;color:#6b7280;font-size:14px;">${body}</p>
      </div>

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${targetUrl}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-size:15px;font-weight:600;">
          Abrir Nexo
        </a>
      </div>

      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
        Si ya revisaste esto en la app, puedes ignorar este email. No se enviarán más copias de esta notificación.
      </p>
    </div>
  </div>
</body>
</html>`;

    // Remitente con dominio raíz (nexoplatform.app), el negocio solo
    // aparece como nombre visible. Un subdominio por slug exigiría
    // verificar cada uno en Resend.
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [user.email],
        subject: `${notification.title} — ${businessName}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('send-email-fallback: Resend error:', errorText);
      // Sin marcar el nivel: el cron reintentará en el siguiente tick.
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Solo marcar nivel 2 tras un envío real; así el cron no repite más veces.
    await supabase.from('notifications').update({ escalation_level: 2 }).eq('id', notification.id);

    const emailResult = await emailResponse.json();
    console.log(`send-email-fallback: email enviado notification=${notification.id} email_id=${emailResult.id}`);
    return new Response(
      JSON.stringify({ sent: true, email_id: emailResult.id ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-email-fallback error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
