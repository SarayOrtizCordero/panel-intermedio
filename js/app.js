const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    views.forEach((v) => v.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.view).classList.add("active");
  });
});

// --- Carga inicial (se dispara desde auth.js tras iniciar sesión) ---
async function initApp() {
  productsBody.innerHTML = '<tr><td colspan="6" class="table-loading">Cargando productos…</td></tr>';
  try {
    await fetchProveedores();
    await fetchProducts();
    renderProductsTable();
    updateDashboardStats();
    renderCharts();
    renderSuppliers();
  } catch (error) {
    console.error(error);
    productsBody.innerHTML = '<tr><td colspan="6" class="table-loading">No se pudieron cargar los productos. Recarga la página.</td></tr>';
    showToast("No se pudieron cargar los productos.");
  }
}
