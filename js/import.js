const importModal = document.getElementById("importModal");
const importProgressBar = document.getElementById("importProgressBar");
const importProgressText = document.getElementById("importProgressText");
const importStartBtn = document.getElementById("importStartBtn");
const importIdleState = document.getElementById("importIdleState");
const importProgressState = document.getElementById("importProgressState");
const importSuccessState = document.getElementById("importSuccessState");
const importSuccessCount = document.getElementById("importSuccessCount");
const toast = document.getElementById("toast");

const IMPORT_PRODUCT_NAMES = [
  "Camiseta oversize", "Pantalón cargo", "Sudadera crop", "Falda vaquera", "Polo básico",
  "Chaleco acolchado", "Camisa de lino", "Short deportivo", "Blazer casual", "Jersey trenzado",
];

let importCounter = 1000;

function openImportModal() {
  showImportState("idle");
  importModal.classList.add("open");
}

function closeImportModal() {
  importModal.classList.remove("open");
}

function showImportState(state) {
  importIdleState.hidden = state !== "idle";
  importProgressState.hidden = state !== "progress";
  importSuccessState.hidden = state !== "success";
}

function startImport() {
  showImportState("progress");
  importProgressBar.style.width = "0%";
  importProgressText.textContent = "0%";

  const duration = 2000;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const pct = Math.min(100, Math.round((elapsed / duration) * 100));
    importProgressBar.style.width = `${pct}%`;
    importProgressText.textContent = `${pct}%`;

    if (elapsed < duration) {
      requestAnimationFrame(step);
    } else {
      finishImport();
    }
  }

  requestAnimationFrame(step);
}

function generateFakeProducts(n) {
  const products = [];
  for (let i = 0; i < n; i++) {
    importCounter++;
    const name = IMPORT_PRODUCT_NAMES[i % IMPORT_PRODUCT_NAMES.length];
    const tanda = Math.floor(i / IMPORT_PRODUCT_NAMES.length) + 1;
    const proveedor = PROVEEDORES[i % PROVEEDORES.length];

    products.push({
      id: importCounter,
      nombre: `${name} ${tanda}`,
      sku: `IMP-${String(importCounter).padStart(4, "0")}`,
      stock: Math.floor(Math.random() * 40) + 1,
      stockMinimo: Math.floor(Math.random() * 8) + 3,
      proveedorId: proveedor.id,
      ventasMes: Math.floor(Math.random() * 60),
    });
  }
  return products;
}

function finishImport() {
  const added = generateFakeProducts(50);
  PRODUCTS.push(...added);

  importSuccessCount.textContent = added.length;
  showImportState("success");

  setTimeout(() => {
    closeImportModal();
    renderProductsTable();
    updateDashboardStats();
    renderCharts();
    renderSuppliers();
    showToast(`${added.length} productos importados correctamente`);
  }, 900);
}

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

document.getElementById("importOpenBtn").addEventListener("click", openImportModal);
document.getElementById("importCloseBtn").addEventListener("click", closeImportModal);
importStartBtn.addEventListener("click", startImport);
importModal.addEventListener("click", (event) => {
  if (event.target === importModal) closeImportModal();
});
