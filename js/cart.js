/**
 * Carrito del cliente. Vive solo en el navegador (localStorage).
 * No se envía nada a la base de datos: el pedido se redacta y se abre WhatsApp.
 */

const STORAGE_KEY = 'menu_carrito_v1';
let items = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Si el almacenamiento está lleno o bloqueado, el carrito sigue funcionando en memoria.
  }
  listeners.forEach((cb) => cb(getItems()));
}

export function subscribe(cb) {
  listeners.add(cb);
  cb(getItems());
  return () => listeners.delete(cb);
}

export function getItems() {
  return items.map((item) => ({ ...item }));
}

export function add(product) {
  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    existing.cantidad = Number(existing.cantidad) + 1;
  } else {
    items.push({
      id: product.id,
      nombre: product.nombre,
      precio: Number(product.precio),
      unidad: product.unidad || 'kg',
      cantidad: 1,
    });
  }
  persist();
}

export function setQuantity(id, quantity) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  const next = Number(quantity);
  if (!Number.isFinite(next) || next <= 0) {
    remove(id);
    return;
  }
  item.cantidad = Math.min(Math.floor(next), 999);
  persist();
}

export function remove(id) {
  items = items.filter((item) => item.id !== id);
  persist();
}

export function clear() {
  items = [];
  persist();
}

export function count() {
  return items.reduce((sum, item) => sum + item.cantidad, 0);
}

export function total() {
  return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}
