# 01 — Business Requirements

## Objetivo

Definir los requisitos de negocio del sistema desde la perspectiva de los actores involucrados. Este documento traduce la visión del producto (00-project-vision.md) en necesidades concretas de negocio que los módulos deben satisfacer.

---

## Alcance

Cubre los requisitos de negocio para los tres módulos iniciales (Citas, Carta Digital, CRM) y la plataforma base. No incluye especificaciones técnicas ni funcionales detalladas (se cubren en documentos posteriores).

---

## Dependencias

- 00-project-vision.md — Define la visión y los principios rectores.

---

## Actores del Sistema

### 1. Super Administrador

- **Descripción**: Personal interno de Nexo Platform. Administra la plataforma completa.
- **Necesidades de negocio**:
  - Gestionar tenants (crear, suspender, eliminar negocios).
  - Monitorear el estado general de la plataforma.
  - Acceder a estadísticas globales de uso.
  - Gestionar planes y precios.
  - Ver logs de actividad de cualquier tenant sin violar el aislamiento (solo metadatos).
  - Gestionar actualizaciones y feature flags.

### 2. Propietario del Negocio

- **Descripción**: Dueño o gerente general del negocio que se registra en la plataforma.
- **Necesidades de negocio**:
  - Configurar el perfil de su negocio (nombre, logo, dirección, teléfono, colores).
  - Invitar administradores y empleados.
  - Definir horarios de operación.
  - Configurar servicios, menús y productos.
  - Ver reportes y estadísticas de su negocio.
  - Gestionar suscripción y plan.
  - Personalizar la experiencia de marca para sus clientes.
  - Activar/desactivar módulos.

### 3. Administrador

- **Descripción**: Personal del negocio con permisos de gestión, pero sin acceso a configuración de pago o plan.
- **Necesidades de negocio**:
  - Gestionar empleados (alta, baja, horarios).
  - Gestionar servicios y productos.
  - Ver y gestionar reservas y pedidos.
  - Gestionar clientes en el CRM.
  - Ver reportes operativos (citas del día, pedidos pendientes).
  - Gestionar etiquetas y notas de clientes.

### 4. Empleado

- **Descripción**: Personal operativo del negocio (recepcionista, mesero, estilista, etc.).
- **Necesidades de negocio**:
  - Ver su agenda personal (próximas citas).
  - Marcar asistencia / inicio de jornada.
  - Tomar pedidos desde la carta digital.
  - Actualizar estado de pedidos (preparando, listo, entregado).
  - Registrar notas en citas o clientes.
  - Ver información básica del cliente durante una cita o pedido.

### 5. Cliente

- **Descripción**: Usuario final que consume los servicios del negocio.
- **Necesidades de negocio**:
  - Explorar la carta digital (sin registrarse).
  - Hacer pedidos desde su mesa (escaneando QR).
  - Agendar citas online.
  - Recibir recordatorios de citas.
  - Cancelar o reprogramar citas.
  - Ver historial de sus citas y pedidos.
  - Crear una cuenta opcional para agilizar futuras reservas.
  - Recibir notificaciones de cambios de estado en pedidos.

---

## Requisitos de Negocio por Módulo

### Base de la Plataforma (Cross-module)

| ID     | Requisito                                                                                                     | Prioridad | Actor Principal    | Justificación                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------- | --------- | ------------------ | ------------------------------------------------------------------- |
| BR-001 | El sistema debe permitir el registro de un nuevo negocio (tenant) con email, contraseña y nombre del negocio. | Alta      | Propietario        | Es el punto de entrada al producto. Sin registro no hay conversión. |
| BR-002 | El sistema debe permitir al propietario configurar el perfil público de su negocio.                           | Alta      | Propietario        | Cada negocio necesita su identidad visual.                          |
| BR-003 | El sistema debe invitar empleados por email y asignarles un rol.                                              | Alta      | Propietario, Admin | El negocio necesita incorporar a su personal.                       |
| BR-004 | El sistema debe proporcionar un dashboard con indicadores clave del negocio.                                  | Alta      | Propietario, Admin | Los dueños necesitan visibilidad del estado de su negocio.          |
| BR-005 | El sistema debe soportar múltiples idiomas en la interfaz.                                                    | Media     | Todos              | Los negocios pueden tener clientes de diferentes idiomas.           |
| BR-006 | El sistema debe permitir al propietario activar/desactivar módulos.                                           | Alta      | Propietario        | No todos los negocios necesitan todos los módulos.                  |
| BR-007 | El sistema debe enviar notificaciones por email y/o SMS para recordatorios de citas y cambios de estado.      | Alta      | Cliente, Empleado  | Reduce ausencias y mejora la comunicación.                          |
| BR-008 | El sistema debe permitir la personalización de colores y logo por negocio (whitelabel básico).                | Media     | Propietario        | Refuerza la identidad de marca del negocio.                         |
| BR-009 | El sistema debe ofrecer un período de prueba gratuito de 14 días sin tarjeta de crédito.                      | Alta      | Propietario        | Reduce la fricción en el registro.                                  |
| BR-010 | El sistema debe proporcionar logs de acceso y actividad auditables.                                           | Alta      | Super Admin        | Requisito de seguridad y cumplimiento.                              |

### Módulo: Sistema de Citas

| ID     | Requisito                                                                                     | Prioridad | Actor Principal    | Justificación                                        |
| ------ | --------------------------------------------------------------------------------------------- | --------- | ------------------ | ---------------------------------------------------- |
| BR-101 | El negocio debe poder definir los servicios que ofrece con duración, precio y descripción.    | Alta      | Propietario, Admin | Sin servicios no hay citas que agendar.              |
| BR-102 | El negocio debe poder asignar empleados a servicios específicos.                              | Alta      | Propietario, Admin | No todos los empleados realizan todos los servicios. |
| BR-103 | El negocio debe poder definir horarios de atención generales y por empleado.                  | Alta      | Propietario, Admin | Cada negocio y empleado tiene horarios distintos.    |
| BR-104 | El negocio debe poder definir bloques de descanso dentro de la jornada.                       | Alta      | Propietario, Admin | Los empleados tienen pausas para comida, etc.        |
| BR-105 | El cliente debe poder agendar una cita online seleccionando servicio, empleado, fecha y hora. | Alta      | Cliente            | Es la funcionalidad principal del módulo.            |
| BR-106 | El sistema debe validar disponibilidad en tiempo real al agendar.                             | Alta      | Cliente            | Evita la doble reserva.                              |
| BR-107 | El sistema debe permitir al cliente cancelar su cita con al menos 2 horas de antelación.      | Alta      | Cliente            | Política de cancelación estándar.                    |
| BR-108 | El sistema debe permitir reprogramar una cita existente a otra fecha/hora disponible.         | Alta      | Cliente            | Mejor que cancelar y crear nueva.                    |
| BR-109 | El sistema debe enviar recordatorio automático 24h antes de la cita.                          | Alta      | Cliente            | Reduce ausencias.                                    |
| BR-110 | El empleado debe poder ver su agenda del día.                                                 | Alta      | Empleado           | Necesita saber qué citas tiene.                      |
| BR-111 | El empleado debe poder marcar una cita como completada, no asistió o cancelada.               | Alta      | Empleado           | Para mantener el historial preciso.                  |
| BR-112 | El propietario debe poder ver el historial completo de citas con filtros.                     | Media     | Propietario, Admin | Para análisis y seguimiento.                         |
| BR-113 | El sistema debe bloquear automáticamente horarios no laborables (días festivos, cierres).     | Media     | Propietario, Admin | Evita reservas en días cerrados.                     |

### Módulo: Carta Digital

| ID     | Requisito                                                                                                    | Prioridad | Actor Principal    | Justificación                                  |
| ------ | ------------------------------------------------------------------------------------------------------------ | --------- | ------------------ | ---------------------------------------------- |
| BR-201 | El negocio debe poder crear categorías de productos (entradas, platos fuertes, bebidas, postres).            | Alta      | Propietario, Admin | Organización del menú.                         |
| BR-202 | El negocio debe poder crear productos con nombre, descripción, precio, imagen y categoría.                   | Alta      | Propietario, Admin | El contenido principal de la carta.            |
| BR-203 | El negocio debe poder definir variantes de producto (tamaños, presentaciones).                               | Alta      | Propietario, Admin | Un producto puede tener múltiples opciones.    |
| BR-204 | El negocio debe poder definir extras o modificadores para productos.                                         | Alta      | Propietario, Admin | Personalización de pedidos.                    |
| BR-205 | El sistema debe generar un QR único por mesa.                                                                | Alta      | Propietario, Admin | Los clientes acceden a la carta desde su mesa. |
| BR-206 | El cliente debe poder ver la carta digital escaneando un QR (sin registro).                                  | Alta      | Cliente            | Acceso inmediato sin barreras.                 |
| BR-207 | El cliente debe poder agregar productos al carrito y personalizarlos (variantes, extras, cantidad).          | Alta      | Cliente            | Flujo de compra estándar.                      |
| BR-208 | El cliente debe poder enviar el pedido a la cocina/barra.                                                    | Alta      | Cliente            | Inicia el proceso de preparación.              |
| BR-209 | El empleado debe recibir notificación en tiempo real de nuevos pedidos.                                      | Alta      | Empleado           | Agiliza la atención.                           |
| BR-210 | El empleado debe poder actualizar el estado del pedido (pendiente, preparando, listo, entregado, cancelado). | Alta      | Empleado           | Trazabilidad del pedido.                       |
| BR-211 | El cliente debe poder ver el estado de su pedido en tiempo real.                                             | Alta      | Cliente            | Transparencia y buena experiencia.             |
| BR-212 | El sistema debe asociar cada pedido a una mesa específica.                                                   | Alta      | Empleado           | Para saber a dónde llevar el pedido.           |
| BR-213 | El negocio debe poder gestionar múltiples menús (menú de día, menú nocturno, menú de fin de semana).         | Media     | Propietario, Admin | Flexibilidad según horario o temporada.        |
| BR-214 | El sistema debe permitir activar/desactivar productos (agotados temporalmente).                              | Alta      | Empleado           | Evita pedidos de productos no disponibles.     |

### Módulo: CRM

| ID     | Requisito                                                                                                    | Prioridad | Actor Principal              | Justificación                                         |
| ------ | ------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------- | ----------------------------------------------------- |
| BR-301 | El sistema debe registrar automáticamente a los clientes que crean una cuenta o realizan una reserva.        | Alta      | Cliente                      | Construcción automática de la base de datos.          |
| BR-302 | El negocio debe poder ver el perfil completo de cada cliente (datos personales, historial, notas).           | Alta      | Propietario, Admin, Empleado | Atención personalizada.                               |
| BR-303 | El negocio debe poder agregar notas privadas a cada cliente.                                                 | Alta      | Admin, Empleado              | Registrar preferencias, incidencias, etc.             |
| BR-304 | El negocio debe poder etiquetar clientes (VIP, frecuente, nuevo, etc.).                                      | Alta      | Admin                        | Segmentación para estrategias comerciales.            |
| BR-305 | El sistema debe mostrar el historial de citas y pedidos de cada cliente.                                     | Alta      | Admin, Empleado              | Contexto completo para la atención.                   |
| BR-306 | El sistema debe permitir al propietario definir un programa de fidelización (puntos por visita, descuentos). | Media     | Propietario                  | Incentiva la recurrencia.                             |
| BR-307 | El cliente debe poder ver sus puntos acumulados y canjearlos.                                                | Media     | Cliente                      | Engagement con el programa de fidelización.           |
| BR-308 | El sistema debe mostrar estadísticas básicas (clientes nuevos, clientes recurrentes, tasa de retención).     | Media     | Propietario, Admin           | Métricas de salud del negocio.                        |
| BR-309 | El negocio debe poder buscar clientes por nombre, teléfono, email o etiqueta.                                | Alta      | Admin, Empleado              | Encontrar clientes rápidamente.                       |
| BR-310 | El cliente debe poder actualizar sus datos personales desde su perfil.                                       | Media     | Cliente                      | Autogestión de datos.                                 |
| BR-311 | El sistema debe contar el número de visitas de cada cliente automáticamente.                                 | Alta      | Sistema                      | Base para el programa de fidelización y segmentación. |

---

## Reglas de Negocio

| ID     | Regla                                                                                    | Descripción                                                     | Módulo        |
| ------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------- |
| BR-R01 | Un cliente no puede tener dos citas simultáneas en el mismo negocio.                     | Valida que no haya solapamiento de citas para el mismo cliente. | Citas         |
| BR-R02 | Un empleado no puede tener dos citas en el mismo horario.                                | Valida disponibilidad del empleado.                             | Citas         |
| BR-R03 | Una cita no puede crearse en el pasado.                                                  | La fecha y hora deben ser futuras.                              | Citas         |
| BR-R04 | La cancelación solo es posible hasta 2 horas antes de la cita.                           | Configurable por negocio.                                       | Citas         |
| BR-R05 | Un pedido no puede modificarse después de estar en estado "preparando".                  | Solo se puede cancelar, no editar.                              | Carta Digital |
| BR-R06 | Un producto marcado como "agotado" no aparece en la carta digital activa.                | Oculto automáticamente.                                         | Carta Digital |
| BR-R07 | Los puntos de fidelización caducan a los 6 meses sin actividad.                          | Configurable por negocio.                                       | CRM           |
| BR-R08 | Un empleado solo puede ver citas y pedidos en los que está asignado o los de su negocio. | Restricción por rol y tenant.                                   | Cross         |
| BR-R09 | Un cliente solo puede ver sus propios datos (historial, citas, pedidos).                 | Privacidad del cliente.                                         | Cross         |
| BR-R10 | El email del cliente debe ser único dentro de un mismo negocio.                          | Un cliente no puede duplicarse dentro del mismo tenant.         | CRM           |

---

## KPI de Negocio

Estos KPI guiarán las decisiones de priorización y las métricas de éxito del producto:

| KPI                              | Descripción                                  | Meta (primer año) |
| -------------------------------- | -------------------------------------------- | ----------------- |
| Tenants activos                  | Negocios con suscripción activa              | 200               |
| Tasa de conversión prueba → pago | % de trials que se convierten                | > 30%             |
| Citas agendadas por mes          | Volumen de transacciones                     | 10,000            |
| Pedidos por mes                  | Volumen de transacciones                     | 15,000            |
| Clientes registrados             | Usuarios (clientes finales) en la plataforma | 50,000            |
| Tasa de no-show                  | % de citas no atendidas                      | < 10%             |
| NPS (Net Promoter Score)         | Satisfacción de los propietarios             | > 50              |
| Tiempo de actividad (uptime)     | Disponibilidad del sistema                   | 99.9%             |

---

## Decisiones Tomadas

| Decisión                 | Opción Elegida      | Alternativas                 | Justificación                                                                                                                                       |
| ------------------------ | ------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notificaciones           | Email + SMS         | Solo email, solo SMS, push   | Email es obligatorio (bajo costo). SMS como complemento opcional (alta tasa de apertura). Notificaciones push se consideran para app nativa futura. |
| Registro de clientes     | Opcional            | Obligatorio                  | El cliente puede agendar o pedir sin cuenta (guest checkout). La cuenta es opcional y facilita el historial. Se reduce la fricción.                 |
| Programa de fidelización | Basado en puntos    | Cashback, visitas, niveles   | Puntos es el modelo más universal y fácil de entender. Escalable a niveles en el futuro.                                                            |
| QR por mesa              | Estático            | Dinámico por sesión          | QR estático es más simple y no requiere generación por sesión. La mesa se identifica por parámetro en la URL.                                       |
| Período de prueba        | 14 días sin tarjeta | 7 días, 30 días, con tarjeta | 14 días es tiempo suficiente para evaluar el producto. Sin tarjeta reduce fricción.                                                                 |

---

## Posibles Mejoras Futuras

- Módulo de facturación electrónica (CFDI, Facturae, etc. según país del negocio).
- Módulo de inventarios (control de stock vinculado a pedidos).
- Módulo de nómina para empleados del negocio.
- Integración con calendarios externos (Google Calendar, Outlook).
- Integración con WhatsApp Business para notificaciones y atención.
- Pasarela de pagos integrada (cobro al cliente al reservar o al hacer pedido).
- Multi-sucursal para un mismo negocio.
- Portal del cliente con autogestión completa.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 02-functional-requirements.md_
