# Documentación técnica proyecto SaaS multi-tenant

**Session ID:** ses_0d6a12b07fferVaaZ6d3Idjvyh
**Created:** 3/7/2026, 15:05:08
**Updated:** 3/7/2026, 15:09:07

---

## User

Quiero que actúes como un Software Architect, Product Owner y Senior Full Stack Engineer con amplia experiencia diseñando productos SaaS multi-tenant para producción.

NO debes escribir código ni implementar ninguna funcionalidad todavía.

Tu objetivo es construir la documentación completa del proyecto antes de comenzar el desarrollo.

# Proyecto

Voy a desarrollar un SaaS orientado a pequeños y medianos negocios.

La plataforma permitirá que múltiples empresas se registren y administren su negocio desde una única aplicación.

Cada empresa tendrá completamente aislados sus datos (arquitectura multi-tenant).

El sistema será modular.

Los tres módulos iniciales serán:

1. Sistema de Citas
2. Carta Digital con gestión de pedidos
3. CRM

El sistema deberá ser escalable para incorporar nuevos módulos en el futuro sin modificar la arquitectura principal.

No quiero una aplicación monolítica difícil de mantener.

Debe diseñarse siguiendo principios SOLID, Clean Architecture y una arquitectura modular.

Todo el proyecto debe pensarse desde el inicio para producción.

# Stack Tecnológico

Frontend

- Vue 3
- TypeScript
- Vite
- Vuetify
- Pinia
- Vue Router

Backend

- Supabase
    - PostgreSQL
    - Auth
    - Storage
    - Realtime
    - Row Level Security (RLS)
    - Edge Functions únicamente cuando sea necesario

Hosting

- Vercel

# Objetivo del producto

La plataforma busca digitalizar la operación de pequeños negocios permitiendo gestionar clientes, reservas, pedidos y relaciones comerciales desde un único sistema.

No es únicamente un sistema de citas.

Es una plataforma integral de administración para negocios.

# Usuarios del sistema

- Super Administrador
- Propietario del negocio
- Administrador
- Empleado
- Cliente

# Módulo 1

Sistema de Citas

Debe permitir:

- Agenda
- Horarios
- Servicios
- Empleados
- Reservas
- Cancelaciones
- Reprogramaciones
- Historial

# Módulo 2

Carta Digital

Debe permitir:

- Menús digitales
- Categorías
- Productos
- Variantes
- Extras
- QR por mesa
- Carrito
- Pedidos
- Estado del pedido

# Módulo 3

CRM

Debe permitir:

- Gestión de clientes
- Historial
- Notas
- Etiquetas
- Fidelización
- Estadísticas básicas

# Requisitos No Funcionales

La arquitectura debe ser:

- Modular
- Escalable
- Mantenible
- Segura
- Multi-tenant
- Responsive
- Preparada para internacionalización
- Preparada para múltiples idiomas
- Optimizada para dispositivos móviles
- Fácil de extender con nuevos módulos

# Instrucciones

No desarrolles ninguna funcionalidad.

Primero debes construir toda la documentación del proyecto.

Genera una carpeta llamada /docs.

Dentro de ella crea una serie de documentos Markdown numerados.

Cada documento debe depender del anterior y servir como contexto para los siguientes.

Cada documento debe ser extremadamente detallado.

Cada decisión técnica debe justificarse.

No omitas detalles.

La documentación debe ser suficiente para que cualquier desarrollador pueda implementar el sistema únicamente leyendo estos documentos.

Los documentos deben seguir este orden:

00-project-vision.md

01-business-requirements.md

02-functional-requirements.md

03-non-functional-requirements.md

04-tech-stack.md

05-system-architecture.md

06-folder-structure.md

07-database-design.md

08-authentication.md

09-multi-tenancy.md

10-user-roles.md

11-ui-design-system.md

12-navigation.md

13-module-appointments.md

14-module-digital-menu.md

15-module-crm.md

16-api-design.md

17-security.md

18-deployment.md

19-development-roadmap.md

20-coding-standards.md

Cada documento debe indicar claramente:

- Objetivo
- Alcance
- Dependencias
- Decisiones tomadas
- Posibles mejoras futuras

No avances al siguiente documento hasta terminar completamente el actual.

Comienza únicamente generando el documento:

00-project-vision.md

Cuando este documento esté finalizado continuaremos con el siguiente. 

---

## Assistant (Plan · Big Pickle · 43.7s)

_Thinking:_

The user wants me to act as a Software Architect, Product Owner, and Senior Full Stack Engineer. They want me to create comprehensive documentation for a SaaS multi-tenant project before any development begins.

They want me to start with the first document: `00-project-vision.md`

However, I'm in PLAN MODE - I can only read, search, and plan. I CANNOT write any files or make any changes. This is explicitly stated in the system reminder.

Let me acknowledge the user's request and explain that I'm in read-only/plan mode, so I cannot create files. But I can help them plan the document content.

Actually, looking more carefully at the instructions, it says "You are in READ-ONLY phase. STRICTLY FORBIDDEN: ANY file edits, modifications, or system changes."

So I need to tell the user that I'm currently in plan/read-only mode and cannot create files. However, I can discuss the content and plan what the document should contain.

Let me respond appropriately.

Estoy en **modo plan (read-only)** y no puedo crear archivos ni modificar el sistema en este momento. Sin embargo, puedo ayudarte a **planificar y definir el contenido** del documento `00-project-vision.md` para que cuando se autoricen los cambios, lo generemos sin perder tiempo.

¿Quieres que procedamos a definir juntos el contenido detallado de `00-project-vision.md`? Podría estructurarlo y presentártelo para validación, y luego lo escribiré cuando tenga permisos de escritura.

O si prefieres, podemos esperar a que salgas del modo plan para comenzar directamente con la generación.

---

## User

procede primero con la difinicion del contenido detallado de 00-project-vision.md

---

## Assistant (Plan · Big Pickle · 9.9s)

_Thinking:_

The user wants me to define the detailed content of `00-project-vision.md` while in plan mode (read-only). I cannot create files, but I can present the detailed content/structure for validation. Let me do a quick exploration of the workspace to understand what already exists.

**Tool: read**

**Input:**
```json
{
  "filePath": "C:\\Users\\David\\Documents\\WORK\\sistema_citas_cartas_crm"
}
```

**Output:**
```
<path>C:\Users\David\Documents\WORK\sistema_citas_cartas_crm</path>
<type>directory</type>
<entries>


(0 entries)
</entries>
```

---

## Assistant (Plan · Big Pickle · 122.1s)

_Thinking:_

The workspace is empty. Let me proceed to define the detailed content of `00-project-vision.md`. Since I'm in plan mode, I'll present the full content plan for validation before we write it.

Let me think about what should go into a project vision document. This is the foundational document that sets the vision, mission, scope, and context for the entire project.

Perfecto. El workspace está vacío, empezamos desde cero.

Aquí está el contenido detallado que propongo para **`00-project-vision.md`**:

---

## Estructura propuesta de `00-project-vision.md`

### 1. Título del Proyecto
**NexoNegocio** (nombre tentativo — *a validar contigo*)

### 2. Resumen Ejecutivo (1 párrafo)
Plataforma SaaS multi-tenant que digitaliza la operación integral de pequeños y medianos negocios. Unifica en un solo sistema: agenda de citas, carta digital con pedidos, y CRM. Cada negocio opera con datos completamente aislados desde una única instancia de la aplicación.

### 3. Problema que Resuelve
- Los pequeños negocios usan múltiples herramientas inconexas (Google Calendar, menú PDF, WhatsApp para pedidos, Excel para clientes).
- No existe una solución integral, asequible y sencilla pensada para el dueño del negocio.
- Las soluciones existentes son monolíticas, difíciles de personalizar o no escalan con el negocio.

### 4. Visión
Convertirse en el sistema operativo estándar para pequeños y medianos negocios en Latinoamérica, permitiendo que cualquier negocio pueda administrarse completamente desde una única plataforma digital sin necesidad de conocimientos técnicos.

### 5. Misión
Proveer una plataforma modular, segura y escalable que digitalice la operación diaria de los negocios (citas, ventas y clientes) eliminando la fricción de usar herramientas separadas, con una experiencia de usuario simple pero potente.

### 6. Propuesta de Valor
- **Todo en uno**: agenda + carta digital + CRM en un solo lugar.
- **Multi-tenant real**: cada negocio es independiente; datos totalmente aislados.
- **Sin inversión inicial**: SaaS por suscripción, zero código.
- **Modular**: el negocio paga solo por los módulos que necesita.
- **Pensado para dueños de negocio**: interfaz simple, mobile-first, sin curvas de aprendizaje.

### 7. Público Objetivo
| Perfil | Descripción |
|---|---|
| Dueño de negocio | Persona que opera un pequeño comercio (peluquería, bar, taller, clínica pequeña, etc.) |
| Administrador | Empleado que gestiona la operación diaria |
| Cliente final | Usuario que agenda citas o pide desde la carta digital |

### 8. Funcionalidades Core (Primera Versión)
- **Módulo 1**: Sistema de Citas (agenda, horarios, servicios, empleados, reservas, cancelaciones, reprogramaciones).
- **Módulo 2**: Carta Digital con gestión de pedidos (menús, categorías, productos, variantes, QR por mesa, carrito, pedidos, estados).
- **Módulo 3**: CRM básico (clientes, historial, notas, etiquetas, fidelización).

### 9. KPIs de Éxito del Producto
- Tiempo promedio en crear una reserva < 30 segundos.
- Tiempo promedio en tomar un pedido desde carta digital < 20 segundos.
- Zero downtime en operación crítica (horario laboral).
- Onboarding de un nuevo negocio en < 5 minutos.

### 10. Principios Rectores de Arquitectura
1. **Clean Architecture**: separación estricta de capas (dominio, aplicación, infraestructura, presentación).
2. **Modularidad**: cada módulo es un paquete independiente que puede existir sin los demás.
3. **Multi-tenancy a nivel de fila (Row-Level Security)**: datos aislados por `tenant_id` usando RLS de PostgreSQL/Supabase.
4. **Mobile-first**: toda interfaz se diseña primero para móvil, luego se expande a desktop.
5. **API-first**: toda funcionalidad se expone vía API REST desde Supabase (RLS policies) o Edge Functions.
6. **i18n desde el día 1**: todas las cadenas de texto pasan por un sistema de traducciones.
7. **TypeScript estricto**: cero `any`, tipado completo extremo a extremo.

### 11. Restricciones Conocidas
- Sin backend propio: todo el backend es Supabase (PostgreSQL, Auth, Storage, Realtime, RLS, Edge Functions).
- Frontend 100% Vue 3 + Vuetify + Pinia + Vite.
- Hosting en Vercel.
- Sin aplicaciones nativas móviles (la web app es responsive con PWA futura).

### 12. Riesgos Iniciales
| Riesgo | Mitigación |
|---|---|
| Supabase no escala para miles de tenants | Diseñar desde el inicio con índices compuestos (tenant_id + timestamp), particionamiento lógico, y monitoreo de queries lentas |
| Edge Functions frías (cold starts) | Solo usarlas cuando RLS no sea suficiente; el 90% de la lógica va en RLS |
| Complejidad de RLS multi-tenant | Políticas genéricas por módulo, auditables, con tests automatizados |
| Vuetify puede ser pesado en móvil | Tree-shaking, lazy loading de componentes, análisis de bundle |

### 13. Roadmap de Alto Nivel
| Fase | Contenido |
|---|---|
| Fase 0 | Documentación completa (este proceso) |
| Fase 1 | Setup del proyecto, autenticación, multi-tenancy, layout base |
| Fase 2 | Módulo Citas |
| Fase 3 | Módulo Carta Digital |
| Fase 4 | Módulo CRM |
| Fase 5 | Beta cerrada, feedback, iteración |
| Fase 6 | Producción |

### 14. Glosario
| Término | Definición |
|---|---|
| Tenant | Empresa o negocio registrado en la plataforma |
| Propietario | Usuario con rol dueño del tenant |
| Multi-tenancy | Arquitectura donde múltiples inquilinos comparten la misma instancia de aplicación con datos aislados |
| RLS | Row-Level Security, políticas de seguridad a nivel de fila en PostgreSQL |
| Módulo | Unidad funcional independiente (citas, carta digital, CRM) |

---

**Puntos a validar contigo antes de escribir el archivo:**

1. **Nombre del proyecto**: ¿"NexoNegocio" te parece bien? ¿O prefieres otro?
2. **Mercado objetivo**: ¿Latinoamérica inicialmente? ¿O global desde el inicio?
3. **Modelo de negocio**: ¿Suscripción mensual por módulo? ¿Plan único con todo incluido? ¿Freemium?
4. **El roadmap**: ¿6 fases está bien o quieres comprimir/expandir algo?

Si confirmas esta estructura, procedo a crear el archivo `docs/00-project-vision.md` con el contenido completo tan pronto tengamos permisos de escritura.

---

