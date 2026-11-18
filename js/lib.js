/**
 * Capa de datos y utilidades compartidas.
 *
 * Expone la misma API tanto si hay Supabase configurado como si no.
 * Así, la carta y el panel admin no necesitan saber de dónde vienen los datos.
 */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_FOLDER,
} from './config.js';

const forceDemo = new URLSearchParams(location.search).has('demo');
const hasCredentials = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Se carga solo si hay credenciales: el modo demostración funciona sin red.
let supabase = null;
if (hasCredentials && !forceDemo) {
  try {
    const { createClient } = await import('./vendor/supabase.js');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (error) {
    console.error('No se pudo cargar Supabase; se activa el modo demostración.', error);
  }
}

const useSupabase = Boolean(supabase);

export const demoMode = !useSupabase;
export const cloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

// ------------------------------------------------------------------
// Datos de ejemplo (solo se usan en modo demostración)
// ------------------------------------------------------------------

const SAMPLE_PRODUCTS = [
  {
    id: 'demo-1',
    nombre: 'Lomo fino',
    precio: 24900,
    unidad: 'kg',
    imagen_url: 'assets/res.svg',
    categoria: 'Res',
    activo: true,
    orden: 1,
  },
  {
    id: 'demo-2',
    nombre: 'Costilla de res',
    precio: 12900,
    unidad: 'kg',
    imagen_url: 'assets/res.svg',
    categoria: 'Res',
    activo: true,
    orden: 2,
  },
  {
    id: 'demo-3',
    nombre: 'Asado de tira',
    precio: 13900,
    unidad: 'kg',
    imagen_url: 'assets/res.svg',
    categoria: 'Res',
    activo: true,
    orden: 3,
  },
  {
    id: 'demo-4',
    nombre: 'Pollo entero',
    precio: 6990,
    unidad: 'kg',
    imagen_url: 'assets/pollo.svg',
    categoria: 'Pollo',
    activo: true,
    orden: 4,
  },
  {
    id: 'demo-5',
    nombre: 'Chorizo criollo',
    precio: 8900,
    unidad: 'kg',
    imagen_url: 'assets/cerdo.svg',
    categoria: 'Cerdo',
    activo: true,
    orden: 5,
  },
  {
    id: 'demo-6',
    nombre: 'Pecho de pollo',
    precio: 8990,
    unidad: 'kg',
    imagen_url: 'assets/pollo.svg',
    categoria: 'Pollo',
    activo: true,
    orden: 6,
  },
  {
    id: 'demo-7',
    nombre: 'Bondiola',
    precio: 11900,
    unidad: 'kg',
    imagen_url: 'assets/cerdo.svg',
    categoria: 'Cerdo',
    activo: true,
    orden: 7,
  },
  {
    id: 'demo-8',
    nombre: 'Provoleta',
    precio: 7900,
    unidad: 'porción',
    imagen_url: '',
    categoria: 'Quesos',
    activo: false,
    orden: 8,
  },
];

const SAMPLE_CONFIG = {
  id: 1,
  whatsapp: '5491122934235',
  nombre_negocio: 'Eco Carnes',
  moneda: '$',
  mensaje_inicial: 'Hola, quiero hacer un pedido:',
};

const KEYS = {
  products: 'menu_demo_productos_v1',
  config: 'menu_demo_config_v1',
  user: 'menu_demo_usuario_v1',
};

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return clone(fallback);
    const parsed = JSON.parse(raw);
    return parsed ?? clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    throw new Error('No se pudo guardar en el navegador. Revisa el espacio disponible.');
  }
}

function cleanProduct(product) {
  const { id, nombre, precio, unidad, imagen_url, categoria, activo, orden } = product;
  return {
    id,
    nombre: String(nombre || '').trim(),
    precio: Number(precio),
    unidad: String(unidad || 'kg').trim(),
    imagen_url: imagen_url || null,
    categoria: String(categoria || '').trim() || null,
    activo: activo !== false,
    orden: Number.isFinite(Number(orden)) ? Number(orden) : 0,
  };
}

// ------------------------------------------------------------------
// API pública
// ------------------------------------------------------------------

export async function getProducts({ includeInactive = false } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('productos')
      .select('*')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });
    if (!includeInactive) query = query.eq('activo', true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  const all = readLocal(KEYS.products, SAMPLE_PRODUCTS).sort(
    (a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)
  );
  return includeInactive ? all : all.filter((product) => product.activo);
}

export async function getConfig() {
  if (useSupabase) {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return data || SAMPLE_CONFIG;
  }
  return readLocal(KEYS.config, SAMPLE_CONFIG);
}

export async function saveProduct(product) {
  const payload = cleanProduct(product);
  delete payload.id;

  if (useSupabase) {
    const query = product.id
      ? supabase.from('productos').update(payload).eq('id', product.id)
      : supabase.from('productos').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  const all = readLocal(KEYS.products, SAMPLE_PRODUCTS);
  if (product.id) {
    const index = all.findIndex((entry) => entry.id === product.id);
    if (index < 0) throw new Error('No se encontró el producto.');
    all[index] = { ...all[index], ...payload };
    writeLocal(KEYS.products, all);
    return all[index];
  }

  const created = {
    ...payload,
    id: `demo-${Date.now().toString(36)}`,
    creado_en: new Date().toISOString(),
  };
  writeLocal(KEYS.products, [created, ...all]);
  return created;
}

export async function deleteProduct(id) {
  if (useSupabase) {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const all = readLocal(KEYS.products, SAMPLE_PRODUCTS);
  writeLocal(
    KEYS.products,
    all.filter((product) => product.id !== id)
  );
}

export async function updateConfig(config) {
  const payload = {
    id: 1,
    whatsapp: String(config.whatsapp || '').replace(/[^\d]/g, ''),
    nombre_negocio: String(config.nombre_negocio || '').trim(),
    moneda: String(config.moneda || '$').trim() || '$',
    mensaje_inicial: String(config.mensaje_inicial || '').trim(),
  };
  if (!payload.whatsapp) throw new Error('Ingresa el número de WhatsApp.');
  if (!payload.nombre_negocio) throw new Error('Ingresa el nombre del negocio.');

  if (useSupabase) {
    const { data, error } = await supabase
      .from('configuracion')
      .update(payload)
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  writeLocal(KEYS.config, payload);
  return payload;
}

// ------------------------------------------------------------------
// Autenticación (solo administradores)
// ------------------------------------------------------------------

export async function signIn(email, password) {
  if (!email || !password) throw new Error('Ingresa correo y contraseña.');
  if (useSupabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return;
  }
  writeLocal(KEYS.user, { email, demo: true });
}

export async function signOut() {
  if (useSupabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }
  try {
    localStorage.removeItem(KEYS.user);
  } catch {
    /* no hay sesión que borrar */
  }
}

export async function getUser() {
  if (useSupabase) {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }
  return readLocal(KEYS.user, null);
}

export function onAuthChange(callback) {
  if (useSupabase) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
    return () => data.subscription?.unsubscribe();
  }
  const handler = (event) => {
    if (event.key === KEYS.user) callback(readLocal(KEYS.user, null));
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

// ------------------------------------------------------------------
// Imágenes (Cloudinary)
// ------------------------------------------------------------------

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file, onProgress) {
  if (!file) throw new Error('Selecciona una imagen.');
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error('La imagen debe pesar menos de 8 MB.');

  if (demoMode) {
    if (file.size > 700 * 1024) {
      throw new Error('En modo demostración usa imágenes de menos de 700 KB.');
    }
    onProgress?.(100);
    return readFileAsDataURL(file);
  }

  if (!cloudinaryReady) {
    throw new Error('Configura Cloudinary en js/config.js para subir imágenes.');
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`
    );
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let response;
      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('No se pudo leer la respuesta de Cloudinary.'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
        onProgress?.(100);
        resolve(response.secure_url);
      } else {
        reject(new Error(response?.error?.message || 'No se pudo subir la imagen.'));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red al subir la imagen.'));

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (CLOUDINARY_FOLDER) form.append('folder', CLOUDINARY_FOLDER);
    xhr.send(form);
  });
}

// ------------------------------------------------------------------
// Utilidades de presentación
// ------------------------------------------------------------------

export function optimizedImage(url, width = 600) {
  if (!url) return '';
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
  }
  if (url.startsWith('data:')) return url;
  if (url.includes('images.unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}auto=format&fit=crop&w=${width}&q=80`;
  }
  return url;
}

export function formatMoney(value, moneda = '$') {
  const number = Number(value) || 0;
  const formatted = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(number);
  return `${moneda}${formatted}`;
}

export function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  );
}

export function buildOrderMessage(items, config, customer) {
  const lines = items.map((item) => {
    const price = formatMoney(item.precio * item.cantidad, config.moneda);
    return `- ${item.cantidad} ${item.unidad} ${item.nombre} — ${price}`;
  });

  const parts = [config.mensaje_inicial || 'Hola, quiero hacer un pedido:', '', ...lines, ''];
  parts.push(`Total estimado: ${formatMoney(
    items.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    config.moneda
  )}`);
  parts.push(`Nombre: ${customer.nombre.trim()}`);
  if (customer.nota.trim()) parts.push(`Nota: ${customer.nota.trim()}`);
  parts.push('', 'El precio final se confirma por este chat.');
  return parts.join('\n');
}

export function whatsappUrl(numero, mensaje) {
  const cleaned = String(numero || '').replace(/[^\d]/g, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(mensaje)}`;
}
