# 00 — Project Vision

## Objetivo

Definir la visión global del producto, el problema que resuelve, el público objetivo y los principios fundamentales que guiarán todas las decisiones arquitectónicas y de negocio durante el desarrollo del sistema.

---

## Alcance

Este documento establece el marco conceptual del proyecto. No entra en detalles técnicos ni funcionales, sino que define el "por qué" y el "qué" a alto nivel.

Cubre:

- El problema de negocio
- La solución propuesta
- Los principios rectores
- Los módulos iniciales
- El modelo de negocio
- Las restricciones estratégicas

---

## El Problema

Los pequeños y medianos negocios (pymes) carecen de herramientas digitales accesibles, integradas y asequibles para gestionar su operación diaria. Las soluciones existentes presentan los siguientes problemas:

1. **Fragmentación**: Un negocio necesita una herramienta para citas, otra para menús digitales, otra para facturación y otra para CRM. No existe integración nativa entre ellas.
2. **Costo elevado**: Las plataformas empresariales (Salesforce, HubSpot, etc.) tienen precios prohibitivos para pymes.
3. **Complejidad**: Las soluciones existentes requieren configuraciones complejas y curvas de aprendizaje largas.
4. **Falta de aislamiento**: Muchas herramientas no ofrecen verdadero aislamiento de datos entre empresas, lo que puede generar problemas de privacidad y合规.
5. **Sin enfoque móvil**: La mayoría de las soluciones no están optimizadas para el uso desde dispositivos móviles, que es el principal punto de acceso para empleados de pymes.

---

## La Solución

**Plataforma SaaS multi-tenant** que proporciona un conjunto integrado de módulos de gestión empresarial para pymes.

Cada negocio (tenant) opera con sus propios datos completamente aislados, pero comparte la misma infraestructura y código base.

Los módulos iniciales cubren las necesidades operativas más comunes:

- **Citas**: Reservas, agenda, horarios, empleados, servicios.
- **Carta Digital**: Menús interactivos, pedidos por mesa, QR, carrito.
- **CRM**: Gestión de clientes, historial, etiquetas, fidelización.

A futuro, el sistema podrá incorporar módulos como facturación, inventarios, reporting avanzado, etc., sin modificar la arquitectura principal.

---

## Principios Rectores

Cada decisión técnica y de negocio debe alinearse con los siguientes principios:

### 1. Multi-tenant por diseño

El aislamiento de datos entre empresas no es una característica añadida, sino un pilar arquitectónico desde el día uno. Se implementa mediante Row Level Security (RLS) de PostgreSQL y schemas por tenant cuando sea necesario.

### 2. Modularidad

El sistema se compone de módulos independientes con responsabilidades bien definidas. Cada módulo es un dominio acotado (bounded context) con sus propios modelos, lógica de negocio y vistas. Los módulos se comunican a través de interfaces explícitas, no compartiendo bases de datos ni estado interno.

### 3. Simplicidad sobre complejidad

Se priorizan soluciones simples y directas. No se añade complejidad técnica a menos que esté justificada por un requisito concreto. Se sigue el principio YAGNI (You Aren't Gonna Need It).

### 4. Producto primero, tecnología después

La plataforma se construye para resolver problemas de negocio reales. La tecnología es un medio, no un fin. Se favorecen herramientas maduras y bien documentadas sobre tecnologías novedosas pero poco probadas.

### 5. Mobile-first responsive

Todos los módulos deben funcionar perfectamente en dispositivos móviles. El diseño responsive no es una ocurrencia tardía, sino un requisito desde el diseño de componentes.

### 6. Seguridad por defecto

Cada endpoint, cada consulta, cada componente debe ser seguro por diseño. Se aplica el principio de mínimo privilegio en todos los niveles: base de datos, API, interfaz de usuario.

### 7. Listo para producción desde el inicio

No existen prototipos desechables ni fases de "después lo arreglamos en producción". Cada línea de código se escribe como si fuera a desplegarse a producción inmediatamente.

### 8. Internacionalización (i18n) preparada

Todo el texto visible en la interfaz de usuario se maneja mediante un sistema de traducciones desde el día uno. No se hardcodean cadenas de texto.

### 9. Escalabilidad horizontal

La arquitectura debe permitir escalar horizontalmente tanto la base de datos como el frontend y las edge functions cuando sea necesario.

---

## Módulos Iniciales

| Módulo            | Descripción                                                                                          | Valor para el negocio                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Citas**         | Agenda digital, gestión de horarios, servicios, empleados, reservas con cancelación y reprogramación | Elimina la doble agenda, reduce ausencias, profesionaliza la atención al cliente          |
| **Carta Digital** | Menú interactivo por QR, categorías, productos, variantes, extras, carrito y pedidos en tiempo real  | Reduce costos de impresión, agiliza la toma de pedidos, mejora la experiencia del cliente |
| **CRM**           | Base de datos de clientes, historial de interacciones, notas, etiquetas, programa de fidelización    | Centraliza la información del cliente, permite personalizar la atención, retiene clientes |

---

## Modelo de Negocio

- **Suscripción mensual** por tenant (negocio).
- Planes basados en:
  - Número de empleados activos
  - Módulos contratados
  - Almacenamiento utilizado
- Período de prueba gratuito (14 días) sin tarjeta de crédito.
- Los clientes (usuarios finales de los negocios) no pagan; son invitados por el tenant.

---

## Restricciones Estratégicas

1. **Sin servidor propio**: Toda la infraestructura corre sobre Supabase + Vercel. No se administran servidores.
2. **Sin aplicación nativa móvil inicial**: La plataforma es web responsive. Una app nativa (Flutter/React Native) es una mejora futura.
3. **Sin pasarela de pagos en la primera versión**: Los pagos (suscripciones) se implementarán cuando haya un producto mínimo viable funcionando.
4. **Sin facturación electrónica**: No es parte del alcance inicial. Se integrará como módulo futuro.
5. **Código abierto bajo licencia MIT**: El código del proyecto es público. Cada negocio puede auto-alojarlo si lo desea, aunque el modelo SaaS es el recomendado.

---

## Dependencias

| Dependencia  | Tipo                  | Justificación                                                                                                                    |
| ------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Supabase     | Backend como servicio | Proporciona PostgreSQL, Auth, Storage, Realtime y RLS en una plataforma integrada. Elimina la necesidad de gestionar servidores. |
| Vercel       | Hosting frontend      | Despliegue continuo, CDN global, integración nativa con Git, zero-config para Vue.                                               |
| Vue 3 + Vite | Framework frontend    | Reactividad eficiente, ecosistema maduro, TypeScript nativo, tamaño de bundle reducido con Vite.                                 |
| Vuetify      | UI library            | Componentes Material Design, excelente soporte para Vue 3, responsive por defecto, accesibilidad.                                |
| Pinia        | Estado global         | Store simple y type-safe para Vue 3, soporte DevTools, arquitectura modular por defecto.                                         |
| Vue Router   | Enrutamiento          | Router oficial de Vue, lazy loading, guards de navegación, nested routes.                                                        |

---

## Posibles Mejoras Futuras

- Aplicación nativa móvil (Flutter / React Native)
- Módulo de facturación electrónica (CFDI / Facturae según país)
- Módulo de inventarios
- Módulo de nómina
- Pasarela de pagos integrada (Stripe, Mercado Pago)
- Dashboard analítico avanzado con gráficos
- Integración con redes sociales (WhatsApp Business API, Instagram)
- Marketplace de integraciones de terceros
- API pública para desarrolladores externos
- Sistema de plantillas para personalización de marca por tenant
- Offline-first para zonas sin conectividad estable

---

## Riesgos Identificados

| Riesgo                                                 | Impacto                                 | Mitigación                                                                                                   |
| ------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Crecimiento rápido de tenantes sin control de recursos | Degradación del servicio                | Límites por plan, rate-limiting, monitoreo continuo                                                          |
| Fuga de datos entre tenantes por error en RLS          | Pérdida de confianza, problemas legales | Tests automatizados de aislamiento, revisión de políticas RLS, auditoría periódica                           |
| Dependencia excesiva de Supabase                       | Bloqueo de plataforma                   | Uso de PostgreSQL estándar, abstracción de acceso a datos, posibilidad de migrar a PostgreSQL autogestionado |
| Baja adopción por parte de empleados                   | Fracaso del producto                    | Diseño mobile-first, UX simple, onboarding guiado, soporte directo                                           |
| Costos de infraestructura no controlados               | Márgenes negativos                      | Monitoreo de uso, planes escalonados, caché agresiva, optimización de consultas                              |

---

## Criterios de Éxito

1. **Tiempo de incorporación de un nuevo negocio** < 5 minutos (desde registro hasta primera funcionalidad operativa).
2. **Tiempo de respuesta** < 200ms para el 95% de las solicitudes de API.
3. **Aislamiento comprobable** entre tenantes: pruebas automáticas que verifiquen que un tenant no puede acceder a datos de otro.
4. **Zero downtime** en despliegues gracias a Vercel.
5. **Cobertura de testing**: > 90% en lógica de negocio, > 80% en componentes.

---

## Decisión Tomada

La plataforma se llamará provisionalmente **"Nexo"** (nombre interno hasta definir la marca final). En la documentación se referirá como **Nexo Platform**.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 01-business-requirements.md_
