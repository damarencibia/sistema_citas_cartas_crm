# 03 — Non-Functional Requirements

## Objetivo

Definir los requisitos no funcionales (atributos de calidad) que el sistema debe cumplir. Estos requisitos establecen restricciones y estándares sobre cómo el sistema debe comportarse, no qué debe hacer.

---

## Alcance

Cubre atributos de calidad para todos los módulos y la plataforma base. Incluye rendimiento, seguridad, escalabilidad, disponibilidad, mantenibilidad, usabilidad y portabilidad.

---

## Dependencias

- 00-project-vision.md — Define los principios rectores que guían estos requisitos.
- 02-functional-requirements.md — Define las funcionalidades que estos requisitos no funcionales deben soportar.

---

## NFR-001: Rendimiento (Performance)

| Campo           | Valor                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-001                                                                                                                                                                       |
| **Título**      | Tiempo de respuesta de API                                                                                                                                                    |
| **Descripción** | El 95% de las solicitudes a la API deben completarse en menos de 200ms (tiempo de ida y vuelta desde el cliente hasta la respuesta del servidor, excluyendo latencia de red). |
| **Métrica**     | Percentil 95 del tiempo de respuesta                                                                                                                                          |
| **Prioridad**   | Alta                                                                                                                                                                          |
| **Afecta**      | Todos los módulos                                                                                                                                                             |
| **Estrategia**  | Índices en PostgreSQL, queries optimizadas, paginación en listados, caching de consultas frecuentes, Edge Functions para operaciones que requieren baja latencia.             |

| Campo           | Valor                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-002                                                                                                                                                 |
| **Título**      | Tiempo de carga inicial del frontend                                                                                                                    |
| **Descripción** | El tiempo de carga inicial (First Contentful Paint) debe ser inferior a 2 segundos en conexiones 4G.                                                    |
| **Métrica**     | Lighthouse FCP                                                                                                                                          |
| **Prioridad**   | Alta                                                                                                                                                    |
| **Afecta**      | Frontend completo                                                                                                                                       |
| **Estrategia**  | Lazy loading de rutas y componentes, code splitting automático con Vite, compresión de assets, precarga de recursos críticos, optimización de imágenes. |

| Campo           | Valor                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-003                                                                                                                             |
| **Título**      | Tiempo de interacción                                                                                                               |
| **Descripción** | El Time to Interactive (TTI) debe ser inferior a 3.5 segundos en dispositivos móviles de gama media.                                |
| **Métrica**     | Lighthouse TTI                                                                                                                      |
| **Prioridad**   | Alta                                                                                                                                |
| **Afecta**      | Frontend completo                                                                                                                   |
| **Estrategia**  | Reducir tamaño de JavaScript mediante tree-shaking, diferir carga de componentes no críticos, usar Web Workers para tareas pesadas. |

| Campo           | Valor                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-004                                                                                                        |
| **Título**      | Tiempo de respuesta de Realtime                                                                                |
| **Descripción** | Las actualizaciones en tiempo real (nuevos pedidos, cambios de estado) deben reflejarse en menos de 1 segundo. |
| **Métrica**     | Latencia de extremo a extremo (end-to-end)                                                                     |
| **Prioridad**   | Alta                                                                                                           |
| **Afecta**      | Citas, Carta Digital                                                                                           |
| **Estrategia**  | Usar Supabase Realtime con suscripciones canalizadas por tenant, evitar suscripciones globales.                |

| Campo           | Valor                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-005                                                                                                                             |
| **Título**      | Tiempo de carga de imágenes                                                                                                         |
| **Descripción** | Las imágenes (logos, productos) deben cargar en menos de 1 segundo en conexiones 4G.                                                |
| **Métrica**     | Tiempo de carga por imagen                                                                                                          |
| **Prioridad**   | Media                                                                                                                               |
| **Afecta**      | Perfil de negocio, Carta Digital                                                                                                    |
| **Estrategia**  | Optimización automática al subir (WebP con compresión progresiva), lazy loading con Intersection Observer, CDN de Supabase Storage. |

---

## NFR-002: Seguridad (Security)

| Campo           | Valor                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-006                                                                                                                                                                                                                                      |
| **Título**      | Aislamiento de datos entre tenantes                                                                                                                                                                                                          |
| **Descripción** | Un tenant (negocio) no debe poder acceder, modificar o eliminar datos de otro tenant bajo ninguna circunstancia.                                                                                                                             |
| **Métrica**     | Pruebas automatizadas de penetración entre tenantes                                                                                                                                                                                          |
| **Prioridad**   | Crítica                                                                                                                                                                                                                                      |
| **Afecta**      | Todos los módulos                                                                                                                                                                                                                            |
| **Estrategia**  | Row Level Security (RLS) de PostgreSQL con policies que verifican `tenant_id` en cada consulta. Tests automatizados que intentan acceder a datos de otros tenantes. Doble validación: RLS en base de datos + verificación en Edge Functions. |

| Campo           | Valor                                                                                                                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-007                                                                                                                                                                                                                                                                                                              |
| **Título**      | Protección de datos sensibles                                                                                                                                                                                                                                                                                        |
| **Descripción** | Los datos sensibles (contraseñas, tokens de autenticación, información personal) deben protegerse en reposo y en tránsito.                                                                                                                                                                                           |
| **Métrica**     | Cumplimiento de checklist OWASP Top 10                                                                                                                                                                                                                                                                               |
| **Prioridad**   | Crítica                                                                                                                                                                                                                                                                                                              |
| **Afecta**      | Todos los módulos                                                                                                                                                                                                                                                                                                    |
| **Estrategia**  | HTTPS obligatorio (Vercel lo proporciona por defecto), contraseñas hasheadas con bcrypt (o Supabase Auth que lo maneja internamente), token JWT con expiración, no almacenar tokens sensibles en localStorage (usar cookies httpOnly cuando sea posible), cifrado en reposo de PostgreSQL (lo proporciona Supabase). |

| Campo           | Valor                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-008                                                                                                                                                                                   |
| **Título**      | Rate limiting                                                                                                                                                                             |
| **Descripción** | El sistema debe limitar el número de solicitudes de un mismo origen para prevenir abusos.                                                                                                 |
| **Métrica**     | Solicitudes rechazadas por rate limiting                                                                                                                                                  |
| **Prioridad**   | Alta                                                                                                                                                                                      |
| **Afecta**      | API, formularios de login                                                                                                                                                                 |
| **Estrategia**  | Edge Functions de Supabase con rate limiting por IP y por usuario autenticado. Límites: 100 req/min para endpoints de lectura, 20 req/min para escritura, 5 intentos de login por minuto. |

| Campo           | Valor                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-009                                                                                                                                                                                                     |
| **Título**      | Validación de entrada                                                                                                                                                                                       |
| **Descripción** | Todos los datos de entrada deben validarse tanto en el cliente como en el servidor.                                                                                                                         |
| **Métrica**     | Cobertura de validación en endpoints                                                                                                                                                                        |
| **Prioridad**   | Crítica                                                                                                                                                                                                     |
| **Afecta**      | Todos los módulos                                                                                                                                                                                           |
| **Estrategia**  | Validación en frontend con reglas Vuetify + Zod/Yup. Validación en backend con RLS + checks en Edge Functions. Sanitización de HTML en entradas de texto. Previene XSS, SQL injection, y command injection. |

| Campo           | Valor                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-010                                                                                                                                                                                       |
| **Título**      | Gestión de sesiones                                                                                                                                                                           |
| **Descripción** | Las sesiones de usuario deben gestionarse de forma segura con expiración controlada.                                                                                                          |
| **Métrica**     | Tiempo de expiración de sesión                                                                                                                                                                |
| **Prioridad**   | Alta                                                                                                                                                                                          |
| **Afecta**      | Autenticación                                                                                                                                                                                 |
| **Estrategia**  | Sesión JWT con expiración de 24h (o 30 días si "Recordar sesión"). Refresh token rotado. Revocación de sesión al cambiar contraseña. Cierre de sesión automático tras inactividad de 2 horas. |

---

## NFR-003: Escalabilidad (Scalability)

| Campo           | Valor                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**          | NFR-011                                                                                                                                                                        |
| **Título**      | Escalabilidad horizontal de base de datos                                                                                                                                      |
| **Descripción** | La base de datos debe soportar hasta 500 tenantes concurrentes sin degradación del rendimiento.                                                                                |
| **Métrica**     | Tiempo de respuesta vs. número de tenantes activos                                                                                                                             |
| **Prioridad**   | Alta                                                                                                                                                                           |
| **Afecta**      | Base de datos                                                                                                                                                                  |
| **Estrategia**  | Índices compuestos con tenant_id como primera columna. Particionamiento por tenant si es necesario. Pool de conexiones de Supabase. Consultas siempre filtradas por tenant_id. |

| Campo           | Valor                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**          | NFR-012                                                                                                                                                                  |
| **Título**      | Escalabilidad horizontal del frontend                                                                                                                                    |
| **Descripción** | El frontend debe servir a múltiples usuarios concurrentes sin degradación, aprovechando la CDN de Vercel.                                                                |
| **Métrica**     | Usuarios concurrentes sin degradación                                                                                                                                    |
| **Prioridad**   | Alta                                                                                                                                                                     |
| **Afecta**      | Frontend                                                                                                                                                                 |
| **Estrategia**  | Vercel sirve assets estáticos desde CDN global. El frontend es una SPA sin estado del lado del servidor. La escalabilidad está determinada por Vercel, no por el código. |

| Campo           | Valor                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-013                                                                                                                                           |
| **Título**      | Escalabilidad de funciones serverless                                                                                                             |
| **Descripción** | Las Edge Functions deben escalar según la demanda sin intervención manual.                                                                        |
| **Métrica**     | Tiempo de respuesta bajo carga                                                                                                                    |
| **Prioridad**   | Media                                                                                                                                             |
| **Afecta**      | Edge Functions                                                                                                                                    |
| **Estrategia**  | Supabase Edge Functions (Deno) son serverless y escalan automáticamente. Diseñar funciones como stateless. Cachear respuestas cuando sea posible. |

---

## NFR-004: Disponibilidad (Availability)

| Campo           | Valor                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-014                                                                                                                                     |
| **Título**      | Tiempo de actividad del sistema                                                                                                             |
| **Descripción** | El sistema debe tener una disponibilidad del 99.9% (excluyendo mantenimiento programado).                                                   |
| **Métrica**     | Uptime mensual                                                                                                                              |
| **Prioridad**   | Crítica                                                                                                                                     |
| **Afecta**      | Todos los módulos                                                                                                                           |
| **Estrategia**  | Vercel y Supabase tienen SLAs con alta disponibilidad. Despliegues sin downtime (Vercel Preview + Production). Monitoreo con uptime checks. |

| Campo           | Valor                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**          | NFR-015                                                                                                                                                                                    |
| **Título**      | Recuperación ante fallos                                                                                                                                                                   |
| **Descripción** | El sistema debe recuperarse automáticamente de fallos sin pérdida de datos confirmados.                                                                                                    |
| **Métrica**     | RPO (Recovery Point Objective) y RTO (Recovery Time Objective)                                                                                                                             |
| **Prioridad**   | Alta                                                                                                                                                                                       |
| **Afecta**      | Base de datos                                                                                                                                                                              |
| **Estrategia**  | Supabase realiza backups automáticos diarios (point-in-time recovery). Las operaciones de escritura críticas deben usar transacciones. RPO objetivo: < 1 hora. RTO objetivo: < 30 minutos. |

| Campo           | Valor                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-016                                                                                                                                       |
| **Título**      | Degradación graceful                                                                                                                          |
| **Descripción** | Si un servicio externo falla (Supabase, email, SMS), el sistema debe degradarse gracefulmente sin romper la experiencia del usuario.          |
| **Métrica**     | Funcionalidades disponibles durante degradación                                                                                               |
| **Prioridad**   | Media                                                                                                                                         |
| **Afecta**      | Todos los módulos                                                                                                                             |
| **Estrategia**  | Cacheo local de datos frecuentes. Cola de reintentos para emails/SMS. Mensajes informativos al usuario cuando un servicio no está disponible. |

---

## NFR-005: Mantenibilidad (Maintainability)

| Campo           | Valor                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**          | NFR-017                                                                                                                                                                                                                        |
| **Título**      | Modularidad del código                                                                                                                                                                                                         |
| **Descripción** | El código debe organizarse en módulos independientes con responsabilidades bien definidas.                                                                                                                                     |
| **Métrica**     | Acoplamiento entre módulos (bajo)                                                                                                                                                                                              |
| **Prioridad**   | Alta                                                                                                                                                                                                                           |
| **Afecta**      | Todos los módulos                                                                                                                                                                                                              |
| **Estrategia**  | Cada módulo en su propia carpeta `src/modules/<nombre>/` con estructura interna independiente (components, composables, stores, views, types, i18n). Comunicación entre módulos solo a través de stores compartidas o eventos. |

| Campo           | Valor                                                                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-018                                                                                                                                                                                                                    |
| **Título**      | Testing automatizado                                                                                                                                                                                                       |
| **Descripción** | El código debe tener cobertura de pruebas automatizadas.                                                                                                                                                                   |
| **Métrica**     | Cobertura de código                                                                                                                                                                                                        |
| **Prioridad**   | Alta                                                                                                                                                                                                                       |
| **Afecta**      | Todos los módulos                                                                                                                                                                                                          |
| **Estrategia**  | Tests unitarios con Vitest (> 90% cobertura en lógica de negocio). Tests de componentes con Vue Test Utils (> 80%). Tests de integración de RLS policies. Tests e2e con Playwright para flujos críticos (reserva, pedido). |

| Campo           | Valor                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-019                                                                                                                                                                                                          |
| **Título**      | Documentación del código                                                                                                                                                                                         |
| **Descripción** | El código debe ser autodocumentado con nombres descriptivos y tipado fuerte.                                                                                                                                     |
| **Métrica**     | % de funciones con TypeScript tipado                                                                                                                                                                             |
| **Prioridad**   | Media                                                                                                                                                                                                            |
| **Afecta**      | Todos los módulos                                                                                                                                                                                                |
| **Estrategia**  | TypeScript estricto en todo el proyecto. Tipos exportados desde archivos `types.ts` por módulo. Sin comentarios superfluos (el código debe leerse con claridad). JSDoc solo para funciones públicas de utilidad. |

| Campo           | Valor                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| **ID**          | NFR-020                                                                                                            |
| **Título**      | Convenciones de código                                                                                             |
| **Descripción** | Todo el código debe seguir las mismas convenciones de estilo y formato.                                            |
| **Métrica**     | Consistencia del código                                                                                            |
| **Prioridad**   | Alta                                                                                                               |
| **Afecta**      | Todos los módulos                                                                                                  |
| **Estrategia**  | ESLint + Prettier con configuración compartida. Husky para pre-commit hooks. EditorConfig. TypeScript strict mode. |

---

## NFR-006: Usabilidad (Usability)

| Campo           | Valor                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-021                                                                                                                                                        |
| **Título**      | Diseño responsive                                                                                                                                              |
| **Descripción** | La interfaz debe funcionar correctamente en dispositivos móviles, tablets y desktop.                                                                           |
| **Métrica**     | Lighthouse Mobile Score > 90                                                                                                                                   |
| **Prioridad**   | Crítica                                                                                                                                                        |
| **Afecta**      | Frontend completo                                                                                                                                              |
| **Estrategia**  | Vuetify proporciona componentes responsive por defecto. Breakpoints estándar: xs (< 600px), sm (600+), md (960+), lg (1280+), xl (1920+). Diseño mobile-first. |

| Campo           | Valor                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-022                                                                                                                                                                    |
| **Título**      | Accesibilidad                                                                                                                                                              |
| **Descripción** | La interfaz debe cumplir con WCAG 2.1 nivel AA.                                                                                                                            |
| **Métrica**     | Auditoría de accesibilidad                                                                                                                                                 |
| **Prioridad**   | Media                                                                                                                                                                      |
| **Afecta**      | Frontend completo                                                                                                                                                          |
| **Estrategia**  | Vuetify tiene accesibilidad incorporada. Roles ARIA en componentes personalizados. Contraste de color suficiente. Navegación por teclado. Textos alternativos en imágenes. |

| Campo           | Valor                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-023                                                                                                                       |
| **Título**      | Tiempo de incorporación (onboarding)                                                                                          |
| **Descripción** | Un nuevo propietario debe poder configurar su negocio y tener su primera cita/pedido en menos de 5 minutos desde el registro. |
| **Métrica**     | Tiempo desde registro hasta primera funcionalidad                                                                             |
| **Prioridad**   | Alta                                                                                                                          |
| **Afecta**      | Plataforma base                                                                                                               |
| **Estrategia**  | Onboarding guiado paso a paso (wizard). Plantillas predefinidas de servicios. Ejemplos precargados. Tooltips contextuales.    |

| Campo           | Valor                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-024                                                                                                                                                                 |
| **Título**      | Retroalimentación del sistema                                                                                                                                           |
| **Descripción** | El sistema debe proporcionar retroalimentación visual inmediata para todas las acciones del usuario.                                                                    |
| **Métrica**     | % de acciones con feedback visual                                                                                                                                       |
| **Prioridad**   | Alta                                                                                                                                                                    |
| **Afecta**      | Frontend completo                                                                                                                                                       |
| **Estrategia**  | Loading states (skeleton screens) en todas las cargas. Snackbars/toasts para confirmaciones y errores. Transiciones animadas. Validación en tiempo real en formularios. |

---

## NFR-007: Portabilidad (Portability)

| Campo           | Valor                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-025                                                                                                                               |
| **Título**      | Compatibilidad de navegadores                                                                                                         |
| **Descripción** | El sistema debe funcionar en las versiones actuales de Chrome, Firefox, Safari y Edge.                                                |
| **Métrica**     | Pruebas en navegadores objetivo                                                                                                       |
| **Prioridad**   | Alta                                                                                                                                  |
| **Afecta**      | Frontend completo                                                                                                                     |
| **Estrategia**  | Vite genera bundles con compatibilidad para browserslist configurado. Pruebas en los 4 navegadores principales durante el desarrollo. |

| Campo           | Valor                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-026                                                                                                                          |
| **Título**      | Internacionalización (i18n)                                                                                                      |
| **Descripción** | El sistema debe soportar múltiples idiomas sin cambios en el código.                                                             |
| **Métrica**     | Idiomas soportados                                                                                                               |
| **Prioridad**   | Alta                                                                                                                             |
| **Afecta**      | Frontend completo                                                                                                                |
| **Estrategia**  | vue-i18n con lazy loading de traducciones. Archivos JSON por idioma y por módulo. Idiomas iniciales: español, inglés, portugués. |

| Campo           | Valor                                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-027                                                                                                                                                                                         |
| **Título**      | Separación de frontend y backend                                                                                                                                                                |
| **Descripción** | El frontend y el backend deben estar completamente desacoplados.                                                                                                                                |
| **Métrica**     | Dependencias entre frontend y backend                                                                                                                                                           |
| **Prioridad**   | Alta                                                                                                                                                                                            |
| **Afecta**      | Arquitectura                                                                                                                                                                                    |
| **Estrategia**  | Frontend (Vue) desplegado en Vercel. Backend (Supabase) como servicio independiente. Comunicación exclusivamente vía API REST/Realtime. El frontend no tiene acceso directo a la base de datos. |

---

## NFR-008: Confiabilidad (Reliability)

| Campo           | Valor                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-028                                                                                                                                                        |
| **Título**      | Consistencia de datos                                                                                                                                          |
| **Descripción** | Las operaciones críticas (reservas, pedidos) deben ser atómicas y consistentes.                                                                                |
| **Métrica**     | % de operaciones con consistencia verificada                                                                                                                   |
| **Prioridad**   | Crítica                                                                                                                                                        |
| **Afecta**      | Citas, Carta Digital                                                                                                                                           |
| **Estrategia**  | Uso de transacciones de PostgreSQL. Validación de disponibilidad en el momento de la escritura (no solo en la lectura). Bloqueo optimista con versión de fila. |

| Campo           | Valor                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-029                                                                                                                                                                                     |
| **Título**      | Manejo de errores                                                                                                                                                                           |
| **Descripción** | Todos los errores deben manejarse gracefulmente sin exponer información interna.                                                                                                            |
| **Métrica**     | % de errores manejados                                                                                                                                                                      |
| **Prioridad**   | Alta                                                                                                                                                                                        |
| **Afecta**      | Todos los módulos                                                                                                                                                                           |
| **Estrategia**  | Error boundaries en Vue. Catch global de errores no manejados. Logs de error en consola (desarrollo) y en servicio externo (producción). Mensajes de error amigables sin detalles técnicos. |

| Campo           | Valor                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-030                                                                                                                                                                                 |
| **Título**      | Respaldo y recuperación                                                                                                                                                                 |
| **Descripción** | Los datos deben respaldarse automáticamente y ser recuperables.                                                                                                                         |
| **Métrica**     | Frecuencia de backups, RPO                                                                                                                                                              |
| **Prioridad**   | Alta                                                                                                                                                                                    |
| **Afecta**      | Base de datos                                                                                                                                                                           |
| **Estrategia**  | Supabase realiza backups diarios automáticos. Point-in-time recovery con capacidad de restaurar a cualquier punto en las últimas 24h. Backups manuales descargables por el super admin. |

---

## NFR-009: Monitoreo y Observabilidad

| Campo           | Valor                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-031                                                                                                                                     |
| **Título**      | Logs de aplicación                                                                                                                          |
| **Descripción** | El sistema debe registrar eventos clave para depuración y auditoría.                                                                        |
| **Métrica**     | Cobertura de logging                                                                                                                        |
| **Prioridad**   | Media                                                                                                                                       |
| **Afecta**      | Todos los módulos                                                                                                                           |
| **Estrategia**  | Logs estructurados en Edge Functions. Logs de errores del frontend enviados a un endpoint de telemetría. Niveles: debug, info, warn, error. |

| Campo           | Valor                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**          | NFR-032                                                                                                                                                                         |
| **Título**      | Monitoreo de rendimiento                                                                                                                                                        |
| **Descripción** | El sistema debe monitorear métricas clave de rendimiento y alertar ante anomalías.                                                                                              |
| **Métrica**     | Tiempo de detección de anomalías                                                                                                                                                |
| **Prioridad**   | Media                                                                                                                                                                           |
| **Afecta**      | Todos los módulos                                                                                                                                                               |
| **Estrategia**  | Supabase proporciona métricas de base de datos (lentitud de queries, conexiones). Vercel Analytics para rendimiento del frontend. Alertas configuradas en el panel de Supabase. |

---

## Resumen de Atributos de Calidad

| Atributo       | Prioridad | Métrica Clave                     |
| -------------- | --------- | --------------------------------- |
| Rendimiento    | Alta      | P95 < 200ms                       |
| Seguridad      | Crítica   | Sin fugas de datos entre tenantes |
| Escalabilidad  | Alta      | 500 tenantes concurrentes         |
| Disponibilidad | Crítica   | 99.9% uptime                      |
| Mantenibilidad | Alta      | Módulos independientes            |
| Usabilidad     | Crítica   | Lighthouse Mobile > 90            |
| Portabilidad   | Alta      | 4 navegadores + 3 idiomas         |
| Confiabilidad  | Crítica   | Operaciones atómicas              |
| Monitoreo      | Media     | Alertas automáticas               |

---

## Decisiones Tomadas

| Decisión                   | Opción Elegida                       | Alternativas                | Justificación                                                                                                            |
| -------------------------- | ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Almacenamiento de sesiones | JWT con Supabase Auth                | Sesiones propias, Redis     | Supabase Auth maneja JWT de forma segura y ya está integrado con RLS.                                                    |
| Validación de entrada      | Frontend + RLS + Edge Functions      | Solo backend, solo frontend | Capas múltiples de defensa. RLS valida a nivel de base de datos, edge functions validan lógica de negocio compleja.      |
| Caché                      | LocalStorage + CDN                   | Redis, Memcached            | Para el frontend SPA, localStorage es suficiente para caché de datos del usuario. CDN de Vercel cachea assets estáticos. |
| Rate limiting              | Supabase Auth + Edge Functions       | API Gateway externo         | Supabase ya tiene rate limiting integrado en Auth. Para el resto, edge functions pueden implementarlo.                   |
| Testing                    | Vitest + Vue Test Utils + Playwright | Jest, Cypress               | Vitest es más rápido y compatible con Vite. Playwright para e2e es más fiable que Cypress para este stack.               |

---

## Posibles Mejoras Futuras

- Implementar PWA (Progressive Web App) para funcionalidad offline parcial.
- CDN dedicada para imágenes (Cloudinary, Imgix) si el volumen lo justifica.
- Dashboard de monitoreo interno con Grafana + Prometheus si la escala lo requiere.
- Migrar a bases de datos por tenant (schema isolation) si la escala supera los 1000 tenantes.
- Implementar feature flags con un servicio como LaunchDarkly.
- Tests de carga con k6 o Artillery para verificar escalabilidad.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 04-tech-stack.md_
