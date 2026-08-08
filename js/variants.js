const variantsModal = document.getElementById("variantsModal");
const variantsBody = document.getElementById("variantsBody");
const variantsTitle = document.getElementById("variantsTitle");

const COLOR_HEX = { Blanco: "#f4f4f5", Negro: "#18181b", Gris: "#9ca3af", Rojo: "#ef4444" };

let currentVariantProductId = null;

function openVariantsModal(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product || !product.variantes) return;

  currentVariantProductId = productId;
  variantsTitle.textContent = product.nombre;
  renderVariantsGrid(product);
  variantsModal.classList.add("open");
}

function closeVariantsModal() {
  variantsModal.classList.remove("open");
  currentVariantProductId = null;
}

function renderVariantsGrid(product) {
  variantsBody.innerHTML = "";
  product.variantes.forEach((v, i) => {
    const row = document.createElement("div");
    row.className = "variant-row";
    row.style.animationDelay = `${i * 0.05}s`;
    row.innerHTML = `
      <span class="variant-chip">${v.talla}</span>
      <span class="variant-color"><i class="color-dot" style="background:${COLOR_HEX[v.color] || "#c7c7c7"}"></i>${v.color}</span>
      <span class="stock-value" id="variant-stock-${product.id}-${i}">${v.stock}</span>
      <span class="variant-actions">
        <button class="btn-qty btn-minus" data-vi="${i}" data-action="dec" aria-label="Restar unidad">−</button>
        <button class="btn-qty btn-plus" data-vi="${i}" data-action="inc" aria-label="Sumar unidad">+</button>
      </span>
    `;
    variantsBody.appendChild(row);
  });
}

variantsBody.addEventListener("click", (event) => {
  const btn = event.target.closest(".btn-qty");
  if (!btn || currentVariantProductId === null) return;

  const product = PRODUCTS.find((p) => p.id === currentVariantProductId);
  const vi = Number(btn.dataset.vi);
  const variant = product.variantes[vi];
  const isIncrement = btn.dataset.action === "inc";

  variant.stock = Math.max(0, variant.stock + (isIncrement ? 1 : -1));
  flashButton(btn, isIncrement);

  const stockEl = document.getElementById(`variant-stock-${product.id}-${vi}`);
  stockEl.textContent = variant.stock;
  pulseValue(stockEl);

  product.stock = product.variantes.reduce((sum, v) => sum + v.stock, 0);
  updateProductRowDOM(product);
  updateDashboardStats();
});

document.getElementById("variantsClose").addEventListener("click", closeVariantsModal);
variantsModal.addEventListener("click", (event) => {
  if (event.target === variantsModal) closeVariantsModal();
});
