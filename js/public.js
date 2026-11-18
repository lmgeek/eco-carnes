/**
 * Carta pública: productos, filtros, carrito y pedido por WhatsApp.
 */

import {
  demoMode,
  getProducts,
  getConfig,
  optimizedImage,
  formatMoney,
  escapeHtml,
  buildOrderMessage,
  whatsappUrl,
} from './lib.js';
import * as cart from './cart.js';

const $ = (selector) => document.querySelector(selector);

const elements = {
  demoBanner: $('#demo-banner'),
  hideDemoBanner: $('#hide-demo-banner'),
  brandName: $('#brand-name'),
  footerName: $('#footer-name'),
  filtros: $('#filtros'),
  productos: $('#productos'),
  estadoVacio: $('#estado-vacio'),
  estadoVacioTexto: $('#estado-vacio-texto'),
  cartFab: $('#cart-fab'),
  cartCount: $('#cart-count'),
  drawer: $('#cart-drawer'),
  overlay: $('#drawer-overlay'),
  closeCart: $('#close-cart'),
  cartItems: $('#cart-items'),
  cartEmpty: $('#cart-empty'),
  cartTotal: $('#cart-total'),
  customerName: $('#customer-name'),
  customerNote: $('#customer-note'),
  sendWhatsapp: $('#send-whatsapp'),
  toast: $('#toast'),
};

let config = null;
let products = [];
let categoriaActiva = null;

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.style.borderLeft = `3px solid ${isError ? 'var(--oxblood)' : 'var(--sage)'}`;
  elements.toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove('is-visible'), 3200);
}

function applyConfig(data) {
  config = data;
  const nombre = data?.nombre_negocio || 'Eco Carnes';
  elements.brandName.textContent = nombre;
  elements.footerName.textContent = nombre;
  document.title = `Carta | ${nombre}`;
}

function renderFilters() {
  const categorias = [...new Set(products.map((p) => p.categoria).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
  if (categorias.length <= 1) {
    elements.filtros.hidden = true;
    return;
  }
  elements.filtros.hidden = false;
  const opciones = ['Todos', ...categorias];
  elements.filtros.innerHTML = opciones
    .map(
      (cat) => `<button type="button" class="filtro${cat === (categoriaActiva || 'Todos') ? ' is-active' : ''}"
        data-categoria="${escapeHtml(cat)}" aria-pressed="${cat === (categoriaActiva || 'Todos')}">
        ${escapeHtml(cat)}
      </button>`
    )
    .join('');
}

function renderProducts() {
  const visibles = categoriaActiva
    ? products.filter((p) => p.categoria === categoriaActiva)
    : products;

  if (!visibles.length) {
    elements.productos.innerHTML = '';
    elements.estadoVacio.hidden = false;
    elements.estadoVacioTexto.textContent = categoriaActiva
      ? `No hay productos en la categoría ${categoriaActiva}.`
      : 'Cuando el administrador cargue la carta, vas a ver los cortes acá.';
    return;
  }

  elements.estadoVacio.hidden = true;
  elements.productos.innerHTML = visibles
    .map((product) => {
      const imagen = optimizedImage(product.imagen_url, 500);
      return `
        <article class="producto">
          <div class="producto__media">
            <div class="producto__noimg">Sin imagen</div>
            ${imagen ? `<img src="${escapeHtml(imagen)}" alt="${escapeHtml(product.nombre)}" loading="lazy" />` : ''}
            ${product.categoria ? `<span class="producto__categoria">${escapeHtml(product.categoria)}</span>` : ''}
          </div>
          <div class="producto__body">
            <h3 class="producto__nombre">${escapeHtml(product.nombre)}</h3>
            <p class="producto__precio">
              ${escapeHtml(formatMoney(product.precio, config?.moneda))}
              <span class="producto__unidad">por ${escapeHtml(product.unidad || 'kg')}</span>
            </p>
            <button type="button" class="producto__agregar" data-agregar="${escapeHtml(product.id)}">
              Agregar +
            </button>
          </div>
        </article>`;
    })
    .join('');

  elements.productos.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => img.remove(), { once: true });
  });
}

function renderCart() {
  const items = cart.getItems();
  elements.cartCount.textContent = String(cart.count());
  elements.cartEmpty.hidden = items.length > 0;
  elements.sendWhatsapp.disabled = items.length === 0;
  elements.cartTotal.textContent = formatMoney(cart.total(), config?.moneda);

  elements.cartItems.innerHTML = items
    .map(
      (item) => `
        <div class="cart-item" data-id="${escapeHtml(item.id)}">
          <div>
            <p class="cart-item__name">${escapeHtml(item.nombre)}</p>
            <p class="cart-item__detail">${item.cantidad} ${escapeHtml(item.unidad)} · ${escapeHtml(
              formatMoney(item.precio * item.cantidad, config?.moneda)
            )}</p>
          </div>
          <div class="qty">
            <button type="button" data-accion="menos" aria-label="Quitar una unidad de ${escapeHtml(item.nombre)}">−</button>
            <span>${item.cantidad}</span>
            <button type="button" data-accion="mas" aria-label="Agregar una unidad de ${escapeHtml(item.nombre)}">+</button>
          </div>
          <button type="button" class="cart-item__remove" data-accion="quitar" aria-label="Quitar ${escapeHtml(item.nombre)} del pedido">×</button>
        </div>`
    )
    .join('');
}

function openCart() {
  elements.drawer.classList.add('is-open');
  elements.drawer.setAttribute('aria-hidden', 'false');
  elements.cartFab.setAttribute('aria-expanded', 'true');
  elements.overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  elements.drawer.classList.remove('is-open');
  elements.drawer.setAttribute('aria-hidden', 'true');
  elements.cartFab.setAttribute('aria-expanded', 'false');
  elements.overlay.hidden = true;
  document.body.style.overflow = '';
}

function sendOrder() {
  const items = cart.getItems();
  if (!items.length) return;

  const nombre = elements.customerName.value.trim();
  if (!nombre) {
    showToast('Escribí tu nombre para que sepamos quién hace el pedido.', true);
    elements.customerName.focus();
    return;
  }

  const numero = config?.whatsapp;
  if (!numero) {
    showToast('Falta el número de WhatsApp. Avísale al administrador.', true);
    return;
  }

  const mensaje = buildOrderMessage(items, config, {
    nombre,
    nota: elements.customerNote.value,
  });
  window.open(whatsappUrl(numero, mensaje), '_blank', 'noopener,noreferrer');
  showToast('Abriendo WhatsApp con tu pedido ya redactado.');
}

function wireEvents() {
  elements.hideDemoBanner?.addEventListener('click', () => {
    elements.demoBanner.hidden = true;
  });

  elements.filtros.addEventListener('click', (event) => {
    const button = event.target.closest('[data-categoria]');
    if (!button) return;
    const categoria = button.dataset.categoria;
    categoriaActiva = categoria === 'Todos' ? null : categoria;
    renderFilters();
    renderProducts();
  });

  elements.productos.addEventListener('click', (event) => {
    const button = event.target.closest('[data-agregar]');
    if (!button) return;
    const product = products.find((p) => p.id === button.dataset.agregar);
    if (!product) return;
    cart.add(product);
    showToast(`${product.nombre} agregado al pedido.`);
  });

  elements.cartItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-accion]');
    if (!button) return;
    const id = button.closest('[data-id]')?.dataset.id;
    if (!id) return;
    const item = cart.getItems().find((entry) => entry.id === id);
    if (!item) return;

    if (button.dataset.accion === 'mas') cart.setQuantity(id, item.cantidad + 1);
    if (button.dataset.accion === 'menos') cart.setQuantity(id, item.cantidad - 1);
    if (button.dataset.accion === 'quitar') cart.remove(id);
  });

  elements.cartFab.addEventListener('click', openCart);
  elements.closeCart.addEventListener('click', closeCart);
  elements.overlay.addEventListener('click', closeCart);
  elements.sendWhatsapp.addEventListener('click', sendOrder);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.drawer.classList.contains('is-open')) closeCart();
  });

  cart.subscribe(renderCart);
}

async function init() {
  if (demoMode) elements.demoBanner.hidden = false;
  wireEvents();

  try {
    const [configData, productData] = await Promise.all([getConfig(), getProducts()]);
    applyConfig(configData);
    products = productData;
    renderFilters();
    renderProducts();
    renderCart();
  } catch (error) {
    console.error(error);
    elements.estadoVacio.hidden = false;
    elements.estadoVacioTexto.textContent =
      'No se pudo cargar la carta. Revisá la configuración de Supabase o intentá de nuevo en unos minutos.';
    showToast('No se pudo cargar la carta.', true);
  }
}

init();
