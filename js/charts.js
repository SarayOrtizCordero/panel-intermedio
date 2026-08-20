function renderBarChart(container, items, color) {
  container.innerHTML = "";
  const max = Math.max(...items.map((i) => i.value), 1);

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-label">${escapeHtml(item.nombre)}</span>
      <span class="bar-track"><span class="bar-fill"></span></span>
      <span class="bar-value">${item.value}</span>
    `;
    container.appendChild(row);

    const fill = row.querySelector(".bar-fill");
    fill.style.background = color;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.width = `${(item.value / max) * 100}%`;
      });
    });
  });
}

function getTopSelling(n) {
  return [...PRODUCTS]
    .sort((a, b) => b.ventasMes - a.ventasMes)
    .slice(0, n)
    .map((p) => ({ nombre: p.nombre, value: p.ventasMes }));
}

function getDeadStock(n) {
  return [...PRODUCTS]
    .sort((a, b) => a.ventasMes - b.ventasMes)
    .slice(0, n)
    .map((p) => ({ nombre: p.nombre, value: p.ventasMes }));
}

function renderCharts() {
  renderBarChart(document.getElementById("chartTopSelling"), getTopSelling(5), "var(--ok)");
  renderBarChart(document.getElementById("chartDeadStock"), getDeadStock(5), "var(--danger)");
}
