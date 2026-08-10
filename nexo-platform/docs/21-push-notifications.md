# 21 — Notificaciones Push

## Objetivo

Documentar el sistema de notificaciones push (Web Push) de Nexo Platform: arquitectura, flujo de entrega, reintentos, telemetría, limitaciones por plataforma y guía de instalación de la PWA.

---

## Alcance

Cubre el ciclo completo de una notificación push desde que se crea la reserva hasta que llega al dispositivo del staff, incluyendo la Edge Function `send-push`, la tabla `push_deliveries`, el cron de reintentos, y las instrucciones para instalar la aplicación.

---

## Dependencias

- 04-tech-stack.md — Vite PWA, Supabase (pg_net, pg_cron), Edge Functions.
- 50-notificaciones (000050), 000053, 000054, 000059 — migraciones del sistema.

---

## Arquitectura

```
Reserva creada (trigger trg_booking_notification)
  └─ create_notification()          → INSERT en notifications
       └─ send_push_notification()  → INSERT job en push_deliveries (pending)
            └─ net.http_post()       → Edge Function send-push (x-push-secret)
                 └─ cifra RFC 8291 + VAPID RFC 8292
                      └─ POST al endpoint del navegador (FCM / APNs / etc.)
                           └─ reporta resultado a push_deliveries
```

- El SW (`sw.ts`) recibe el evento `push` y muestra la notificación del sistema, **aunque la app esté cerrada**.
- Si la app está abierta, además la fila de `notifications` llega por realtime al centro de notificaciones.

### Quién recibe push

Solo el **staff autenticado** (owner/admin/empleados con cuenta en `users`). El portal público (clientes en `customers`) **no** recibe push; sus avisos son WhatsApp/email/enlace de Mis Reservas.

### Estado remoto

- Proyecto: `yrtzumwegcbjnaxdncps`
- Edge Function: `send-push` (`verify_jwt: false`, se autentica con `x-push-secret`)
- Secretos de la función: `PUSH_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `APP_URL`
- `PUSH_SECRET` y la URL de la función están **hardcodeados** en `send_push_notification` (migración 000059) — deben coincidir con los secrets de la función.
- Cron: `retry-push-deliveries` (cada 5 min, max 5 intentos, backoff).

---

## Reintentos y telemetría (`push_deliveries`)

| Campo           | Descripción                                    |
| --------------- | ---------------------------------------------- |
| `status`        | `pending` / `done` / `failed`                  |
| `attempts`      | Intentos realizados (hasta 5)                  |
| `sent_count`    | Endpoints que aceptaron el push                |
| `deleted_count` | Endpoints 404/410 eliminados de la suscripción |
| `skipped_count` | Endpoints con error transitorio                |
| `last_error`    | Último error registrado                        |
| `next_retry_at` | Próximo reintento (backoff: intento × 5 min)   |

Comportamiento:

- La Edge Function reporta el resultado a la BD tras cada envío.
- Si hubo fallos transitorios y quedan intentos → el job vuelve a `pending` con `next_retry_at`.
- El cron `retry_push_deliveries()` redispara los jobs `pending` con `next_retry_at <= now()`.
- Tras 5 intentos fallidos → `failed`. Si no quedan suscripciones → `done`.
- Jobs con más de 30 días se purgan automáticamente.

### Verificación del canal

```bash
# Test del secreto (no envía nada; recipient inexistente)
curl -X POST https://yrtzumwegcbjnaxdncps.functions.supabase.co/send-push \
  -H "Content-Type: application/json" \
  -H "x-push-secret: <PUSH_SECRET de la BD>" \
  -d '{"recipient_user_id":"00000000-0000-0000-0000-000000000000"}'
# 200 → {"sent":0,"deleted":0,"skipped":0} = secreto correcto; 401 = alinear secret
```

### Despliegue de la función

```bash
npx supabase login --token <SUPABASE_ACCESS_TOKEN>
npx supabase functions deploy send-push --project-ref yrtzumwegcbjnaxdncps --no-verify-jwt
```

> Usar `--no-verify-jwt` para conservar `verify_jwt: false` (pg_net llama sin JWT).

---

## Limitaciones por plataforma

| Plataforma                          | Requisito para recibir push                     | Notas |
| ----------------------------------- | ----------------------------------------------- | ----- |
| Android (Chrome/Edge)               | Visitar la app, aceptar permiso, SW registrado  | Instalar la PWA la hace más robusta. |
| iOS (Safari 16.4+)                  | **Instalar** la app (Añadir a pantalla de inicio) | Antes de 16.4 no hay Web Push en iOS. |
| Desktop (Chrome/Edge/Firefox)       | Aceptar permiso                                 | Funciona con el navegador abierto o cerrado. |

Otros puntos:

- Forzar el cierre del navegador en Android (o fabricantes que matan procesos: MIUI, Huawei, etc.) puede retrasar la entrega hasta que se reabra.
- iOS puede pausar notificaciones de PWAs no usadas recientemente.
- Dispositivo offline más de 24 h: el push se descarta (TTL=86400).

---

## Instalación de la PWA

- **Android/Desktop:** la app captura `beforeinstallprompt` y muestra el banner "Instalar aplicación" (componente `PwaInstallBanner.vue` en el layout `default`).
- **iOS:** no existe `beforeinstallprompt`; el banner muestra la guía: menú Compartir → "Añadir a pantalla de inicio".
- La instalación se detecta vía `display-mode: standalone` / `navigator.standalone`.

---

## Fallbacks

- La notificación siempre queda en `notifications` (BD) y se ve en el centro de notificaciones al abrir la app.
- El push es un canal adicional, no el principal.
