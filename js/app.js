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

renderProductsTable();
updateDashboardStats();
renderCharts();
renderSuppliers();
