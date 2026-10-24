# 22 — Notificaciones Garantizadas (escalado web-push → email)

## Objetivo

Documentar el sistema de entrega garantizada de notificaciones para el staff: diagnóstico de la pérdida de pushes en Android, el fix de prioridad (`Urgency`), el re-push de notificaciones no leídas y el escalado automático a email. También registra la decisión de aplazar la app Android (TWA/Capacitor).

---

## Alcance

Cubre:

- Diagnóstico técnico de por qué se pierden notificaciones Web Push en Android.
- Cabecera `Urgency: high` en `send-push`.
- Cron `escalate-notifications` con dos niveles de escalado (re-push y email).
- Edge Function `send-email-fallback` (Resend).
- Configuración por tenant (`tenants.config`).
- Guía de optimización de batería en la UI de notificaciones.

---

## Dependencias

- 21-push-notifications.md — infraestructura Web Push (VAPID, push_deliveries, cron de reintentos).
- 04-tech-stack.md — Resend como proveedor de email transaccional.

---

## Decisión Estratégica

**La app Android nativa (TWA/Capacitor + FCM) queda APLAZADA para una fase futura.**

Se prioriza maximizar el sistema de notificaciones de la PWA actual porque:

1. El backend es todo-Supabase y el canal Web Push ya funciona con reintentos y telemetría.
2. Los clientes (portal público) **no** reciben push — su canal es WhatsApp/email, que no depende del navegador.
3. El perfil de la app (gestión de formularios/tablas/agenda) no exige rendimiento nativo.
4. La garantía de entrega absoluta ("sí o sí") con cualquier tecnología de app se consigue con canales externos al dispositivo/email; un canal externo (email) resuelve el 100 % del problema a coste mínimo.

Todo el push del staff sigue siendo Web Push. La app nativa se revalidará cuando el producto lo justifique (doc 00, "Mejoras Futuras").

---

## Diagnóstico técnico (por qué se perdían notificaciones)

### 1. Falta de cabecera `Urgency` (RFC 8030)

Sin la cabecera `Urgency`, el push service (FCM/Chrome) entrega el mensaje con **prioridad normal**. Android (Doze/mantenimiento en background) puede retrasar o descartar esos mensajes cuando el dispositivo lleva minutos en reposo — exactamente el síntoma observado: "se pierden cuando el navegador lleva un tiempo en segundo plano".

**Fix:** `send-push` ahora envía `'Urgency': 'high'` en cada POST. FCM despierta de forma inmediata el proceso del navegador vía Google Play Services.

### 2. Telemetría ciega ante la pérdida (Web Push no tiene acuse de recibo)

`push_deliveries` marca el job como `done` cuando el push service **acepta** el mensaje (HTTP 2xx) — no cuando el dispositivo lo mostró. Si el proceso del navegador estaba muerto, FCM responde 200 igualmente y el job se cierra sin que la notificación haya aparecido. El cron `retry-push-deliveries` no puede detectar esto: desde el servidor todo "llegó bien".

### 3. Task killers de fabricante (no solventable en web)

MIUI, Huawei, etc. pueden matar el proceso de Chrome/Play Services y bloquear incluso el wake de prioridad alta si el usuario no eximió el navegador de la optimización de batería. La única compensación real es un canal independiente del navegador.

---

## Arquitectura del sistema de garantía

```
create_notification()
  └─ send_push_notification() → job en push_deliveries (push inmediato)
       └─ send-push (ahora con 'Urgency: high')

cron "escalate-notifications" (cada 5 min, desfasado 3 min del retry cron)
  Nivel A (T+~10 min): ¿is_read = false?
    └─ re-push al mismo endpoint (renotify:true + tag → reemplaza, no duplica)
       y marca escalation_level = 1
  Nivel B (T+~30 min): ¿sigue is_read = false y escalation_level = 1?
    └─ POST a Edge Function send-email-fallback
       └─ email vía Resend al email del staff
          └─ si el envío funcionó, marca escalation_level = 2
```

- Cuando el usuario abre la app y lee la notificación (`is_read = true`), el escalado se detiene.
- El nivel B no se marca desde el cron: lo marca la propia Edge Function tras enviar el email con éxito. Si la función falla, la fila sigue en `escalation_level = 1` y el siguiente tick del cron reintenta.
- Escalado solo para tipos críticos: `booking_created`, `booking_pending_approval`, `waitlist_offer`.
- Máximo un re-push y un email por notificación (sin bucles de spam).

---

## Base de datos (migración de escalado)

- `notifications.escalation_level SMALLINT NOT NULL DEFAULT 0`
  - `0` = sin escalado
  - `1` = re-push enviado (o no hay suscripciones push; va directo al camino del email)
  - `2` = email de respaldo enviado
- Configuración por tenant en `tenants.config` (JSONB, con valores por defecto si no existen):

| Clave                       | Valor por defecto | Descripción                                  |
| --------------------------- | ----------------- | -------------------------------------------- |
| `escalation_enabled`        | `true`            | Activar/desactivar el escalado               |
| `push_repush_minutes`       | `10`              | Minutos sin leer antes del re-push           |
| `push_email_minutes`        | `30`              | Minutos desde la creación antes del email    |

- Cron: `escalate-notifications` — `3-58/5 * * * *` (cada 5 min, desfasado del cron de reintentos `*/5`).

---

## Edge Functions

### `send-push` (modificada)

- Añade la cabecera `'Urgency': 'high'` al POST al endpoint.
- El resto del flujo (`delivery_id`, reintentos, reporte a `push_deliveries`) no cambia.

### `send-email-fallback` (nueva)

- Auth: mismo header `x-push-secret` (comparte `PUSH_SECRET` con send-push).
- Payload: `{ "notification_id": "<uuid>" }`.
- Flujo:
  1. Lee la notificación y el `users` (email, nombre) del destinatario vía service role.
  2. Guardas: si no existe, está `is_read` o `escalation_level != 1` → respuesta sin envío (idempotente).
  3. Envía el email con Resend (`RESEND_API_KEY`) y luego marca `escalation_level = 2`.
- Secrets requeridos: `PUSH_SECRET`, `RESEND_API_KEY`, `APP_URL` (los de Supabase estándar se inyectan solos).
- **Remitente (`EMAIL_FROM`, temporal):** actualmente usa `onboarding@resend.dev` (secret `EMAIL_FROM` o default en el código). Resend solo permite remitentes de test hacia **la dirección de la propia cuenta de Resend**. Hasta que exista un dominio propio verificado, los emails de respaldo solo llegarán a esa cuenta — el resto seguirán en `escalation_level = 1` y reintentando (sin pérdida de datos; el push y el centro de notificaciones siguen siendo el canal principal).

### Estado de la verificación end-to-end (24/10/2026)

- Migración aplicada, cron activo y verificado con ticks automáticos.
- Prueba real ejecutada: notificación creada → re-push (nivel A) → email de respaldo enviado con éxito (`email_id 01a17037-c5cf-74f5-996c-acbf3e925c73`) → `escalation_level = 2`. Pipeline completo operativo.
- `APP_URL` corregida a `https://nexo-marketplace-dun.vercel.app` (el placeholder `nexoplatform.app` no existe en DNS y rompía los enlaces de los emails de lista de espera).
- `[PRUEBA]` de la verificación ya eliminada de la BD.

### Pendiente para producción (canal email real)

1. Conseguir un dominio propio registrado (el placeholder `nexoplatform.app` no está registrado) o subdominio de un dominio existente.
2. Verificarlo en Resend (Domains → Add Domain → añadir registros DNS DKIM/SPF).
3. Fijar `npx supabase secrets set EMAIL_FROM="Nexo Platform <noreply@<dominio>>" --project-ref yrtzumwegcbjnaxdncps` y redeployar sin cambiar código.
4. `send-waitlist-notification` envía a clientes arbitrarios: seguirá rechazada por Resend hasta el paso 2 (como desde siempre: `RESEND_API_KEY` nunca estuvo configurada antes de hoy).

### Despliegue

```bash
npx supabase functions deploy send-push --project-ref yrtzumwegcbjnaxdncps --no-verify-jwt
npx supabase functions deploy send-email-fallback --project-ref yrtzumwegcbjnaxdncps --no-verify-jwt

npx supabase secrets set RESEND_API_KEY=<clave> --project-ref yrtzumwegcbjnaxdncps
npx supabase secrets set APP_URL=https://nexo-marketplace-dun.vercel.app --project-ref yrtzumwegcbjnaxdncps
```

### Aplicar la migración

```bash
npx supabase db push
# o aplicar el archivo directamente:
# supabase/migrations/20261024120000_notification_escalation.sql
```

---

## Verificación

```bash
# 1. Test del secreto de la nueva función (no envía nada si la notificación no existe)
curl -X POST https://yrtzumwegcbjnaxdncps.functions.supabase.co/send-email-fallback \
  -H "Content-Type: application/json" \
  -H "x-push-secret: <PUSH_SECRET de la BD>" \
  -d '{"notification_id":"00000000-0000-0000-0000-000000000000"}'
# 200 → {"sent":false,...} nada que enviar; 401 = secreto mal alineado

# 2. Comprobar el cabecera Urgency en logs de /send-push tras una reserva de prueba

# 3. Simular pérdida: crear reserva, no abrir la app, esperar ~10 min →
#    re-push visible; esperar ~30 min → email de respaldo con escalation_level=2 en BD

# 4. Ver Jobs y niveles:
#    select id, is_read, escalation_level, created_at from notifications
#      where created_at > now() - interval '1 day'
#      order by created_at desc;
```

---

## Guía de usuario (UI)

En el cajón de notificaciones (`NotificationDrawer.vue`), con el push activado en Android, se muestra un aviso (descartable) con la recomendación: instalar la PWA y eximir Chrome de la optimización de batería (Ajustes → Batería → Optimización de batería de la app). Es la única mitigación posible en web para los task killers de fabricante.

---

## Limitaciones y Fase Futura

- Web Push seguirá siendo "mejor esfuerzo": la prioridad alta y el re-push mejoran mucho la entrega, pero no la **garantizan**; esa garantía la aporta el canal email.
- Si en el futuro se activa la app Android (Capacitor + FCM), este sistema de escalado se conserva: FCM nativo sustituye al re-push como Nivel A y el email queda como Nivel B.
- En dispositivos offline > 24 h el push caduca (TTL 86400); el email no depende de TTL.

---

_Relacionado: 21-push-notifications.md, 04-tech-stack.md, 00-project-vision.md_
