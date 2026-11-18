# Plan de desarrollo: Menú digital de carnes con pedido por WhatsApp

**Stack:** HTML/CSS/JavaScript + Supabase (base de datos y login) + Cloudinary (imágenes) + hosting estático gratuito.

## 1. Objetivo

Un sistema web muy sencillo donde:

- Un **administrador** carga y gestiona los productos (imagen, nombre, precio).
- Los **clientes** ven la carta, arman un carrito y envían el pedido por **WhatsApp**.
- El negocio **contacta al cliente** por WhatsApp para concretar la venta (no hay pago en línea).

## 2. Alcance (MVP)

### Incluye
- Carta pública con tarjetas de producto: imagen, nombre y precio.
- Carrito de compra (agregar, quitar, cambiar cantidad, total).
- Formulario mínimo del cliente: nombre y nota opcional.
- Botón "Enviar pedido por WhatsApp" que abre un chat con el pedido ya redactado.
- Panel de administración con login: crear, editar, eliminar y ocultar productos.

### No incluye (fuera del MVP)
- Pagos en línea.
- Registro de clientes.
- Gestión de inventario o stock.
- Historial de pedidos en base de datos.
- Cálculo de envío.

## 3. Flujo de uso

1. El cliente entra a la carta desde un enlace o código QR.
2. Agrega productos al carrito.
3. Revisa el carrito y escribe su nombre (y nota opcional).
4. Pulsa "Enviar pedido por WhatsApp".
5. Se abre WhatsApp con un mensaje prellenado hacia el número del negocio.
6. El negocio responde, confirma disponibilidad, precio final, entrega y forma de pago.
7. Se concreta la venta fuera del sistema.

## 4. Stack tecnológico

| Capa | Herramienta | Plan gratuito |
|---|---|---|
| Frontend | HTML + CSS + JavaScript (o React/Vite) | N/A |
| Base de datos | Supabase (PostgreSQL) | 500 MB, más que suficiente |
| Login del admin | Supabase Auth | Incluido |
| Imágenes | Cloudinary | Créditos mensuales gratuitos |
| Hosting | Netlify, Vercel o Cloudflare Pages | Gratis |
| Mensajería | Enlace `wa.me` (sin API) | Gratis |

> Los límites de los planes gratuitos pueden cambiar; conviene revisarlos en cada sitio antes de empezar.

**Por qué `wa.me`:** no requiere cuenta de API ni costo; solo construye un enlace con el texto del pedido.

**Por qué Cloudinary para imágenes:** entrega las fotos optimizadas y redimensionadas automáticamente, lo que hace la carta rápida en celular.

## 5. Modelo de datos (Supabase / PostgreSQL)

### Tabla `productos`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `nombre` | text | Ej.: "Lomo fino" |
| `precio` | numeric | Precio por unidad de venta |
| `unidad` | text | "kg", "libra", "porción" |
| `imagen_url` | text | URL de la imagen en Cloudinary |
| `categoria` | text | Ej.: res, cerdo, pollo (opcional) |
| `activo` | boolean | Mostrar u ocultar en la carta |
| `orden` | integer | Posición en la carta (opcional) |
| `creado_en` | timestamptz | Fecha de creación |

### Tabla `configuracion` (una sola fila)

| Campo | Descripción |
|---|---|
| `whatsapp` | Número del negocio con código de país, sin `+` |
| `nombre_negocio` | Nombre mostrado en la carta |
| `moneda` | Símbolo de moneda |
| `mensaje_inicial` | Saludo del mensaje de WhatsApp |

### SQL base

```sql
create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric not null check (precio >= 0),
  unidad text not null default 'kg',
  imagen_url text,
  categoria text,
  activo boolean not null default true,
  orden integer default 0,
  creado_en timestamptz default now()
);

create table configuracion (
  id integer primary key default 1 check (id = 1),
  whatsapp text not null,
  nombre_negocio text not null,
  moneda text not null default '$',
  mensaje_inicial text default 'Hola, quiero hacer un pedido:'
);
```

El carrito vive en el navegador del cliente (estado en memoria o `localStorage`); no se guarda en el servidor.

## 6. Seguridad (Row Level Security)

Activar RLS en ambas tablas:

```sql
alter table productos enable row level security;
alter table configuracion enable row level security;

-- Público: solo lectura de productos activos y de la configuración
create policy "lectura publica productos"
  on productos for select using (activo = true);

create policy "lectura publica configuracion"
  on configuracion for select using (true);

-- Administrador autenticado: control total
create policy "admin gestiona productos"
  on productos for all to authenticated
  using (true) with check (true);

create policy "admin gestiona configuracion"
  on configuracion for all to authenticated
  using (true) with check (true);
```

Recomendaciones:
- Crear el usuario administrador manualmente en el panel de Supabase y **desactivar el registro público** (Authentication → Providers/Settings).
- Usar solo la clave `anon` (pública) en el frontend; **nunca** la `service_role`.
- El admin debe ver también los productos inactivos: la política `admin gestiona productos` ya lo permite.

## 7. Subida de imágenes con Cloudinary

1. Crear una cuenta en Cloudinary y anotar el **cloud name**.
2. Crear un **upload preset** de tipo *unsigned* con estas restricciones:
   - Carpeta fija (ej.: `carnes/`).
   - Formatos permitidos: jpg, png, webp.
   - Tamaño máximo por archivo.
3. En el panel de administración, enviar la imagen con `fetch` a:
   `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload`
   usando el `upload_preset`.
4. Guardar la `secure_url` devuelta en el campo `imagen_url` del producto.
5. Al mostrar la carta, usar transformaciones en la URL para reducir el peso, por ejemplo `.../upload/w_400,q_auto,f_auto/...`.

> Un preset *unsigned* puede ser usado por cualquiera que conozca su nombre, por eso conviene limitarlo (carpeta, formato, tamaño). Si más adelante se quiere más control, se puede pasar a subidas firmadas con una función serverless.

## 8. Pantallas

### Públicas
1. **Carta:** rejilla de productos, filtro por categoría, botón "Agregar".
2. **Carrito:** lista de ítems, cantidades, total, campo de nombre y nota, botón de WhatsApp.

### Administrador
3. **Login:** correo y contraseña (Supabase Auth).
4. **Lista de productos:** tabla con editar, ocultar y eliminar.
5. **Formulario de producto:** nombre, precio, unidad, categoría, subir imagen a Cloudinary.
6. **Configuración:** número de WhatsApp, nombre del negocio, mensaje inicial.

## 9. Integración con WhatsApp

Se genera un enlace con este formato:

```
https://wa.me/<NUMERO>?text=<MENSAJE_CODIFICADO>
```

Ejemplo de mensaje:

```
Hola, quiero hacer un pedido:

- 2 kg Lomo fino — $24.000
- 1 kg Costilla — $12.000

Total estimado: $36.000
Nombre: Juan Pérez
Nota: Entregar después de las 5 pm

El precio final se confirma por este chat.
```

Puntos clave:
- Codificar el texto con `encodeURIComponent()`.
- Aclarar que el total es **estimado** (el peso real puede variar en carnes).
- Leer el número de WhatsApp desde la tabla `configuracion`, así el administrador lo cambia sin tocar código.

## 10. Plan por fases

### Fase 0: Preparación (1 día)
- [ ] Definir nombre del negocio, colores y logo.
- [ ] Reunir fotos y lista inicial de productos con precios.
- [ ] Confirmar el número de WhatsApp.
- [ ] Crear el proyecto en Supabase, la cuenta de Cloudinary y el repositorio.

### Fase 1: Base de datos y seguridad (1 día)
- [ ] Crear tablas `productos` y `configuracion`.
- [ ] Activar RLS y crear las políticas.
- [ ] Crear el usuario administrador y desactivar el registro público.
- [ ] Configurar el upload preset de Cloudinary.

### Fase 2: Carta pública (2–3 días)
- [ ] Maquetar el diseño responsive (prioridad celular).
- [ ] Leer productos desde Supabase y mostrarlos.
- [ ] Filtro por categoría.

### Fase 3: Carrito y WhatsApp (2–3 días)
- [ ] Lógica del carrito (agregar, quitar, cantidades, total).
- [ ] Formulario de nombre y nota.
- [ ] Generar el enlace `wa.me` con el pedido.
- [ ] Probar en celular (Android e iOS).

### Fase 4: Panel de administrador (3–4 días)
- [ ] Login con Supabase Auth y protección de la ruta del panel.
- [ ] CRUD de productos con subida de imágenes a Cloudinary.
- [ ] Activar/ocultar productos.
- [ ] Pantalla de configuración (WhatsApp, nombre, mensaje).

### Fase 5: Pruebas y lanzamiento (2 días)
- [ ] Pruebas con pedidos de ejemplo.
- [ ] Verificar que un usuario sin login no pueda escribir en la base de datos.
- [ ] Publicar en hosting y conectar dominio (opcional).
- [ ] Generar código QR de la carta.
- [ ] Capacitar al administrador.

**Tiempo estimado total:** 11–14 días de trabajo para una persona.

## 11. Pausa por inactividad en Supabase (plan gratuito)

Los proyectos gratuitos de Supabase se pausan tras aproximadamente una semana sin actividad, y la carta dejaría de cargar. Opciones:

- Programar una petición periódica (cada 3–5 días) con **GitHub Actions** (cron) o un servicio de monitoreo gratuito como **UptimeRobot** que consulte la tabla `productos`.
- Si el negocio tiene visitas frecuentes, la pausa no ocurre.
- Si se pausa, se reactiva desde el panel de Supabase con un clic.

## 12. Costos aproximados

| Concepto | Costo |
|---|---|
| Supabase (plan gratuito) | $0 |
| Cloudinary (plan gratuito) | $0 |
| Hosting (Netlify/Vercel/Cloudflare Pages) | $0 |
| WhatsApp (`wa.me`) | $0 |
| Dominio propio (opcional) | ~10–15 USD/año |

## 13. Criterios de aceptación

- [ ] El administrador puede crear un producto con imagen, nombre y precio en menos de 1 minuto.
- [ ] Un producto oculto no aparece en la carta pública.
- [ ] Un usuario sin sesión no puede crear, editar ni borrar productos.
- [ ] El cliente puede completar un pedido en menos de 2 minutos desde el celular.
- [ ] El mensaje de WhatsApp llega con productos, cantidades, total y nombre correctos.
- [ ] La carta carga en menos de 3 segundos con conexión móvil normal.

## 14. Mejoras futuras (después del MVP)

- Horario de atención y aviso de "cerrado".
- Costo de envío por zona.
- Opciones por producto (corte, punto de cocción, peso aproximado).
- Registro de pedidos en Supabase para estadísticas.
- Promociones y productos destacados.
- Subidas firmadas a Cloudinary mediante función serverless.
- Integración con pagos (Mercado Pago, PayPal, etc.).
- Versión como app instalable (PWA).
