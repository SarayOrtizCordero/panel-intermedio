const suppliersGrid = document.getElementById("suppliersGrid");

function renderSuppliers() {
  suppliersGrid.innerHTML = "";

  PROVEEDORES.forEach((prov, index) => {
    const productos = PRODUCTS.filter((p) => p.proveedorId === prov.id);

    const card = document.createElement("div");
    card.className = "supplier-card";
    card.style.animationDelay = `${index * 0.06}s`;
    card.innerHTML = `
      <button class="supplier-header" data-id="${prov.id}">
        <span class="supplier-avatar">${prov.nombre[0]}</span>
        <span class="supplier-info">
          <span class="supplier-name">${prov.nombre}</span>
          <span class="supplier-meta">${productos.length} producto${productos.length === 1 ? "" : "s"} · ${prov.contacto}</span>
        </span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div class="supplier-panel">
        <div class="supplier-panel-inner">
          ${productos.length
            ? productos.map((p) => `
                <div class="supplier-product-row">
                  <span class="supplier-product-name">${p.nombre}</span>
                  <span class="sku">${p.sku}</span>
                  <span class="stock-value">${p.stock} uds.</span>
                </div>
              `).join("")
            : '<p class="empty-note">Sin productos registrados.</p>'}
        </div>
      </div>
    `;
    suppliersGrid.appendChild(card);
  });
}

suppliersGrid.addEventListener("click", (event) => {
  const header = event.target.closest(".supplier-header");
  if (!header) return;
  header.closest(".supplier-card").classList.toggle("expanded");
});
