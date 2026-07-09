# 14 — Module: Digital Menu (Carta Digital)

## Objetivo

Definir en detalle el Módulo de Carta Digital: componentes, stores, repositorios, flujos de trabajo, reglas de negocio, integración con otros módulos y consideraciones de implementación.

---

## Alcance

Cubre todos los aspectos del módulo de carta digital: gestión de menús, categorías, productos, variantes, extras, mesas, códigos QR, carrito de compras, pedidos, panel de gestión de pedidos y seguimiento en tiempo real.

---

## Dependencias

- 02-functional-requirements.md — Define los requisitos funcionales FR-201 a FR-212.
- 05-system-architecture.md — Define la arquitectura del módulo.
- 06-folder-structure.md — Define la estructura de archivos del módulo.
- 07-database-design.md — Define las tablas `menus`, `categories`, `products`, `product_variants`, `extra_groups`, `extras`, `tables`, `orders`, `order_items`.
- 10-user-roles.md — Define los permisos por rol en el módulo.
- 12-navigation.md — Define las rutas del módulo.

---

## Vista General del Módulo

El módulo de carta digital permite a los negocios de alimentos y bebidas digitalizar su menú. Los clientes escanean un código QR en la mesa, navegan por la carta, personalizan su pedido y lo envían directamente a la cocina/barra. Los empleados reciben los pedidos en tiempo real y gestionan su preparación y entrega.

---

## Estructura del Módulo

```
src/modules/digital-menu/
├── views/
│   ├── MenuManagementView.vue      # Gestión de menús múltiples
│   ├── CategoriesView.vue          # Gestión de categorías (CRUD + reordenar)
│   ├── ProductsView.vue            # Listado de productos con filtros
│   ├── ProductFormView.vue         # Crear/editar producto (con variantes y extras)
│   ├── TablesView.vue              # Gestión de mesas + generación QR
│   ├── OrdersPanelView.vue         # Panel de pedidos en tiempo real (cocina/barra)
│   ├── OrderHistoryView.vue        # Historial de pedidos
│   ├── PublicMenuView.vue          # Carta digital pública (cliente escanea QR)
│   └── PublicOrderTracking.vue     # Seguimiento de pedido (cliente)
│
├── components/
│   ├── CategoryList.vue            # Lista reordenable de categorías (drag & drop)
│   ├── ProductCard.vue             # Tarjeta de producto en la carta
│   ├── ProductDetail.vue           # Modal de detalle de producto (variantes + extras)
│   ├── ProductForm.vue             # Formulario de producto con pestañas
│   ├── VariantEditor.vue           # Editor inline de variantes
│   ├── ExtraGroupEditor.vue        # Editor de grupos de extras
│   ├── CartDrawer.vue              # Drawer lateral del carrito
│   ├── CartItem.vue                # Item del carrito (con cantidad y extras)
│   ├── OrderCard.vue               # Tarjeta de pedido en el panel de cocina
│   ├── OrderStatusTimeline.vue     # Timeline visual de estado del pedido
│   ├── TableCard.vue               # Tarjeta de mesa con estado
│   ├── QRCodeDisplay.vue           # Display + descarga de QR
│   └── MenuScheduleConfig.vue      # Configuración de horarios de menú
│
├── stores/
│   ├── category.store.ts
│   ├── product.store.ts
│   ├── order.store.ts
│   ├── cart.store.ts               # Carrito del cliente (pública)
│   └── table.store.ts
│
├── composables/
│   ├── useCart.ts                   # Lógica del carrito (agregar, quitar, total)
│   ├── useOrderTracking.ts          # Seguimiento de pedido en tiempo real
│   ├── useMenuDisplay.ts           # Lógica de visualización de la carta pública
│   └── useQRGenerator.ts           # Generación de códigos QR
│
├── repositories/
│   ├── category.repository.ts
│   ├── product.repository.ts
│   ├── order.repository.ts
│   └── table.repository.ts
│
├── types/
│   ├── category.types.ts
│   ├── product.types.ts
│   ├── order.types.ts
│   ├── cart.types.ts
│   └── table.types.ts
│
└── i18n/
    ├── en.json
    ├── es.json
    └── pt.json
```

---

## Flujos de Trabajo Principales

### Flujo 1: Configuración de la Carta (Propietario/Admin)

```
Paso 1: Crear categorías
  1. Navegar a /digital-menu/categories
  2. Click "Nueva categoría"
  3. Nombre, descripción, icono
  4. Arrastrar para reordenar (sort_order se actualiza automáticamente)
  5. Crear tantas como se necesiten (Ej: Entradas, Platos Fuertes, Bebidas, Postres)

Paso 2: Crear productos
  1. Navegar a /digital-menu/products
  2. Click "Nuevo producto"
  3. Completar formulario:
     a. Información básica: nombre, descripción, precio, categoría
     b. Imágenes: subir fotos del producto (múltiples)
     c. Variantes: opcional (Ej: "Grande" +$50, "Mediano" precio base)
     d. Extras: opcional (Ej: "Queso extra" +$20, grupos de selección)
     e. Configuración: disponible, destacado
  4. Guardar → producto creado

Paso 3: Crear menús (opcional)
  1. Si el negocio tiene diferentes menús según horario:
     - Menú de lunch (12:00-17:00)
     - Menú nocturno (17:00-23:00)
     - Menú de fin de semana (sábado y domingo)
  2. Asignar categorías y productos a cada menú

Paso 4: Configurar mesas
  1. Navegar a /digital-menu/tables
  2. Agregar mesas con número y capacidad
  3. El sistema genera automáticamente el QR para cada mesa
  4. Descargar QRs para imprimir y colocar en las mesas
```

### Flujo 2: Cliente Escanea QR y Pide

```
1. Cliente llega al restaurante, se sienta en la mesa
2. Escanea el código QR ubicado en la mesa
        │
        ▼
3. URL: https://nexo.app/public/{slug}/menu?table=5
        │
        ▼
4. Carga la carta digital del negocio:
   - Logo y colores del negocio
   - Categorías como pestañas/slides
   - Productos con precios e imágenes
   - Sin necesidad de registrarse
        │
        ▼
5. Cliente navega y selecciona productos:
   a. Tap en un producto → abre detalle
   b. Selecciona variante (si aplica)
   c. Selecciona extras (si aplica)
   d. Agrega notas (opcional)
   e. Tap "Agregar al carrito"
        │
        ▼
6. Carrito visible en botón flotante inferior
   - Muestra conteo de items y total
   - Tap abre el carrito (CartDrawer)
   - Puede modificar cantidades o eliminar items
        │
        ▼
7. Cliente hace tap "Enviar pedido"
   - Si es primera vez: solicitar nombre (obligatorio)
   - Email y teléfono: opcionales
        │
        ▼
8. Pedido enviado:
   - Número de pedido asignado
   - Estado: "Pendiente"
   - Pantalla de seguimiento se muestra automáticamente
   - Notificación en tiempo real al panel de la cocina
        │
        ▼
9. Cliente puede:
   - Ver seguimiento en tiempo real
   - Hacer otro pedido
   - Salir (el carrito se limpia)
```

### Flujo 3: Gestión de Pedidos en Cocina

```
1. Panel de pedidos (OrdersPanelView) se actualiza en tiempo real
   - Los nuevos pedidos aparecen con efecto visual (animación)
   - Sonido de notificación (configurable)
        │
        ▼
2. Pedidos agrupados por estado en columnas Kanban:
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Pendiente │→│Preparando│→│  Listo   │→│ Entregado│
   │           │  │          │  │          │  │          │
   │ Pedido #5 │  │ Pedido #3│  │ Pedido #2│  │ Pedido #1│
   │ Mesa 3    │  │ Mesa 1   │  │ Mesa 5   │  │ Mesa 2   │
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
        │
        ▼
3. Acciones del empleado:
   a. Click en pedido pendiente → "Tomar pedido" → estado "preparando"
   b. Click en preparando → "Listo" → estado "ready"
   c. Click en listo → "Entregado" → estado "delivered"
   d. Click en cualquier estado no entregado → "Cancelar"
        │
        ▼
4. Cada cambio de estado:
   - Se refleja en tiempo real en la pantalla del cliente
   - Se registra timestamp en el pedido (para medir tiempos)
   - Si es "ready": notificación al cliente
```

### Flujo 4: Menús Múltiples por Horario

```
1. Negocio configura menús con horarios:
   - "Menú Mañana": 7:00-11:00, lun-dom
   - "Menú Tarde": 12:00-17:00, lun-dom
   - "Menú Noche": 18:00-22:00, vie-sab

2. Algoritmo de selección de menú:
   const getActiveMenu = (menus, currentDay, currentTime) => {
     return menus.find(m =>
       m.days_of_week.includes(currentDay) &&
       currentTime >= m.start_time &&
       currentTime < m.end_time
     ) ?? defaultMenu;
   };

3. Si ningún menú aplica: se muestra el menú por defecto
4. Si no hay menú por defecto: se muestran todos los productos
```

---

## Componentes Clave

### `CartDrawer.vue`

Drawer lateral (o pantalla completa en móvil) que muestra el contenido del carrito:

```
┌─────────────────────┐
│ 🛒 Tu Pedido         │
│─────────────────────│
│ Café Latte           │
│   Grande + $50       │
│   × 2                │
│   + Queso extra $20  │
│           Subtotal:  │
│           $340       │
│─────────────────────│
│ Sandwich Club        │
│   × 1                │
│   Sin cebolla        │
│           Subtotal:  │
│           $120       │
│─────────────────────│
│ Total: $460          │
│─────────────────────│
│ [Nombre: __input__]  │
│ [Email: ___input__]  │
│ [Tel: ____input__]   │
│─────────────────────│
│ [  Enviar Pedido  ]  │
└─────────────────────┘
```

### `OrderCard.vue`

Tarjeta de pedido en el panel Kanban de cocina:

```
┌───────────────────────┐
│ Mesa 3  •  #5         │
│ ⏱ 12:34               │
│───────────────────────│
│ 🥪 Club Sandwich × 2  │
│    • Grande           │
│    • Sin cebolla      │
│ 🥤 Smoothie × 1       │
│    • Mediano          │
│ 📝 Notas: rápido porf │
│───────────────────────│
│ [Preparar] [Cancelar] │
└───────────────────────┘
```

### `ProductDetail.vue`

Modal que se abre al seleccionar un producto en la carta pública:

```
┌──────────────────────────────────┐
│                           [✕]   │
│  ┌─────────────────────────┐    │
│  │     Imagen del producto │    │
│  └─────────────────────────┘    │
│                                  │
│  🥪 Club Sandwich               │
│  $120                           │
│                                  │
│  Descripción del producto...     │
│                                  │
│  Tamaño (selección única):       │
│  ○ Pequeño  $90                 │
│  ● Mediano  $120                │
│  ○ Grande   $170                │
│                                  │
│  Ingredientes extra (máx 2):     │
│  ☑ Queso extra     +$20         │
│  ☐ Tocino          +$30         │
│  ☑ Guacamole       +$25         │
│                                  │
│  Notas:                          │
│  [Sin cebolla por favor________] │
│                                  │
│  Cantidad:  [-]  2  [+]          │
│                                  │
│  [  Agregar al Carrito  $240  ]  │
└──────────────────────────────────┘
```

### `QRCodeDisplay.vue`

Componente que muestra y permite descargar el QR de una mesa:

```vue
<template>
  <v-card>
    <v-card-text class="text-center">
      <qrcode-vue :value="qrUrl" :size="200" level="L" />
      <div class="text-body-2 mt-2">Mesa {{ table.number }}</div>
      <div class="mt-2">
        <v-btn size="small" @click="downloadPNG">PNG</v-btn>
        <v-btn size="small" @click="downloadPDF">PDF</v-btn>
        <v-btn size="small" @click="print">Imprimir</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
```

---

## Stores

### `cart.store.ts`

```typescript
export const useCartStore = defineStore('digital-menu/cart', () => {
  // El carrito persiste en localStorage para no perderse si el cliente recarga
  const items = ref<CartItem[]>(JSON.parse(localStorage.getItem('cart') || '[]'));
  const customerInfo = ref<CustomerInfo | null>(null);
  const tableId = ref<string | null>(null);

  const totalItems = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0));
  const subtotal = computed(() =>
    items.value.reduce((sum, i) => sum + (i.unitPrice + i.extrasPrice) * i.quantity, 0),
  );

  function addItem(product: Product, variant?: Variant, extras: Extra[], quantity: number) {
    const unitPrice = variant?.price ?? product.price;
    const extrasPrice = extras.reduce((s, e) => s + e.price, 0);
    items.value.push({
      productId: product.id,
      productName: product.name,
      variant,
      extras,
      quantity,
      unitPrice,
      extrasPrice,
    });
    persist();
  }

  function removeItem(index: number) {
    items.value.splice(index, 1);
    persist();
  }
  function updateQuantity(index: number, qty: number) {
    items.value[index].quantity = qty;
    persist();
  }
  function clearCart() {
    items.value = [];
    customerInfo.value = null;
    persist();
  }

  function persist() {
    localStorage.setItem('cart', JSON.stringify(items.value));
  }

  return {
    items,
    customerInfo,
    tableId,
    totalItems,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
});
```

### `order.store.ts`

```typescript
export const useOrderStore = defineStore('digital-menu/orders', () => {
  const orders = ref<Order[]>([]);
  const activeOrders = ref<Order[]>([]);
  const currentOrder = ref<Order | null>(null);

  // Filtros para cocina
  const pendingOrders = computed(() => activeOrders.value.filter((o) => o.status === 'pending'));
  const preparingOrders = computed(() =>
    activeOrders.value.filter((o) => o.status === 'preparing'),
  );
  const readyOrders = computed(() => activeOrders.value.filter((o) => o.status === 'ready'));

  // Suscripción Realtime para nuevos pedidos
  function subscribeToNewOrders(tenantId: string) {
    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          activeOrders.value.unshift(payload.new as Order);
          // Sonido de notificación
          playNotificationSound();
        },
      )
      .subscribe();
    return channel;
  }

  async function updateOrderStatus(orderId: string, status: string) {
    return await orderRepository.updateStatus(orderId, status);
  }

  return {
    orders,
    activeOrders,
    currentOrder,
    pendingOrders,
    preparingOrders,
    readyOrders,
    subscribeToNewOrders,
    updateOrderStatus,
  };
});
```

---

## Reglas de Negocio

| Regla                                         | Dónde se valida | Implementación                                      |
| --------------------------------------------- | --------------- | --------------------------------------------------- |
| Producto agotado no se muestra                | Frontend + DB   | `is_available = false` → filtro en SELECT           |
| Pedido no modificable después de "preparando" | Frontend        | Botón de editar deshabilitado                       |
| Un pedido no puede saltar estados             | Frontend + DB   | `pending → preparing → ready → delivered`           |
| Mesa activa debe existir                      | Frontend        | Validación del parámetro table en URL               |
| Mínimo 1 item por pedido                      | Frontend        | Botón enviar deshabilitado si carrito vacío         |
| Precio total no negativo                      | DB              | `CHECK (total_amount >= 0)`                         |
| Stock no tracking (inicial)                   | —               | Los productos no tienen inventario controlado en v1 |

---

## Integración con el Módulo CRM

| Evento en Carta Digital      | Acción en CRM                                          |
| ---------------------------- | ------------------------------------------------------ |
| Pedido entregado (delivered) | Incrementar `total_visits` y `total_spent` del cliente |
| Nuevo cliente hace pedido    | Crear registro en `customers` si email proporcionado   |
| Cliente existente            | Actualizar `last_visit_at`, `total_spent`              |
| Cancelación de pedido        | Registrar en notas del cliente (si aplica)             |

---

## Edge Functions Relacionadas

| Función                   | Disparador                        | Propósito                                                         |
| ------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| `send-order-notification` | AFTER INSERT en orders            | Notificar nuevo pedido al negocio (email si no están en el panel) |
| `process-order-points`    | AFTER UPDATE status → 'delivered' | Acreditar puntos de fidelización                                  |
| `generate-qr-pdf`         | A petición                        | Generar PDF imprimible con todos los QRs de las mesas             |

---

## Experiencia Móvil (Cliente)

La carta digital está optimizada para móvil:

1. **Carga instantánea**: La carta es lightweight (sin imágenes pesadas, lazy loading).
2. **Navegación por swipe**: Categorías deslizables horizontalmente.
3. **Botón flotante del carrito**: Siempre visible con badge de cantidad.
4. **Modal de detalle**: Ocupa toda la pantalla en móvil.
5. **Pedido en 3 taps**: Tap en producto → Tap en agregar → Tap en enviar.
6. **Seguimiento en vivo**: Barra de progreso con estado actual.
7. **Sin registro**: El cliente puede pedir sin crear cuenta.
8. **QR persistente**: Si el cliente cierra el navegador, puede escanear de nuevo y ver su pedido activo (por número de pedido o localStorage).

---

## Tiempos y Métricas de Cocina

El sistema registra timestamps en cada cambio de estado para medir:

| Métrica               | Cálculo                     | Propósito                                      |
| --------------------- | --------------------------- | ---------------------------------------------- |
| Tiempo de preparación | `ready_at - preparing_at`   | Cuánto tarda en prepararse cada pedido         |
| Tiempo de entrega     | `delivered_at - ready_at`   | Cuánto tarda en entregarse                     |
| Tiempo total          | `delivered_at - created_at` | Tiempo desde que se pidió hasta que se entregó |
| Pedidos por hora      | Conteo por hora             | Picos de demanda                               |

Estas métricas se muestran en el panel de administración y ayudan al negocio a optimizar su operación.

---

## Testing del Módulo

| Tipo        | Qué probar                                              | Herramienta    |
| ----------- | ------------------------------------------------------- | -------------- |
| Unitario    | Lógica del carrito (add, remove, total)                 | Vitest         |
| Unitario    | Algoritmo de selección de menú por horario              | Vitest         |
| Unitario    | Stores: cart, order, product, category                  | Vitest + Pinia |
| Componentes | `CartDrawer`, `ProductDetail`, `OrderCard`              | Vue Test Utils |
| Integración | Flujo completo: escanear QR → pedir → cocina → entregar | Playwright     |
| Integración | Tiempo real: pedido aparece en panel sin recargar       | Playwright     |
| E2E         | Multi-mesa: pedidos simultáneos en diferentes mesas     | Playwright     |

---

## Decisiones Tomadas

| Decisión                           | Opción                                 | Alternativas         | Justificación                                                                              |
| ---------------------------------- | -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| Visualización de pedidos en cocina | Kanban (columnas por estado)           | Lista, tabla         | Kanban es visual, rápido y muestra el flujo de trabajo claramente.                         |
| Carrito persistente                | localStorage                           | SessionStorage, API  | El cliente puede cerrar el navegador sin perder el carrito. Se limpia al enviar el pedido. |
| QR estático por mesa               | QR que incluye table_id                | QR por sesión        | Más simple de implementar. No requiere generar QR por cada visita.                         |
| Sonido en nuevos pedidos           | HTML5 Audio API                        | Push nativo, polling | No requiere permisos especiales. Funciona en el navegador.                                 |
| Snapshot de productos en pedidos   | Guardar nombre y precio en order_items | FK a products        | Si el producto se modifica, el pedido histórico conserva los datos reales.                 |
| Sin control de stock               | No se implementa en v1                 | Inventario completo  | Complejidad adicional que no es crítica para la v1. Se añade como módulo futuro.           |

---

## Posibles Mejoras Futuras

- **Control de inventario**: Vincular productos con stock y desactivar automáticamente cuando se agoten.
- **Pedidos para llevar / delivery**: Dirección de envío, tiempo estimado, costo de envío.
- **Impresora térmica**: Imprimir comanda en la cocina automáticamente al recibir un pedido.
- **Módulo de facturación**: Generar cuenta y permitir pago desde la mesa.
- **Pago integrado**: El cliente paga desde su teléfono (Stripe, Mercado Pago).
- **Programa de fidelización en carta**: Mostrar puntos disponibles al cliente en la pantalla de pedido.
- **Menú con imágenes 360°**: Fotos interactivas de los platillos.
- **Reseñas y valoraciones**: El cliente califica los productos después de la comida.
- **Menú nutricional**: Información nutrimental, alérgenos, ingredientes.
- **Múltiples idiomas en la carta**: El cliente selecciona el idioma de la carta.
- **Integración con apps de delivery**: Uber Eats, Rappi, Didi Food.
- **Análisis de popularidad**: Productos más vendidos, hora pico, rentabilidad por producto.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 15-module-crm.md_
