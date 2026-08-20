// --- Modal: reponer stock ---
const restockModal = document.getElementById("restockModal");
const restockForm = document.getElementById("restockForm");
const restockTitle = document.getElementById("restockTitle");
const restockQty = document.getElementById("restockQty");
let restockProductId = null;

function openRestockModal(id) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return;

  restockProductId = id;
  restockTitle.textContent = product.nombre;
  restockQty.value = 10;
  restockModal.classList.add("open");
  restockQty.focus();
}

function closeRestockModal() {
  restockModal.classList.remove("open");
  restockProductId = null;
}

restockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const qty = Number(restockQty.value);
  if (!restockProductId || !Number.isFinite(qty) || qty <= 0) return;

  const product = PRODUCTS.find((p) => p.id === restockProductId);
  changeProductStock(restockProductId, qty);
  closeRestockModal();
  showToast(`+${qty} uds. añadidas a ${product.nombre}`);
});

document.getElementById("restockClose").addEventListener("click", closeRestockModal);
restockModal.addEventListener("click", (event) => {
  if (event.target === restockModal) closeRestockModal();
});

// --- Modal: añadir producto ---
const addProductModal = document.getElementById("addProductModal");
const addProductForm = document.getElementById("addProductForm");
const newProductProveedor = document.getElementById("newProductProveedor");

function populateProveedorSelect() {
  newProductProveedor.innerHTML = PROVEEDORES.map((pr) => `<option value="${pr.id}">${escapeHtml(pr.nombre)}</option>`).join("");
}

function openAddProductModal() {
  addProductForm.reset();
  populateProveedorSelect();
  document.getElementById("newProductStockMinimo").value = 5;
  document.getElementById("newProductStock").value = 0;
  addProductModal.classList.add("open");
  document.getElementById("newProductNombre").focus();
}

function closeAddProductModal() {
  addProductModal.classList.remove("open");
}

addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nombre = document.getElementById("newProductNombre").value.trim();
  const sku = document.getElementById("newProductSku").value.trim();
  const stock = Math.max(0, Number(document.getElementById("newProductStock").value));
  const stockMinimo = Math.max(0, Number(document.getElementById("newProductStockMinimo").value));
  const proveedorId = Number(newProductProveedor.value);
  if (!nombre || !sku) return;

  const submitBtn = addProductForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const product = await insertProduct({ nombre, sku, stock, stockMinimo, proveedorId });
    PRODUCTS.push(product);

    renderProductsTable();
    updateDashboardStats();
    renderSuppliers();
    closeAddProductModal();
    showToast(`${nombre} añadido al inventario`);
  } catch (error) {
    console.error(error);
    const message = error.code === "23505" ? "Ya existe un producto con ese SKU." : "No se pudo añadir el producto. Inténtalo de nuevo.";
    showToast(message);
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById("addProductOpenBtn").addEventListener("click", openAddProductModal);
document.getElementById("addProductClose").addEventListener("click", closeAddProductModal);
addProductModal.addEventListener("click", (event) => {
  if (event.target === addProductModal) closeAddProductModal();
});
