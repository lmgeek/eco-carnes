/**
 * Panel de administración: acceso, CRUD de productos y configuración.
 */

import {
  demoMode,
  cloudinaryReady,
  getProducts,
  getConfig,
  saveProduct,
  deleteProduct,
  updateConfig,
  uploadImage,
  signIn,
  signOut,
  getUser,
  onAuthChange,
  optimizedImage,
  formatMoney,
  escapeHtml,
} from './lib.js';

const $ = (selector) => document.querySelector(selector);

const elements = {
  demoBanner: $('#demo-banner'),
  loginView: $('#login-view'),
  panelView: $('#panel-view'),
  loginForm: $('#login-form'),
  loginEmail: $('#login-email'),
  loginPassword: $('#login-password'),
  loginError: $('#login-error'),
  loginHint: $('#login-hint'),
  loginSubmit: $('#login-submit'),
  adminBusiness: $('#admin-business'),
  panelUser: $('#panel-user'),
  logout: $('#logout'),
  newProduct: $('#new-product'),
  productosBody: $('#productos-body'),
  panelEmpty: $('#panel-empty'),
  configForm: $('#config-form'),
  cfgNombre: $('#cfg-nombre'),
  cfgWhatsapp: $('#cfg-whatsapp'),
  cfgMoneda: $('#cfg-moneda'),
  cfgMensaje: $('#cfg-mensaje'),
  configError: $('#config-error'),
  configSubmit: $('#config-submit'),
  dialog: $('#product-dialog'),
  dialogTitle: $('#dialog-title'),
  productForm: $('#product-form'),
  closeDialog: $('#close-dialog'),
  cancelDialog: $('#cancel-dialog'),
  pNombre: $('#p-nombre'),
  pPrecio: $('#p-precio'),
  pUnidad: $('#p-unidad'),
  pCategoria: $('#p-categoria'),
  pOrden: $('#p-orden'),
  pImagen: $('#p-imagen'),
  pActivo: $('#p-activo'),
  productError: $('#product-error'),
  saveProduct: $('#save-product'),
  uploadPreview: $('#upload-preview'),
  uploadPreviewImg: $('#upload-preview-img'),
  uploadBarFill: $('#upload-bar-fill'),
  uploadText: $('#upload-text'),
  toast: $('#toast'),
};

let productos = [];
let editingId = null;
let imagenActual = '';
let currentUserKey = undefined;

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.style.borderLeft = `3px solid ${isError ? 'var(--oxblood)' : 'var(--sage)'}`;
  elements.toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove('is-visible'), 3200);
}

function showError(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

function renderTable() {
  elements.panelEmpty.hidden = productos.length > 0;
  elements.productosBody.innerHTML = productos
    .map((product) => {
      const imagen = optimizedImage(product.imagen_url, 120);
      const media = imagen
        ? `<img src="${escapeHtml(imagen)}" alt="" loading="lazy" />`
        : '<span class="product-cell__noimg">Sin foto</span>';
      return `
        <tr data-id="${escapeHtml(product.id)}">
          <td>
            <div class="product-cell">
              ${media}
              <div>
                <p class="product-cell__name">${escapeHtml(product.nombre)}</p>
                <p class="product-cell__meta">Orden ${escapeHtml(product.orden ?? 0)}</p>
              </div>
            </div>
          </td>
          <td class="price-cell">
            ${escapeHtml(formatMoney(product.precio))}
            <small>${escapeHtml(product.unidad || 'kg')}</small>
          </td>
          <td>${product.categoria ? escapeHtml(product.categoria) : '—'}</td>
          <td>
            <span class="estado ${product.activo ? 'estado--activo' : 'estado--oculto'}">
              ${product.activo ? 'Visible' : 'Oculto'}
            </span>
          </td>
          <td class="product-table__actions">
            <div class="row-actions">
              <button type="button" data-action="editar">Editar</button>
              <button type="button" data-action="visible">${product.activo ? 'Ocultar' : 'Mostrar'}</button>
              <button type="button" data-action="delete">Eliminar</button>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  elements.productosBody.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'product-cell__noimg';
      fallback.textContent = 'Sin foto';
      img.replaceWith(fallback);
    }, { once: true });
  });
}

async function loadPanelData() {
  try {
    const [configData, productData] = await Promise.all([
      getConfig(),
      getProducts({ includeInactive: true }),
    ]);
    productos = productData;
    elements.adminBusiness.textContent = configData?.nombre_negocio || 'Eco Carnes';
    elements.cfgNombre.value = configData?.nombre_negocio || '';
    elements.cfgWhatsapp.value = configData?.whatsapp || '';
    elements.cfgMoneda.value = configData?.moneda || '$';
    elements.cfgMensaje.value = configData?.mensaje_inicial || '';
    renderTable();
  } catch (error) {
    console.error(error);
    showToast('No se pudieron cargar los datos del panel.', true);
  }
}

async function syncView(user) {
  const key = user ? user.id || user.email : null;
  if (key === currentUserKey) return;
  currentUserKey = key;

  if (user) {
    elements.loginView.hidden = true;
    elements.panelView.hidden = false;
    elements.panelUser.textContent = user.email || '';
    await loadPanelData();
  } else {
    elements.panelView.hidden = true;
    elements.loginView.hidden = false;
    productos = [];
    elements.productosBody.innerHTML = '';
  }
}

function setPreview(url, text) {
  imagenActual = url || '';
  elements.uploadPreview.hidden = !url;
  elements.uploadPreviewImg.src = url || '';
  elements.uploadBarFill.style.width = '0%';
  elements.uploadText.textContent = text || '';
}

function openDialog(product) {
  editingId = product?.id || null;
  elements.dialogTitle.textContent = product ? 'Editar producto' : 'Nuevo producto';
  elements.pNombre.value = product?.nombre || '';
  elements.pPrecio.value = product?.precio ?? '';
  elements.pUnidad.value = product?.unidad || 'kg';
  elements.pCategoria.value = product?.categoria || '';
  elements.pOrden.value = product?.orden ?? 0;
  elements.pActivo.checked = product ? Boolean(product.activo) : true;
  elements.pImagen.value = '';
  showError(elements.productError, '');
  setPreview(optimizedImage(product?.imagen_url, 400), product?.imagen_url ? 'Imagen actual' : '');
  elements.dialog.showModal();
  elements.pNombre.focus();
}

function closeDialog() {
  elements.dialog.close();
}

async function handleProductSubmit(event) {
  event.preventDefault();
  showError(elements.productError, '');

  const nombre = elements.pNombre.value.trim();
  const precio = Number(elements.pPrecio.value);
  if (!nombre) {
    showError(elements.productError, 'Escribí el nombre del producto.');
    return;
  }
  if (!Number.isFinite(precio) || precio < 0) {
    showError(elements.productError, 'Ingresá un precio válido (mayor o igual a cero).');
    return;
  }

  const archivo = elements.pImagen.files?.[0];
  let imagen_url = imagenActual;

  elements.saveProduct.disabled = true;
  elements.saveProduct.textContent = 'Guardando…';

  try {
    if (archivo) {
      elements.uploadPreview.hidden = false;
      elements.uploadText.textContent = 'Subiendo imagen…';
      imagen_url = await uploadImage(archivo, (progress) => {
        elements.uploadBarFill.style.width = `${progress}%`;
      });
    }

    await saveProduct({
      id: editingId,
      nombre,
      precio,
      unidad: elements.pUnidad.value.trim() || 'kg',
      categoria: elements.pCategoria.value.trim(),
      orden: Number(elements.pOrden.value) || 0,
      imagen_url,
      activo: elements.pActivo.checked,
    });

    await loadPanelData();
    closeDialog();
    showToast(editingId ? 'Producto actualizado.' : 'Producto creado.');
  } catch (error) {
    console.error(error);
    showError(elements.productError, error.message || 'No se pudo guardar el producto.');
  } finally {
    elements.saveProduct.disabled = false;
    elements.saveProduct.textContent = 'Guardar producto';
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = button.closest('[data-id]')?.dataset.id;
  const product = productos.find((entry) => entry.id === id);
  if (!product) return;

  if (button.dataset.action === 'editar') {
    openDialog(product);
    return;
  }

  if (button.dataset.action === 'visible') {
    try {
      await saveProduct({ ...product, activo: !product.activo });
      await loadPanelData();
      showToast(product.activo ? 'Producto oculto de la carta.' : 'Producto visible en la carta.');
    } catch (error) {
      showToast(error.message || 'No se pudo cambiar el estado.', true);
    }
    return;
  }

  if (button.dataset.action === 'delete') {
    if (!confirm(`¿Eliminar "${product.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteProduct(id);
      await loadPanelData();
      showToast('Producto eliminado.');
    } catch (error) {
      showToast(error.message || 'No se pudo eliminar el producto.', true);
    }
  }
}

async function handleConfigSubmit(event) {
  event.preventDefault();
  showError(elements.configError, '');
  elements.configSubmit.disabled = true;
  try {
    const data = await updateConfig({
      whatsapp: elements.cfgWhatsapp.value,
      nombre_negocio: elements.cfgNombre.value,
      moneda: elements.cfgMoneda.value,
      mensaje_inicial: elements.cfgMensaje.value,
    });
    elements.adminBusiness.textContent = data.nombre_negocio;
    elements.cfgWhatsapp.value = data.whatsapp;
    showToast('Configuración guardada.');
  } catch (error) {
    showError(elements.configError, error.message || 'No se pudo guardar la configuración.');
  } finally {
    elements.configSubmit.disabled = false;
  }
}

function wireEvents() {
  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(elements.loginError, '');
    elements.loginSubmit.disabled = true;
    elements.loginSubmit.textContent = 'Ingresando…';
    try {
      await signIn(elements.loginEmail.value.trim(), elements.loginPassword.value);
      await syncView(await getUser());
      showToast('Sesión iniciada.');
    } catch (error) {
      showError(elements.loginError, error.message || 'No se pudo iniciar sesión.');
    } finally {
      elements.loginSubmit.disabled = false;
      elements.loginSubmit.textContent = 'Ingresar';
    }
  });

  elements.logout.addEventListener('click', async () => {
    try {
      await signOut();
      await syncView(null);
    } catch (error) {
      showToast(error.message || 'No se pudo cerrar la sesión.', true);
    }
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.hidden = panel.id !== `tab-${tab.dataset.tab}`;
      });
    });
  });

  elements.newProduct.addEventListener('click', () => openDialog(null));
  elements.closeDialog.addEventListener('click', closeDialog);
  elements.cancelDialog.addEventListener('click', closeDialog);
  elements.dialog.addEventListener('click', (event) => {
    if (event.target === elements.dialog) closeDialog();
  });
  elements.productForm.addEventListener('submit', handleProductSubmit);
  elements.productosBody.addEventListener('click', handleTableClick);
  elements.configForm.addEventListener('submit', handleConfigSubmit);

  elements.pImagen.addEventListener('change', () => {
    const file = elements.pImagen.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url, `Lista para subir: ${file.name}`);
  });

  onAuthChange((user) => syncView(user));
}

async function init() {
  if (demoMode) {
    elements.demoBanner.hidden = false;
    elements.loginHint.hidden = false;
  }
  if (!demoMode && !cloudinaryReady) {
    // No bloquea el panel: el aviso aparece al intentar subir una imagen.
    console.info('Cloudinary sin configurar: las fotos nuevas no se podrán subir.');
  }
  wireEvents();
  await syncView(await getUser());
}

init();
