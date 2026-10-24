# 19 — Development Roadmap

## Objetivo

Definir el plan de desarrollo del proyecto, incluyendo fases, hitos, estimaciones, priorización de tareas y dependencias entre módulos. Este documento sirve como guía para la ejecución del proyecto.

---

## Alcance

Cubre la planificación del desarrollo desde la configuración inicial hasta el lanzamiento (v1.0) y las mejoras posteriores (v1.1+). Incluye sprints, entregables, criterios de aceptación de cada fase y asignación de responsabilidades.

---

## Dependencias

- 00-project-vision.md — Define la visión y objetivos del producto.
- 01-business-requirements.md — Define los requisitos de negocio priorizados.
- 02-functional-requirements.md — Define los requisitos funcionales.

---

## Fases del Proyecto

```
Fase 0: Fundación              → Semanas 1-2
Fase 1: Base de la Plataforma  → Semanas 3-5
Fase 2: Módulo de Citas        → Semanas 6-8
Fase 3: Módulo CRM              → Semanas 9-11
Fase 4: Integración y QA       → Semanas 12-13
Fase 5: Lanzamiento (v1.0)     → Semana 14
Fase 6: Post-lanzamiento       → Semana 15+
```

---

## Fase 0: Fundación (Semanas 1-2)

### Objetivo

Establecer la infraestructura del proyecto, las herramientas de desarrollo y la base del frontend y backend.

### Tareas

| #    | Tarea                                                                | Dependencia | Estimación | Responsable |
| ---- | -------------------------------------------------------------------- | ----------- | ---------- | ----------- |
| 0.1  | Inicializar proyecto con Vite + Vue 3 + TypeScript                   | —           | 0.5 días   | Frontend    |
| 0.2  | Configurar ESLint, Prettier, Husky, lint-staged                      | 0.1         | 0.5 días   | Frontend    |
| 0.3  | Configurar Vuetify 3 con tema base                                   | 0.1         | 0.5 días   | Frontend    |
| 0.4  | Configurar Vue Router con rutas base y layouts                       | 0.1         | 0.5 días   | Frontend    |
| 0.5  | Configurar Pinia y store de auth                                     | 0.1         | 0.5 días   | Frontend    |
| 0.6  | Configurar Supabase CLI y proyecto local                             | —           | 0.5 días   | Backend     |
| 0.7  | Crear migraciones base (tenants, users, audit_logs)                  | 0.6         | 1 día      | Backend     |
| 0.8  | Configurar Supabase Auth con custom claims                           | 0.7         | 0.5 días   | Backend     |
| 0.9  | Configurar Supabase Storage (buckets y policies)                     | 0.7         | 0.5 días   | Backend     |
| 0.10 | Configurar Vercel project y CI/CD                                    | 0.1         | 0.5 días   | DevOps      |
| 0.11 | Configurar Sentry para frontend                                      | 0.1         | 0.5 días   | Frontend    |
| 0.12 | Crear componentes compartidos base (PageHeader, ConfirmDialog, etc.) | 0.3         | 1 día      | Frontend    |
| 0.13 | Configurar vue-i18n con traducciones base                            | 0.1         | 0.5 días   | Frontend    |
| 0.14 | Crear documentación técnica inicial                                  | —           | 0.5 días   | Equipo      |

### Entregables

- Proyecto frontend corriendo en local con lint, tests y build.
- Supabase local funcionando con migraciones base.
- Pipeline CI/CD configurado con GitHub Actions.
- Componentes compartidos básicos funcionando.
- Autenticación funcional (registro, login, logout).

### Criterios de Aceptación

- `pnpm dev` inicia el proyecto sin errores.
- `pnpm lint` y `pnpm typecheck` pasan sin errores.
- `pnpm test:unit` pasa.
- Un usuario puede registrarse, iniciar sesión y cerrar sesión.
- El pipeline CI se ejecuta correctamente en cada PR.

---

## Fase 1: Base de la Plataforma (Semanas 3-5)

### Objetivo

Implementar la funcionalidad base de la plataforma: registro de negocio, perfil, gestión de empleados, dashboard, notificaciones y configuración.

### Tareas

| #    | Tarea                                              | Dependencia      | Estimación | Responsable |
| ---- | -------------------------------------------------- | ---------------- | ---------- | ----------- |
| 1.1  | Registro de negocio (tenant) con onboarding wizard | 0.8              | 1.5 días   | Fullstack   |
| 1.2  | Perfil del negocio (logo, colores, datos)          | 0.8, 0.9         | 1 día      | Fullstack   |
| 1.3  | Sidebar dinámico según roles y módulos activos     | 0.4, 1.5         | 1 día      | Frontend    |
| 1.4  | Gestión de empleados (invitar, listar, desactivar) | 0.8, 0.9         | 1.5 días   | Fullstack   |
| 1.5  | Dashboard con indicadores clave                    | 1.4, 1.6         | 1.5 días   | Fullstack   |
| 1.6  | Guardias de ruta por autenticación y roles         | 0.4, 0.5         | 0.5 días   | Frontend    |
| 1.7  | Políticas RLS para tablas base                     | 0.7              | 1 día      | Backend     |
| 1.8  | Página de configuración del negocio                | 1.2              | 1 día      | Frontend    |
| 1.9  | Activación/desactivación de módulos                | 1.1              | 0.5 días   | Fullstack   |
| 1.10 | Gestión de suscripción y plan (sin pagos reales)   | 1.1              | 0.5 días   | Frontend    |
| 1.11 | Logs de auditoría (eventos base)                   | 0.7              | 1 día      | Backend     |
| 1.12 | Integración de notificaciones por email (Resend)   | 0.8              | 1 día      | Backend     |
| 1.13 | Pruebas de la Fase 1                               | Todo lo anterior | 1 día      | QA          |

### Entregables

- Un negocio puede registrarse completamente.
- El propietario puede configurar su negocio (logo, colores).
- El propietario puede invitar empleados.
- Dashboard funcional con datos reales.
- Sidebar navegable con módulos activos.
- RLS policies protegiendo tablas base.

### Criterios de Aceptación

- Registro completo de negocio < 2 minutos.
- Invitación de empleado → email recibido → puede iniciar sesión.
- Dashboard muestra datos del día actual.
- Usuario sin permisos no puede acceder a rutas restringidas.

---

## Fase 2: Módulo de Citas (Semanas 6-8)

### Objetivo

Implementar el módulo completo de citas: servicios, empleados, horarios, reserva online, agenda y gestión de citas.

### Tareas

| #    | Tarea                                                         | Dependencia      | Estimación | Responsable |
| ---- | ------------------------------------------------------------- | ---------------- | ---------- | ----------- |
| 2.1  | Migraciones de citas (services, employees, employee_services) | 0.7              | 0.5 días   | Backend     |
| 2.2  | CRUD de servicios con UI                                      | 1.1, 2.1         | 1 día      | Fullstack   |
| 2.3  | CRUD de empleados con UI                                      | 1.4, 2.1         | 1 día      | Fullstack   |
| 2.4  | Asignación de servicios a empleados                           | 2.2, 2.3         | 0.5 días   | Fullstack   |
| 2.5  | Migraciones de horarios (schedules, breaks, holidays)         | 0.7              | 0.5 días   | Backend     |
| 2.6  | Editor de horarios (ScheduleEditor)                           | 2.5              | 2 días     | Fullstack   |
| 2.7  | Calendario de agenda (BookingCalendar)                        | 2.5, 2.8         | 2 días     | Frontend    |
| 2.8  | Migraciones de bookings                                       | 0.7              | 0.5 días   | Backend     |
| 2.9  | Función get_available_slots                                   | 2.8              | 1 día      | Backend     |
| 2.10 | Portal público de reservas (PublicBookingView)                | 2.9              | 2 días     | Fullstack   |
| 2.11 | Gestión de estado de citas (completar, cancelar, no-show)     | 2.8              | 1 día      | Fullstack   |
| 2.12 | Cancelación y reprogramación con token                        | 2.10             | 1 día      | Fullstack   |
| 2.13 | Edge Function: send-booking-confirmation                      | 2.8              | 0.5 días   | Backend     |
| 2.14 | Edge Function: notify-appointment-reminder                    | 2.8              | 0.5 días   | Backend     |
| 2.15 | Disparador de recordatorio (cron)                             | 2.14             | 0.5 días   | Backend     |
| 2.16 | Políticas RLS para tablas de citas                            | 2.1, 2.5, 2.8    | 1 día      | Backend     |
| 2.17 | Historial de citas con filtros                                | 2.8              | 1 día      | Frontend    |
| 2.18 | Integración con CRM (creación automática de clientes)         | 2.8, 3.1         | 0.5 días   | Backend     |
| 2.19 | Pruebas del módulo de citas                                   | Todo lo anterior | 2 días     | QA          |

### Entregables

- CRUD completo de servicios, empleados y horarios.
- Agenda visual con vista día/semana/mes.
- Portal público de reservas funcional.
- Cancelación y reprogramación por email.
- Recordatorio automático 24h antes.
- Historial de citas con filtros.

### Criterios de Aceptación

- Reserva online: seleccionar servicio → empleado → fecha → hora → confirmar.
- La agenda del empleado muestra sus citas del día.
- Cancelación desde link en email.
- Reprogramación desde link en email.
- No se permiten dobles reservas.

---

## Fase 3: Módulo CRM (Semanas 9-11)

### Objetivo

Implementar el módulo CRM: registro automático de clientes, perfiles, notas, etiquetas, búsqueda, programa de fidelización y estadísticas.

### Tareas

| #    | Tarea                                                                                               | Dependencia      | Estimación | Responsable |
| ---- | --------------------------------------------------------------------------------------------------- | ---------------- | ---------- | ----------- |
| 3.1  | Migraciones de CRM (customers, customer_notes, tags, customer_tags, loyalty_points, loyalty_config) | 0.7              | 0.5 días   | Backend     |
| 3.2  | Registro automático de clientes (triggers desde bookings)                                           | 3.1, 2.8         | 1 día      | Backend     |
| 3.3  | Lista de clientes con búsqueda y filtros                                                            | 3.1              | 2 días     | Fullstack   |
| 3.4  | Perfil de cliente con pestañas (info, historial, notas, fidelización)                               | 3.3              | 2 días     | Fullstack   |
| 3.5  | CRUD de etiquetas                                                                                   | 3.1              | 0.5 días   | Fullstack   |
| 3.6  | Asignación de etiquetas a clientes (TagSelector)                                                    | 3.5              | 0.5 días   | Frontend    |
| 3.7  | Notas de cliente (crear, listar)                                                                    | 3.1              | 0.5 días   | Fullstack   |
| 3.8  | Programa de fidelización (configuración)                                                            | 3.1              | 1 día      | Fullstack   |
| 3.9  | Edge Function: process-loyalty-points                                                               | 3.8              | 0.5 días   | Backend     |
| 3.10 | Edge Function: expire-loyalty-points (cron)                                                         | 3.8              | 0.5 días   | Backend     |
| 3.11 | Edge Function: auto-tag-customers (cron)                                                            | 3.5              | 0.5 días   | Backend     |
| 3.12 | Estadísticas de clientes (CustomerStatsView)                                                        | 3.1              | 1.5 días   | Fullstack   |
| 3.13 | Portal del cliente (ClientPortalView)                                                               | 3.1, 0.8         | 2 días     | Fullstack   |
| 3.14 | Exportación de clientes a CSV                                                                       | 3.3              | 0.5 días   | Fullstack   |
| 3.15 | Historial de cliente (citas integradas)                                                             | 2.8, 3.1         | 1 día      | Frontend    |
| 3.16 | Políticas RLS para tablas de CRM                                                                    | 3.1              | 1 día      | Backend     |
| 3.17 | Pruebas del módulo CRM                                                                              | Todo lo anterior | 2 días     | QA          |

### Entregables

- Clientes registrados automáticamente desde citas.
- Búsqueda de clientes por nombre, email, teléfono, etiquetas.
- Perfil completo de cliente con historial.
- Etiquetas configurables con asignación manual y automática.
- Programa de fidelización con puntos.
- Estadísticas básicas de clientes.
- Portal del cliente para autogestión.

### Criterios de Aceptación

- Un cliente que reserva aparece automáticamente en CRM.
- Búsqueda encuentra clientes por nombre parcial.
- Las etiquetas del sistema (VIP, Frecuente, Inactivo) se asignan automáticamente.
- Los puntos se calculan y acreditan al completar cita.
- El cliente puede ver sus puntos en el portal.

---

## Fase 4: Integración y QA (Semanas 12-13)

### Objetivo

Integrar los dos módulos (Citas y CRM), realizar pruebas integrales, corregir bugs, optimizar rendimiento y preparar la documentación de usuario.

### Tareas

| #    | Tarea                                   | Dependencia           | Estimación | Responsable |
| ---- | --------------------------------------- | --------------------- | ---------- | ----------- |
| 4.1  | Pruebas de integración entre módulos    | Fases 2-3             | 2 días     | QA          |
| 4.2  | Pruebas de aislamiento multi-tenant     | 1.7, 2.16, 3.16       | 1 día      | QA          |
| 4.3  | Pruebas de rendimiento y carga          | Todo                  | 1 día      | QA          |
| 4.4  | Pruebas de seguridad (OWASP top 10)     | Todo                  | 1 día      | QA          |
| 4.5  | Corrección de bugs encontrados          | 4.1-4.4               | 3 días     | Equipo      |
| 4.6  | Optimización de consultas lentas        | Todo                  | 1 día      | Backend     |
| 4.7  | Optimización de bundle y carga frontend | Todo                  | 1 día      | Frontend    |
| 4.8  | Pruebas en dispositivos móviles         | Todo                  | 1 día      | QA          |
| 4.9  | Pruebas de accesibilidad (WCAG AA)      | Todo                  | 1 día      | QA          |
| 4.10 | Documentación de usuario (guías, FAQ)   | Todo                  | 2 días     | Producto    |
| 4.11 | Traducciones completas (es, en, pt)     | Todo                  | 1 día      | Equipo      |
| 4.12 | Preparación de datos de demostración    | Todo                  | 0.5 días   | Producto    |

### Entregables

- Suite completa de tests pasando.
- Informe de rendimiento (Lighthouse > 90).
- Informe de seguridad.
- Documentación de usuario.
- Datos de demostración precargados.

### Criterios de Aceptación

- No hay bugs críticos o altos conocidos.
- Lighthouse Mobile > 90.
- Cobertura de tests > 80%.
- Aislamiento multi-tenant verificado con tests automatizados.

---

## Fase 5: Lanzamiento v1.0 (Semana 14)

### Objetivo

Desplegar a producción y realizar el lanzamiento oficial.

### Tareas

| #   | Tarea                                         | Dependencia | Estimación | Responsable |
| --- | --------------------------------------------- | ----------- | ---------- | ----------- |
| 5.1 | Despliegue a producción (frontend + supabase) | Fase 4      | 0.5 días   | DevOps      |
| 5.2 | Verificación post-despliegue                  | 5.1         | 0.5 días   | Equipo      |
| 5.3 | Configuración de monitoreo y alertas          | 5.1         | 0.5 días   | DevOps      |
| 5.4 | Creación de cuentas de prueba internas        | 5.1         | 0.5 días   | QA          |
| 5.5 | Pruebas de humo en producción                 | 5.4         | 0.5 días   | QA          |
| 5.6 | Lanzamiento oficial (comunicación, redes)     | 5.5         | —          | Producto    |
| 5.7 | Monitoreo post-lanzamiento (primeras 48h)     | 5.6         | 2 días     | Equipo      |

### Entregables

- Plataforma en producción (nexo.app).
- Monitoreo y alertas configurados.
- Cuentas de prueba funcionales.

### Criterios de Aceptación

- La plataforma es accesible desde nexo.app.
- Registro de nuevo negocio funciona.
- Los módulos Citas y CRM están operativos.
- No hay errores críticos en producción.

---

## Fase 6: Post-Lanzamiento (Semana 15+)

### Objetivo

Recibir feedback, corregir bugs de producción, iterar y planificar la siguiente versión.

### Tareas

| #   | Tarea                                         | Prioridad |
| --- | --------------------------------------------- | --------- |
| 6.1 | Monitoreo de errores en producción (Sentry)   | Alta      |
| 6.2 | Corrección de bugs reportados                 | Alta      |
| 6.3 | Recopilación de feedback de primeros usuarios | Alta      |
| 6.4 | Iteraciones rápidas basadas en feedback       | Media     |
| 6.5 | Planificación de v1.1 (features post-MVP)     | Media     |
| 6.6 | Implementación de pagos (suscripciones)       | Media     |
| 6.7 | Mejora de rendimiento según datos reales      | Baja      |

---

## Resumen de Estimaciones

| Fase                     | Semanas | Días   | Frontend | Backend | QA     | Total  |
| ------------------------ | ------- | ------ | -------- | ------- | ------ | ------ |
| Fase 0: Fundación        | 2       | 10     | 5        | 3       | 1      | 9      |
| Fase 1: Base Plataforma  | 3       | 15     | 7        | 5       | 2      | 14     |
| Fase 2: Citas            | 3       | 15     | 7        | 5       | 2      | 14     |
| Fase 3: CRM              | 3       | 15     | 7        | 5       | 2      | 14     |
| Fase 4: Integración y QA | 2       | 10     | 2        | 2       | 5      | 9      |
| Fase 5: Lanzamiento      | 1       | 5      | 1        | 1       | 1      | 3      |
| **Total**                | **14**  | **70** | **29**   | **21**  | **13** | **63** |

---

## Riesgos del Roadmap

| Riesgo                        | Impacto                  | Mitigación                                                                     |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Subestimación de tareas       | Retraso en el cronograma | Buffer de 20% en cada fase. Priorizar funcionalidades core.                    |
| Bugs críticos en integración  | Retraso en lanzamiento   | QA continuo desde Fase 1. Pruebas de integración tempranas.                    |
| Curva de aprendizaje Supabase | Lentitud inicial         | Documentación y ejemplos en Fase 0. Pair programming.                          |
| Cambios en requisitos         | Scope creep              | Congelar requisitos para v1.0. Los cambios van a v1.1+.                        |
| Disponibilidad del equipo     | Retraso                  | Identificar dependencias críticas. Documentar para que otros puedan continuar. |

---

## Decisiones Tomadas

| Decisión                           | Opción                      | Alternativas                   | Justificación                                                                             |
| ---------------------------------- | --------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Orden de módulos                   | Citas → CRM                 | Cualquier orden                | Citas es el módulo más crítico y demandado. CRM depende de los datos de Citas.            |
| QA continuo vs. al final           | QA continuo desde Fase 1    | QA solo al final               | Detecta bugs temprano. Reduce el riesgo de retrabajo.                                     |
| Buffer en estimaciones             | 20% adicional               | Sin buffer                     | Realista para un proyecto nuevo con tecnologías que el equipo puede estar aprendiendo.    |
| Lanzamiento monolítico vs. modular | Lanzar todo v1.0 junto      | Lanzar módulos individualmente | Los módulos están integrados entre sí. Lanzar juntos permite demostrar el valor completo. |

---

## Posibles Mejoras Futuras (v1.1+)

- Pasarela de pagos integrada (Stripe, Mercado Pago)
- Módulo de facturación electrónica
- Módulo de inventarios
- Notificaciones push (PWA)
- App nativa móvil (Flutter / React Native)
- Multi-sucursal
- Dashboard avanzado con gráficos personalizables
- API pública para integraciones de terceros
- Integración con WhatsApp Business
- Modo offline para zonas sin conectividad

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 20-coding-standards.md_
