// Escapa texto antes de insertarlo en innerHTML — nombre, SKU, proveedor y
// variantes vienen de datos guardados por usuarios (o de la base de datos),
// nunca deben tratarse como HTML de confianza.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Datos de ejemplo + persistencia en localStorage (demo sin backend, ver
// js/config.js). PROVEEDORES/PRODUCTS viven en memoria como caché local que
// la pantalla renderiza; cada función de aquí abajo la refleja también en
// localStorage para que sobreviva a recargar la página. Mismos datos de
// partida que supabase/schema.sql (proveedores, products, variantes), por si
// más adelante se retoma esa migración.
const PROVEEDORES_STORAGE_KEY = "panelintermedio-proveedores-v1";
const PRODUCTS_STORAGE_KEY = "panelintermedio-products-v1";

const SEED_PROVEEDORES = [
  { id: 1, nombre: "Textiles Alba", contacto: "pedidos@textilesalba.com" },
  { id: 2, nombre: "Moda Rápida S.L.", contacto: "compras@modarapida.es" },
  { id: 3, nombre: "Calzados Nova", contacto: "ventas@calzadosnova.com" },
  { id: 4, nombre: "Accesorios Norte", contacto: "info@accesoriosnorte.com" },
];

const SEED_PRODUCTS = [
  {
    id: 1, nombre: "Camiseta básica", sku: "CAM-001", stock: 24, stockMinimo: 8, proveedorId: 1, ventasMes: 86,
    variantes: [
      { id: 1, talla: "S", color: "Blanco", stock: 4 },
      { id: 2, talla: "S", color: "Negro", stock: 3 },
      { id: 3, talla: "M", color: "Blanco", stock: 5 },
      { id: 4, talla: "M", color: "Negro", stock: 4 },
      { id: 5, talla: "M", color: "Rojo", stock: 2 },
      { id: 6, talla: "L", color: "Negro", stock: 3 },
      { id: 7, talla: "L", color: "Gris", stock: 3 },
    ],
  },
  { id: 2, nombre: "Pantalón vaquero", sku: "PAN-002", stock: 15, stockMinimo: 5, proveedorId: 1, ventasMes: 52 },
  {
    id: 3, nombre: "Sudadera con capucha", sku: "SUD-003", stock: 9, stockMinimo: 6, proveedorId: 2, ventasMes: 5,
    variantes: [
      { id: 8, talla: "S", color: "Negro", stock: 2 },
      { id: 9, talla: "M", color: "Gris", stock: 3 },
      { id: 10, talla: "M", color: "Negro", stock: 2 },
      { id: 11, talla: "L", color: "Rojo", stock: 2 },
    ],
  },
  { id: 4, nombre: "Zapatillas running", sku: "ZAP-004", stock: 12, stockMinimo: 4, proveedorId: 3, ventasMes: 58 },
  { id: 5, nombre: "Gorra deportiva", sku: "GOR-005", stock: 30, stockMinimo: 10, proveedorId: 4, ventasMes: 61 },
  { id: 6, nombre: "Chaqueta impermeable", sku: "CHA-006", stock: 7, stockMinimo: 5, proveedorId: 2, ventasMes: 3 },
  {
    id: 7, nombre: "Vestido de verano", sku: "VES-007", stock: 11, stockMinimo: 5, proveedorId: 1, ventasMes: 4,
    variantes: [
      { id: 12, talla: "S", color: "Rojo", stock: 3 },
      { id: 13, talla: "M", color: "Rojo", stock: 3 },
      { id: 14, talla: "M", color: "Blanco", stock: 2 },
      { id: 15, talla: "L", color: "Negro", stock: 3 },
    ],
  },
  { id: 8, nombre: "Bufanda de lana", sku: "BUF-008", stock: 2, stockMinimo: 5, proveedorId: 4, ventasMes: 1 },
  { id: 9, nombre: "Calcetines (pack 3)", sku: "CAL-009", stock: 40, stockMinimo: 12, proveedorId: 4, ventasMes: 74 },
  { id: 10, nombre: "Guantes térmicos", sku: "GUA-010", stock: 6, stockMinimo: 6, proveedorId: 4, ventasMes: 2 },
];

let PROVEEDORES = [];
let PRODUCTS = [];

function readStored(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    // localStorage corrupto o no disponible: se regenera desde los datos base.
  }
  return null;
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Cuota excedida o modo privado: los cambios solo viven en memoria de esta pestaña.
  }
}

function nextProductId(products) {
  return products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

async function fetchProveedores() {
  const stored = readStored(PROVEEDORES_STORAGE_KEY);
  if (stored) {
    PROVEEDORES = stored;
  } else {
    PROVEEDORES = SEED_PROVEEDORES.map((p) => ({ ...p }));
    writeStored(PROVEEDORES_STORAGE_KEY, PROVEEDORES);
  }
  return PROVEEDORES;
}

async function fetchProducts() {
  const stored = readStored(PRODUCTS_STORAGE_KEY);
  if (stored) {
    PRODUCTS = stored;
  } else {
    PRODUCTS = SEED_PRODUCTS.map((p) => ({ ...p, variantes: p.variantes ? p.variantes.map((v) => ({ ...v })) : undefined }));
    writeStored(PRODUCTS_STORAGE_KEY, PRODUCTS);
  }
  return PRODUCTS;
}

async function updateProductStock(id, newStock) {
  // El llamador ya actualizó el stock en el objeto de PRODUCTS antes de
  // invocar esto (actualización optimista) — solo queda persistirlo.
  writeStored(PRODUCTS_STORAGE_KEY, PRODUCTS);
}

async function updateVariantStock(variantId, newStock) {
  // Igual que updateProductStock: variants.js ya mutó la variante (y el
  // stock del producto) en PRODUCTS antes de llamar aquí.
  writeStored(PRODUCTS_STORAGE_KEY, PRODUCTS);
}

async function insertProduct({ nombre, sku, stock, stockMinimo, proveedorId }) {
  if (PRODUCTS.some((p) => p.sku === sku)) {
    const error = new Error("Ya existe un producto con ese SKU.");
    error.code = "23505";
    throw error;
  }

  const product = { id: nextProductId(PRODUCTS), nombre, sku, stock, stockMinimo, proveedorId, ventasMes: 0 };
  writeStored(PRODUCTS_STORAGE_KEY, [...PRODUCTS, product]);
  return product;
}

async function insertProductsBatch(rows) {
  let nextId = nextProductId(PRODUCTS);
  const newProducts = rows.map((r) => ({
    id: nextId++,
    nombre: r.nombre,
    sku: r.sku,
    stock: r.stock,
    stockMinimo: r.stockMinimo,
    proveedorId: r.proveedorId,
    ventasMes: r.ventasMes,
  }));

  writeStored(PRODUCTS_STORAGE_KEY, [...PRODUCTS, ...newProducts]);
  return newProducts;
}

async function upsertProductsChunk(rows) {
  let nextId = nextProductId(PRODUCTS);
  const bySku = new Map(PRODUCTS.map((p) => [p.sku, p]));
  const result = [];

  rows.forEach(({ nombre, sku, stock, stockMinimo, proveedorId }) => {
    const existing = bySku.get(sku);
    const product = existing
      ? { ...existing, nombre, stock, stockMinimo, proveedorId }
      : { id: nextId++, nombre, sku, stock, stockMinimo, proveedorId, ventasMes: 0 };
    bySku.set(sku, product);
    result.push(product);
  });

  writeStored(PRODUCTS_STORAGE_KEY, [...bySku.values()]);
  return result;
}
