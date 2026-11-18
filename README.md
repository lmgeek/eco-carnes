# Menú digital de Eco Carnes con pedido por WhatsApp

Proyecto estático (HTML + CSS + JavaScript) con Supabase para datos y login, Cloudinary para imágenes y `wa.me` para enviar el pedido. No hay pagos en línea ni servidor propio. Incluye el logo de **Eco Carnes**, el cliente de Supabase incluido localmente (sin depender de un CDN) y está preparado para desplegar en **Dokploy**.

## Estado del proyecto

Implementado:

- Carta pública responsive con filtro por categoría.
- Carrito en `localStorage`: agregar, quitar, cambiar cantidades y total estimado.
- Formulario mínimo (nombre + nota) y enlace `wa.me` con el pedido redactado.
- Panel de administración con login, alta/edición/eliminación/ocultado de productos.
- Subida de imágenes a Cloudinary con barra de progreso.
- Pantalla de configuración (WhatsApp, nombre del negocio, moneda y mensaje inicial).
- SQL con tablas, Row Level Security y políticas de acceso.
- **Modo demostración**: funciona sin crear cuentas, con datos guardados en el navegador.

Pendiente de tu parte (requiere cuentas y decisiones de negocio): fotos y precios reales, número de WhatsApp definitivo, creación de proyectos en Supabase/Cloudinary, despliegue en Dokploy y QR. La identidad (nombre y logo) ya está aplicada.

## Probarlo sin cuentas (modo demostración)

Los archivos usan módulos ES, así que hay que servirlos por HTTP (no abrir con doble clic):

```bash
python -m http.server 8080
```

o, si tienes Node:

```bash
npx serve .
```

Luego abre:

- Carta: <http://localhost:8080/>
- Panel: <http://localhost:8080/admin.html>

Como `js/config.js` está vacío, la app entra sola en modo demostración. En el panel, cualquier correo y contraseña sirven para ingresar. Los cambios se guardan en `localStorage` de ese navegador.

Para salir del modo demostración, abre la URL con `?demo=1` (ej.: `http://localhost:8080/?demo=1`) aunque ya tengas credenciales cargadas.

## Estructura

```
index.html              Carta pública
admin.html              Panel de administración
css/styles.css          Estilos compartidos
js/config.js            Credenciales (editar)
js/lib.js               Supabase, Cloudinary, datos demo y utilidades
js/cart.js              Estado del carrito
js/public.js            Carta, filtros, carrito y WhatsApp
js/admin.js             Login, CRUD y configuración
js/vendor/              Cliente Supabase incluido localmente (sin CDN)
assets/                 Logo de Eco Carnes, ilustraciones del modo demo y favicon
supabase/schema.sql              Tablas, RLS y políticas
supabase/admin-user.sql          Usuario administrador
supabase/actualizar-whatsapp.sql Cambio de número para proyectos existentes
Dockerfile              Imagen nginx para Dokploy
docker-compose.yml      Alternativa de despliegue por compose
docker-entrypoint.sh    Genera js/config.js desde variables de entorno
nginx.conf              Configuración del servidor web
nginx-security.conf     Cabeceras de seguridad
.dockerignore           Archivos excluidos de la imagen
.env.example            Plantilla de variables para Dokploy
netlify.toml            Publicación alternativa en Netlify
plan-menu-digital-carnes.md  Plan original
```

## 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com/).
2. En **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y ejecútalo.
3. En **Authentication → Users → Add user**, crea el usuario administrador con correo y contraseña.
4. En **Authentication → Providers → Email**, desactiva **Allow new users to sign up** (así solo tú puedes entrar al panel).
5. En **Project Settings → API**, copia la **Project URL** y la clave **anon / public**. Úsalas como variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` en Dokploy, o pégalas directamente en `js/config.js` si trabajas en local:

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

> Nunca coloques la clave `service_role` en el frontend. La clave `anon` es pública y las políticas RLS son las que protegen los datos.

### Políticas incluidas

- Cualquier visitante puede leer solo productos con `activo = true` y la fila de configuración.
- Solo usuarios autenticados pueden crear, editar, ocultar y borrar productos y cambiar la configuración.

Si un producto oculto aparece en la carta, revisa que RLS esté activo en ambas tablas y que no haya políticas duplicadas.

### Usuario administrador

Ejecuta `supabase/admin-user.sql` en el SQL Editor. Crea estas credenciales:

- **Correo:** `admin@ecocarnes.com`
- **Contraseña inicial:** `EcoCarnes!2026`

Ingresa con ellas en `admin.html` y cambia la contraseña desde **Authentication → Users** después del primer acceso. En modo demostración cualquier correo y contraseña sirven, porque no hay Supabase detrás.

## 2. Cloudinary

1. Crea una cuenta en [cloudinary.com](https://cloudinary.com/).
2. En **Settings → Upload presets**, crea un preset **unsigned** con:
   - Upload preset name: por ejemplo `menu_carnes`.
   - Folder: `carnes`.
   - Formatos permitidos: jpg, png, webp.
   - Tamaño máximo: 8 MB.
3. Copia el **cloud name** y el nombre del preset en las variables `CLOUDINARY_CLOUD_NAME` y `CLOUDINARY_UPLOAD_PRESET` de Dokploy, o en `js/config.js` si trabajas en local:

```js
export const CLOUDINARY_CLOUD_NAME = 'tu-cloud-name';
export const CLOUDINARY_UPLOAD_PRESET = 'menu_carnes';
export const CLOUDINARY_FOLDER = 'carnes';
```

El preset unsigned es público: por eso conviene limitarlo por carpeta, formato y tamaño. Las imágenes se muestran con transformaciones `w_…,q_auto,f_auto` para que la carta cargue rápido en celular.

## 3. Número de WhatsApp y datos iniciales

El número de pedidos ya está configurado: **+54 9 11 2293-4235**, guardado como `5491122934235` (sin `+`, espacios ni guiones). Los enlaces quedan como `https://wa.me/5491122934235`.

- Proyecto nuevo: `supabase/schema.sql` ya lo carga; no hay nada que hacer.
- Proyecto que ya tenía otro número: ejecuta `supabase/actualizar-whatsapp.sql` una sola vez.
- Modo demostración: el número ya viene cargado en los datos de ejemplo.

En `admin.html`, pestaña **Configuración**, también puedes ajustar el **nombre del negocio**, el **símbolo de moneda** y el **mensaje inicial**.

También puedes cargar los productos desde **Productos → Nuevo producto**. El campo **Orden** controla la posición (menor número, primero) y **Mostrar en la carta pública** permite ocultar un artículo sin borrarlo.

## 4. Despliegue en Dokploy

La imagen usa nginx y genera `js/config.js` al arrancar desde variables de entorno. Cambiar de proyecto Supabase o Cloudinary no requiere reconstruir la imagen.

1. Sube esta carpeta a un repositorio de GitHub/GitLab (Dokploy también permite subir archivos directamente).
2. En Dokploy: **Project → Create App → Source** y selecciona el repositorio.
3. En **Build**, elige una de estas dos opciones (importante: no uses Nixpacks):
   - **Dockerfile**: archivo `Dockerfile` en la raíz. Si Dokploy te pide el puerto, pon **80**; si deja el **3000** por defecto también funciona, porque el contenedor escucha en ambos.
   - **Docker Compose**: archivo `docker-compose.yml` en la raíz. No publica puertos en el host (Traefik ya usa el 80); el contenedor escucha en **80** y **3000** y Dokploy lo alcanza por la red interna.
4. En **Environment**, carga estas variables:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_ANON_KEY` | Clave anon/public (nunca service_role) |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary |
| `CLOUDINARY_UPLOAD_PRESET` | Nombre del upload preset unsigned |
| `CLOUDINARY_FOLDER` | Carpeta de imágenes (por defecto `carnes`) |

5. Pulsa **Deploy**. En **Domains** asigna tu dominio; Dokploy gestiona el certificado SSL.
6. Genera el QR apuntando a la URL pública, por ejemplo `https://tu-dominio/`.

> Si dejas las credenciales vacías, el sitio publicado queda en modo demostración. Cárgalas antes de entregarlo.

### Si el dominio da 502 Bad Gateway

El 502 significa que Traefik no puede alcanzar el contenedor (la ruta al dominio sí existe). Revisa, en este orden:

1. **Build type = Dockerfile** (o Docker Compose), no Nixpacks.
2. Si usas Compose, **no publiques `80:80` en el host**: Traefik ya ocupa ese puerto y el contenedor no podría arrancar. Usa `expose`, como en el `docker-compose.yml` incluido.
3. El contenedor debe estar **running/healthy**. El healthcheck usa `127.0.0.1` porque en Alpine `localhost` resuelve a IPv6 y nginx podría no estar escuchando ahí; revisa los logs del app en Dokploy.
4. El puerto de la app debe ser **80** o **3000** (la imagen escucha en ambos).
5. Tras cambiar cualquier ajuste, haz **Redeploy**.

Puedes comprobarlo con `curl -I https://tu-dominio/`: debe devolver `HTTP/2 200`.

### Probar la imagen en local

```bash
docker build -t eco-carnes-menu .
docker run --rm -p 8080:80 \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e SUPABASE_ANON_KEY=eyJ... \
  -e CLOUDINARY_CLOUD_NAME=tu-cloud \
  -e CLOUDINARY_UPLOAD_PRESET=menu_carnes \
  eco-carnes-menu
```

### Alternativa: hosting estático

También funciona sin contenedor: **Netlify** (`netlify.toml`, `publish = "."`) o **Vercel / Cloudflare Pages** como sitio estático, sin comandos de build. En ese caso las credenciales van directamente en `js/config.js`.

### Pausa del plan gratuito de Supabase

Los proyectos gratuitos se pausan tras cerca de una semana sin actividad. Si el negocio tiene pocas visitas, configura un ping cada 3–5 días con GitHub Actions o UptimeRobot consultando la tabla `productos`. Si se pausa, reactívalo desde el panel de Supabase.

## 5. Verificación rápida

- [ ] Crear un producto con imagen, nombre y precio desde el panel.
- [ ] Ocultarlo y comprobar que desaparece de la carta pública.
- [ ] Cerrar sesión e intentar entrar a `admin.html` (debe pedir login).
- [ ] Armar un pedido de 2 productos, poner nombre y nota, y enviarlo por WhatsApp.
- [ ] Revisar que el mensaje incluya cantidades, unidades, total estimado y nombre.
- [ ] Probar en un celular con Android y con iOS.

## Notas

- El carrito nunca se guarda en la base de datos.
- El total siempre se presenta como **estimado** porque el peso real de las carnes puede variar; la confirmación ocurre en el chat.
- Para cambiar el formato de precios, edita `formatMoney()` en `js/lib.js` (ahora usa formato `es-CL`, por ejemplo `$24.000`).
