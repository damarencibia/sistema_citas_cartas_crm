# 02 — Functional Requirements

## Objetivo

Desglosar los requisitos de negocio (01-business-requirements.md) en requisitos funcionales concretos que definen qué debe hacer el sistema. Cada requisito funcional es específico, medible y comprobable mediante pruebas.

---

## Alcance

Cubre todos los requisitos funcionales de los módulos iniciales y la plataforma base. Los requisitos están organizados por módulo y por funcionalidad. No cubre detalles de implementación técnica (API, base de datos, UI).

---

## Dependencias

- 01-business-requirements.md — Define los requisitos de negocio que estos requisitos funcionales implementan.

---

## Convenciones

- **ID**: FR-XXX (Functional Requirement)
- **Prioridad**: Crítica, Alta, Media, Baja
- **Trazabilidad**: BR-XXX (requisito de negocio que satisface)
- **Criterio de aceptación**: Condición que debe cumplirse para considerar el requisito implementado correctamente

---

## Módulo Base (Plataforma)

### FR-001: Registro de negocio (tenant)

| Campo                       | Valor                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe permitir que un propietario registre su negocio proporcionando email, contraseña y nombre del negocio. |
| **Prioridad**               | Crítica                                                                                                                |
| **Trazabilidad**            | BR-001                                                                                                                 |
| **Criterios de aceptación** |                                                                                                                        |
|                             | 1. El formulario de registro solicita: email, contraseña (con confirmación), nombre del negocio.                       |
|                             | 2. Al enviar, se crea un nuevo tenant, un nuevo usuario propietario y se asigna al tenant.                             |
|                             | 3. Se envía un email de verificación a la dirección proporcionada.                                                     |
|                             | 4. El tenant se crea con estado "trial" y fecha de expiración = fecha actual + 14 días.                                |
|                             | 5. Si el email ya existe, se muestra error: "Email ya registrado".                                                     |
|                             | 6. Si el nombre del negocio ya existe (en cualquier tenant), se muestra error: "Nombre de negocio no disponible".      |
|                             | 7. La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.                                   |

### FR-002: Inicio de sesión

| Campo                       | Valor                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe autenticar usuarios (propietarios, administradores, empleados) mediante email y contraseña. |
| **Prioridad**               | Crítica                                                                                                     |
| **Trazabilidad**            | BR-001                                                                                                      |
| **Criterios de aceptación** |                                                                                                             |
|                             | 1. El formulario de login solicita email y contraseña.                                                      |
|                             | 2. Si las credenciales son válidas, se crea una sesión y se redirige al dashboard del negocio.              |
|                             | 3. Si las credenciales son inválidas, se muestra error: "Email o contraseña incorrectos".                   |
|                             | 4. Después de 5 intentos fallidos, la cuenta se bloquea por 15 minutos.                                     |
|                             | 5. El usuario puede marcar "Recordar sesión" (token persistente por 30 días).                               |
|                             | 6. El login debe verificar que el usuario pertenece a un tenant activo (no suspendido ni expirado).         |

### FR-003: Recuperación de contraseña

| Campo                       | Valor                                                                           |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe permitir a los usuarios recuperar su contraseña mediante email. |
| **Prioridad**               | Alta                                                                            |
| **Trazabilidad**            | BR-001                                                                          |
| **Criterios de aceptación** |                                                                                 |
|                             | 1. El usuario ingresa su email y recibe un link de recuperación.                |
|                             | 2. El link expira en 1 hora.                                                    |
|                             | 3. Al seguir el link, el usuario puede establecer una nueva contraseña.         |
|                             | 4. La nueva contraseña debe cumplir las mismas reglas que en FR-001.            |

### FR-004: Perfil del negocio

| Campo                       | Valor                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El propietario debe poder configurar el perfil público de su negocio.                                                                                            |
| **Prioridad**               | Alta                                                                                                                                                             |
| **Trazabilidad**            | BR-002, BR-008                                                                                                                                                   |
| **Criterios de aceptación** |                                                                                                                                                                  |
|                             | 1. El formulario de perfil permite editar: nombre, descripción, logo (imagen), colores primario y secundario, teléfono, dirección, email de contacto, sitio web. |
|                             | 2. El logo se sube a Supabase Storage y se optimiza automáticamente (WebP, max 200KB).                                                                           |
|                             | 3. Los colores se aplican en tiempo real en la vista previa del tema.                                                                                            |
|                             | 4. Los cambios se reflejan inmediatamente en el portal público del negocio.                                                                                      |
|                             | 5. El nombre del negocio se valida como único dentro de la plataforma.                                                                                           |

### FR-005: Gestión de empleados

| Campo                       | Valor                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| **Descripción**             | El propietario o administrador debe poder invitar, listar, editar y desactivar empleados.          |
| **Prioridad**               | Alta                                                                                               |
| **Trazabilidad**            | BR-003                                                                                             |
| **Criterios de aceptación** |                                                                                                    |
|                             | 1. El formulario de invitación solicita: nombre, email y rol (administrador o empleado).           |
|                             | 2. Al enviar, se envía un email al invitado con un link para establecer su contraseña y acceder.   |
|                             | 3. El link de invitación expira en 7 días.                                                         |
|                             | 4. El listado de empleados muestra: nombre, email, rol, estado (activo/inactivo), última conexión. |
|                             | 5. Se puede desactivar un empleado (no eliminarlo lógicamente).                                    |
|                             | 6. Al desactivar, el empleado no puede iniciar sesión.                                             |
|                             | 7. No se puede desactivar al único propietario del tenant.                                         |

### FR-006: Dashboard del negocio

| Campo                       | Valor                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe mostrar un dashboard con indicadores clave del negocio.                                                                                        |
| **Prioridad**               | Alta                                                                                                                                                           |
| **Trazabilidad**            | BR-004                                                                                                                                                         |
| **Criterios de aceptación** |                                                                                                                                                                |
|                             | 1. El dashboard muestra: citas de hoy (totales, completadas, pendientes, canceladas), clientes nuevos (este mes), ingresos estimados del día. |
|                             | 2. Los datos se actualizan en tiempo real (usando Supabase Realtime).                                                                                          |
|                             | 3. Cada indicador es un enlace a la vista detallada correspondiente.                                                                                           |
|                             | 4. El dashboard es responsivo y se ve correctamente en móvil.                                                                                                  |

### FR-007: Notificaciones

| Campo                       | Valor                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| **Descripción**             | El sistema debe enviar notificaciones por email y SMS para eventos clave.                  |
| **Prioridad**               | Alta                                                                                       |
| **Trazabilidad**            | BR-007                                                                                     |
| **Criterios de aceptación** |                                                                                            |
|                             | 1. Se envía email de confirmación al agendar una cita.                                     |
|                             | 2. Se envía email recordatorio 24h antes de la cita.                                       |
|                             | 3. Se envía email al cancelar o reprogramar una cita.                                      |
|                             | 4. Las notificaciones SMS se envían solo si el negocio tiene configurado un proveedor SMS. |
|                             | 5. El negocio puede configurar qué notificaciones enviar y a quién.                        |

### FR-008: Activación/desactivación de módulos

| Campo                       | Valor                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El propietario debe poder activar o desactivar módulos para su negocio.                                   |
| **Prioridad**               | Alta                                                                                                      |
| **Trazabilidad**            | BR-006                                                                                                    |
| **Criterios de aceptación** |                                                                                                           |
|                             | 1. La página de configuración muestra todos los módulos disponibles con su estado (activado/desactivado). |
|                             | 2. Al desactivar un módulo, todo su menú de navegación se oculta.                                         |
|                             | 3. Al desactivar un módulo, los datos existentes se conservan pero no son accesibles desde la UI.         |
|                             | 4. La activación/desactivación no requiere recarga de página.                                             |

### FR-009: Gestión de suscripción

| Campo                       | Valor                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Descripción**             | El propietario debe poder ver y gestionar su suscripción y plan.                                  |
| **Prioridad**               | Media                                                                                             |
| **Trazabilidad**            | BR-009                                                                                            |
| **Criterios de aceptación** |                                                                                                   |
|                             | 1. La página de suscripción muestra: plan actual, fecha de renovación, precio, módulos incluidos. |
|                             | 2. Si está en período de prueba, muestra días restantes.                                          |
|                             | 3. El propietario puede ver los planes disponibles y sus características.                         |
|                             | 4. (Futuro) El propietario puede cambiar de plan.                                                 |

### FR-010: Gestión de logs de auditoría

| Campo                       | Valor                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe registrar eventos clave de seguridad y acceso.                                                                                                |
| **Prioridad**               | Alta                                                                                                                                                          |
| **Trazabilidad**            | BR-010                                                                                                                                                        |
| **Criterios de aceptación** |                                                                                                                                                               |
|                             | 1. Se registra: inicio de sesión (éxito/fallo), cierre de sesión, cambios en configuración del negocio, cambios en empleados, cambios en servicios. |
|                             | 2. Cada registro incluye: timestamp, usuario, tenant, acción, detalles, dirección IP.                                                                         |
|                             | 3. El super administrador puede ver logs de cualquier tenant.                                                                                                 |
|                             | 4. Los logs no son editables ni eliminables por nadie.                                                                                                        |
|                             | 5. Los logs se conservan por 12 meses.                                                                                                                        |

---

## Módulo: Sistema de Citas

### FR-101: Gestión de servicios

| Campo                       | Valor                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El negocio debe poder crear, editar, listar y desactivar servicios.                                                                                  |
| **Prioridad**               | Crítica                                                                                                                                              |
| **Trazabilidad**            | BR-101                                                                                                                                               |
| **Criterios de aceptación** |                                                                                                                                                      |
|                             | 1. El formulario de servicio incluye: nombre, descripción, duración (minutos), precio, color (para agenda), categoría (opcional), imagen (opcional). |
|                             | 2. La duración debe ser en minutos, múltiplo de 5, mínimo 5, máximo 480.                                                                             |
|                             | 3. El precio debe ser ≥ 0 (0 = gratuito).                                                                                                            |
|                             | 4. Se puede desactivar un servicio sin eliminarlo.                                                                                                   |
|                             | 5. Los servicios desactivados no aparecen en el formulario de reserva pública.                                                                       |
|                             | 6. El listado muestra nombre, duración, precio, estado, empleados asignados.                                                                         |

### FR-102: Asignación de servicios a empleados

| Campo                       | Valor                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El administrador debe poder asignar qué servicios puede realizar cada empleado.                          |
| **Prioridad**               | Alta                                                                                                     |
| **Trazabilidad**            | BR-102                                                                                                   |
| **Criterios de aceptación** |                                                                                                          |
|                             | 1. En el perfil del empleado, hay una sección "Servicios" con checkboxes de todos los servicios activos. |
|                             | 2. Un empleado puede tener 1 o N servicios asignados.                                                    |
|                             | 3. Si un empleado no tiene ningún servicio asignado, no aparece en el formulario de reserva.             |
|                             | 4. Al desactivar un servicio, se desasigna automáticamente de todos los empleados.                       |

### FR-103: Gestión de horarios

| Campo                       | Valor                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El negocio debe poder definir horarios de atención generales y por empleado.                                                     |
| **Prioridad**               | Crítica                                                                                                                          |
| **Trazabilidad**            | BR-103, BR-104                                                                                                                   |
| **Criterios de aceptación** |                                                                                                                                  |
|                             | 1. La configuración de horarios permite definir para cada día de la semana: hora de apertura, hora de cierre, y si está cerrado. |
|                             | 2. Se puede definir un horario general del negocio y horarios específicos por empleado.                                          |
|                             | 3. Se pueden definir bloques de descanso (ej: 13:00-14:00) dentro de la jornada.                                                 |
|                             | 4. Se pueden definir excepciones por fecha (días festivos, cierres especiales).                                                  |
|                             | 5. El horario del empleado no puede exceder el horario del negocio.                                                              |
|                             | 6. Si no se define horario específico para un empleado, usa el horario general.                                                  |

### FR-104: Reserva online (cliente)

| Campo                       | Valor                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El cliente debe poder agendar una cita online.                                                           |
| **Prioridad**               | Crítica                                                                                                  |
| **Trazabilidad**            | BR-105, BR-106                                                                                           |
| **Criterios de aceptación** |                                                                                                          |
|                             | 1. El cliente accede al portal de reservas del negocio (subdominio o URL pública).                       |
|                             | 2. Selecciona un servicio (se muestran solo servicios activos).                                          |
|                             | 3. Selecciona un empleado (se muestran solo empleados que realizan el servicio y tienen disponibilidad). |
|                             | 4. Selecciona una fecha (se muestran solo fechas con disponibilidad, excluyendo días cerrados).          |
|                             | 5. Selecciona una hora (se muestran solo slots disponibles basados en duración del servicio + horarios). |
|                             | 6. Ingresa sus datos: nombre, email, teléfono (obligatorios).                                            |
|                             | 7. Opcionalmente puede agregar notas para la cita.                                                       |
|                             | 8. Al confirmar, la cita se crea con estado "confirmada".                                                |
|                             | 9. El sistema valida disponibilidad en el momento exacto de la confirmación.                             |
|                             | 10. Si el slot ya no está disponible, se muestra un mensaje y se le pide seleccionar otro horario.       |
|                             | 11. Se envía email de confirmación al cliente y notificación al negocio.                                 |

### FR-105: Agenda del empleado

| Campo                       | Valor                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **Descripción**             | El empleado debe poder ver su agenda personal y las citas del día.                    |
| **Prioridad**               | Alta                                                                                  |
| **Trazabilidad**            | BR-110                                                                                |
| **Criterios de aceptación** |                                                                                       |
|                             | 1. La vista de agenda muestra las citas del día en formato lista o timeline.          |
|                             | 2. Cada cita muestra: hora, cliente, servicio, duración, estado, notas.               |
|                             | 3. El empleado puede filtrar por estado (todas, pendientes, completadas, canceladas). |
|                             | 4. La agenda se actualiza en tiempo real.                                             |
|                             | 5. El empleado puede ver agendas de días anteriores y futuros (navegación).           |

### FR-106: Gestión de estado de citas

| Campo                       | Valor                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Descripción**             | El empleado debe poder cambiar el estado de una cita.                                             |
| **Prioridad**               | Alta                                                                                              |
| **Trazabilidad**            | BR-111                                                                                            |
| **Criterios de aceptación** |                                                                                                   |
|                             | 1. Estados posibles: confirmada, en curso, completada, no asistió, cancelada.                     |
|                             | 2. "En curso" indica que el empleado comenzó a atender al cliente.                                |
|                             | 3. "Completada" indica que la atención finalizó.                                                  |
|                             | 4. "No asistió" se marca cuando el cliente no se presentó.                                        |
|                             | 5. "Cancelada" puede marcarla el empleado (con motivo obligatorio) o el cliente (hasta 2h antes). |
|                             | 6. Una cita completada o cancelada no puede cambiar a otro estado.                                |
|                             | 7. Al marcar como completada, se registra automáticamente una visita en el CRM del cliente.       |

### FR-107: Cancelación por el cliente

| Campo                       | Valor                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El cliente debe poder cancelar su cita desde el link en su email de confirmación.                                                                                            |
| **Prioridad**               | Alta                                                                                                                                                                         |
| **Trazabilidad**            | BR-107                                                                                                                                                                       |
| **Criterios de aceptación** |                                                                                                                                                                              |
|                             | 1. El email de confirmación incluye un link para cancelar la cita.                                                                                                           |
|                             | 2. Al seguir el link, se solicita confirmación y motivo (opcional).                                                                                                          |
|                             | 3. Si faltan menos de 2 horas para la cita, la cancelación no está disponible y se muestra mensaje: "Ya no es posible cancelar esta cita. Contacta al negocio directamente." |
|                             | 4. Al cancelar, se envía email de cancelación al cliente y notificación al negocio.                                                                                          |

### FR-108: Reprogramación por el cliente

| Campo                       | Valor                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------ |
| **Descripción**             | El cliente debe poder reprogramar su cita desde el link en su email de confirmación. |
| **Prioridad**               | Alta                                                                                 |
| **Trazabilidad**            | BR-108                                                                               |
| **Criterios de aceptación** |                                                                                      |
|                             | 1. El email de confirmación incluye un link para reprogramar.                        |
|                             | 2. Al seguir el link, el cliente selecciona nueva fecha y hora disponible.           |
|                             | 3. Se validan las mismas reglas de disponibilidad que en FR-104.                     |
|                             | 4. La cita original se cancela y se crea una nueva con la misma información.         |
|                             | 5. Se envía email de confirmación de la nueva cita.                                  |

### FR-109: Vista completa de agenda (admin/propietario)

| Campo                       | Valor                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------- |
| **Descripción**             | El administrador y propietario deben poder ver la agenda de todos los empleados.    |
| **Prioridad**               | Alta                                                                                |
| **Trazabilidad**            | BR-112                                                                              |
| **Criterios de aceptación** |                                                                                     |
|                             | 1. La vista de agenda general muestra citas de todos los empleados.                 |
|                             | 2. Se puede filtrar por empleado, servicio, fecha, estado.                          |
|                             | 3. Se puede cambiar entre vista de día, semana y mes.                               |
|                             | 4. Las citas se muestran con colores según el servicio.                             |
|                             | 5. Se puede crear una cita manualmente desde la agenda (para reservas telefónicas). |

### FR-110: Historial de citas

| Campo                       | Valor                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Descripción**             | El sistema debe mostrar el historial completo de citas con filtros.            |
| **Prioridad**               | Media                                                                          |
| **Trazabilidad**            | BR-112                                                                         |
| **Criterios de aceptación** |                                                                                |
|                             | 1. La vista de historial muestra citas pasadas y futuras.                      |
|                             | 2. Se puede filtrar por: rango de fechas, empleado, servicio, cliente, estado. |
|                             | 3. Se puede exportar a CSV.                                                    |
|                             | 4. Cada cita en el historial es clickeable para ver detalle completo.          |

### FR-111: Días festivos y cierres

| Campo                       | Valor                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| **Descripción**             | El propietario debe poder marcar días específicos como cerrados (festivos, vacaciones). |
| **Prioridad**               | Media                                                                                   |
| **Trazabilidad**            | BR-113                                                                                  |
| **Criterios de aceptación** |                                                                                         |
|                             | 1. Calendario donde se pueden seleccionar fechas y marcarlas como "Cerrado".            |
|                             | 2. Se puede agregar un motivo (opcional).                                               |
|                             | 3. Las fechas marcadas como cerradas no muestran disponibilidad en la reserva online.   |
|                             | 4. Se puede marcar medio día (cerrado solo mañana o solo tarde).                        |

---

## Módulo: CRM

### FR-301: Registro automático de clientes

| Campo                       | Valor                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe registrar automáticamente a los clientes que interactúan con el negocio.                                     |
| **Prioridad**               | Alta                                                                                                                         |
| **Trazabilidad**            | BR-301                                                                                                                       |
| **Criterios de aceptación** |                                                                                                                              |
|                             | 1. Cuando un cliente agenda una cita (FR-104) proporcionando su email, se crea un registro de cliente si no existe.          |
|                             | 2. Si el cliente ya existe (mismo email en el mismo tenant), se actualizan sus datos y se incrementa el contador de visitas. |
|                             | 3. El cliente puede tener una cuenta opcional con contraseña para acceder a su historial.                                    |
|                             | 4. La cuenta de cliente es independiente por tenant (un cliente puede tener cuentas en diferentes negocios).                 |

### FR-302: Perfil de cliente

| Campo                       | Valor                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe mostrar el perfil completo de cada cliente.                                                                  |
| **Prioridad**               | Alta                                                                                                                         |
| **Trazabilidad**            | BR-302                                                                                                                       |
| **Criterios de aceptación** |                                                                                                                              |
|                             | 1. El perfil muestra: nombre, email, teléfono, fecha de registro, última visita, total de visitas, total gastado, etiquetas. |
|                             | 2. El perfil tiene pestañas: Información, Historial de citas, Notas.                                    |
|                             | 3. La información se carga desde las interacciones registradas.                                                              |

### FR-303: Notas de cliente

| Campo                       | Valor                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| **Descripción**             | El empleado/admin debe poder agregar notas privadas a un cliente.                 |
| **Prioridad**               | Alta                                                                              |
| **Trazabilidad**            | BR-303                                                                            |
| **Criterios de aceptación** |                                                                                   |
|                             | 1. Las notas son visibles solo para el personal del negocio (no para el cliente). |
|                             | 2. Cada nota tiene: contenido, autor, timestamp.                                  |
|                             | 3. Las notas se muestran en orden cronológico inverso.                            |
|                             | 4. Se puede editar una nota dentro de los primeros 5 minutos después de crearla.  |
|                             | 5. No se pueden eliminar notas (solo el super admin).                             |

### FR-304: Etiquetas de cliente

| Campo                       | Valor                                                                    |
| --------------------------- | ------------------------------------------------------------------------ |
| **Descripción**             | El negocio debe poder etiquetar clientes para segmentación.              |
| **Prioridad**               | Alta                                                                     |
| **Trazabilidad**            | BR-304                                                                   |
| **Criterios de aceptación** |                                                                          |
|                             | 1. El administrador puede crear etiquetas (nombre, color).               |
|                             | 2. Un cliente puede tener múltiples etiquetas.                           |
|                             | 3. Las etiquetas se muestran como badges en el perfil y en los listados. |
|                             | 4. Se puede filtrar la lista de clientes por etiquetas.                  |
|                             | 5. Etiquetas predefinidas del sistema: VIP, Frecuente, Nuevo, Inactivo.  |

### FR-305: Historial del cliente

| Campo                       | Valor                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe mostrar el historial completo de interacciones del cliente con el negocio.                        |
| **Prioridad**               | Alta                                                                                                              |
| **Trazabilidad**            | BR-305                                                                                                            |
| **Criterios de aceptación** |                                                                                                                   |
|                             | 1. El historial de citas muestra todas las citas del cliente en el negocio con fecha, servicio, empleado, estado. |
|                             | 2. El historial es paginado y filtrable por fecha.                                                                |
|                             | 3. Desde el historial se puede hacer clic para ver el detalle de la cita.                                         |

### FR-306: Programa de fidelización

| Campo                       | Valor                                                                                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El propietario debe poder definir un programa de puntos para sus clientes.                                                                                                                                              |
| **Prioridad**               | Media                                                                                                                                                                                                                   |
| **Trazabilidad**            | BR-306, BR-307                                                                                                                                                                                                          |
| **Criterios de aceptación** |                                                                                                                                                                                                                         |
|                             | 1. Configuración: puntos por cita completada (ej: 10 puntos por cita), puntos de bienvenida, valor del punto en descuento (ej: 100 puntos = $50 de descuento). |
|                             | 2. El cliente acumula puntos automáticamente al completar citas.                                                                                              |
|                             | 3. El cliente puede ver sus puntos desde su perfil (si tiene cuenta).                                                                                                                                                   |
|                             | 4. El cliente puede canjear puntos en su próxima visita (el empleado aplica el descuento).                                                                                                                              |
|                             | 5. Los puntos tienen fecha de expiración configurable (default: 6 meses).                                                                                                                                               |

### FR-307: Estadísticas de clientes

| Campo                       | Valor                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Descripción**             | El sistema debe mostrar estadísticas básicas de clientes.                                                                                                                                         |
| **Prioridad**               | Media                                                                                                                                                                                             |
| **Trazabilidad**            | BR-308                                                                                                                                                                                            |
| **Criterios de aceptación** |                                                                                                                                                                                                   |
|                             | 1. La vista de estadísticas muestra: total de clientes, clientes nuevos (este mes/semana), clientes recurrentes (más de 1 visita), tasa de retención, clientes inactivos (sin visita en 3 meses). |
|                             | 2. Los datos se muestran en tarjetas y gráficos simples (barras, líneas).                                                                                                                         |
|                             | 3. Se puede filtrar por rango de fechas.                                                                                                                                                          |

### FR-308: Búsqueda de clientes

| Campo                       | Valor                                                             |
| --------------------------- | ----------------------------------------------------------------- |
| **Descripción**             | El sistema debe permitir buscar clientes por múltiples criterios. |
| **Prioridad**               | Alta                                                              |
| **Trazabilidad**            | BR-309                                                            |
| **Criterios de aceptación** |                                                                   |
|                             | 1. Búsqueda por texto libre: nombre, email, teléfono.             |
|                             | 2. Búsqueda por etiqueta: selección múltiple.                     |
|                             | 3. Búsqueda por rango de fechas (registro, última visita).        |
|                             | 4. Los resultados se muestran en una tabla paginada.              |
|                             | 5. Búsqueda en tiempo real (debounced).                           |

### FR-309: Autogestión del cliente

| Campo                       | Valor                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Descripción**             | El cliente debe poder actualizar sus datos personales desde su perfil.                                |
| **Prioridad**               | Media                                                                                                 |
| **Trazabilidad**            | BR-310                                                                                                |
| **Criterios de aceptación** |                                                                                                       |
|                             | 1. El cliente con cuenta puede iniciar sesión y ver/editar: nombre, email, teléfono, foto (opcional). |
|                             | 2. El cliente puede cambiar su contraseña.                                                            |
|                             | 3. El cliente puede ver su historial de citas.                                                        |
|                             | 4. El cliente puede ver sus puntos de fidelización y canjearlos.                                      |

---

## Requisitos de Internacionalización

### FR-401: Sistema de traducciones

| Campo                       | Valor                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Descripción**             | Todo el texto visible de la interfaz debe manejarse mediante un sistema de traducciones.                   |
| **Prioridad**               | Alta                                                                                                       |
| **Trazabilidad**            | BR-005                                                                                                     |
| **Criterios de aceptación** |                                                                                                            |
|                             | 1. No hay texto hardcodeado en los componentes de Vue.                                                     |
|                             | 2. Todas las cadenas se definen en archivos JSON por idioma (en, es, pt como idiomas iniciales).           |
|                             | 3. El idioma se detecta automáticamente del navegador.                                                     |
|                             | 4. El usuario puede cambiar de idioma desde la UI.                                                         |
|                             | 5. La selección de idioma persiste (localStorage).                                                         |
|                             | 6. Las traducciones se cargan bajo demanda (lazy loading).                                                 |
|                             | 7. El contenido del negocio (servicios) es ingresado por el negocio en su propio idioma.                  |

---

## Decisiones Tomadas

| Decisión                           | Opción Elegida                             | Alternativas          | Justificación                                                                |
| ---------------------------------- | ------------------------------------------ | --------------------- | ---------------------------------------------------------------------------- |
| Puntos de fidelización automáticos | Por cita completada                        | Solo manual           | Mayor flexibilidad para el negocio y acumulación automática y transparente.  |
| Notas del cliente inmutables       | No se eliminan                             | Eliminación libre     | Trazabilidad y auditoría.                                                    |

---

## Posibles Mejoras Futuras

- Reserva recurrente (cliente agenda misma cita semanalmente).
- Auto-check-in mediante QR en la recepción del negocio.
- Integración con Google Calendar del empleado.
- Notificaciones push (vía Service Worker).
- Chat en tiempo real cliente-negocio.
- Sistema de reseñas y valoraciones.
- Módulo de encuestas de satisfacción post-servicio.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 03-non-functional-requirements.md_
