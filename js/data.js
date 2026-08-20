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

// Acceso a datos vía Supabase. PROVEEDORES/PRODUCTS viven en memoria como
// caché local (así el resto de app.js no cambia) pero la fuente real son las
// tablas "proveedores" / "products" / "variantes" — ver supabase/schema.sql.
let PROVEEDORES = [];
let PRODUCTS = [];

function mapProveedorRow(row) {
  return { id: row.id, nombre: row.nombre, contacto: row.contacto };
}

function mapProductRow(row) {
  const variantes = Array.isArray(row.variantes) && row.variantes.length > 0
    ? row.variantes.map((v) => ({ id: v.id, talla: v.talla, color: v.color, stock: v.stock }))
    : undefined;

  return {
    id: row.id,
    nombre: row.nombre,
    sku: row.sku,
    stock: row.stock,
    stockMinimo: row.stock_minimo,
    proveedorId: row.proveedor_id,
    ventasMes: row.ventas_mes,
    variantes,
  };
}

async function fetchProveedores() {
  const { data, error } = await db
    .from("proveedores")
    .select("id, nombre, contacto")
    .order("id", { ascending: true });

  if (error) throw error;
  PROVEEDORES = data.map(mapProveedorRow);
  return PROVEEDORES;
}

async function fetchProducts() {
  const { data, error } = await db
    .from("products")
    .select("id, nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes, variantes(id, talla, color, stock)")
    .order("id", { ascending: true })
    .order("id", { ascending: true, foreignTable: "variantes" });

  if (error) throw error;
  PRODUCTS = data.map(mapProductRow);
  return PRODUCTS;
}

async function updateProductStock(id, newStock) {
  const { error } = await db.from("products").update({ stock: newStock }).eq("id", id);
  if (error) throw error;
}

async function updateVariantStock(variantId, newStock) {
  const { error } = await db.from("variantes").update({ stock: newStock }).eq("id", variantId);
  if (error) throw error;
}

async function insertProduct({ nombre, sku, stock, stockMinimo, proveedorId }) {
  const { data, error } = await db
    .from("products")
    .insert({ nombre, sku, stock, stock_minimo: stockMinimo, proveedor_id: proveedorId, ventas_mes: 0 })
    .select("id, nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes")
    .single();

  if (error) throw error;
  return mapProductRow(data);
}

async function insertProductsBatch(rows) {
  const payload = rows.map((r) => ({
    nombre: r.nombre,
    sku: r.sku,
    stock: r.stock,
    stock_minimo: r.stockMinimo,
    proveedor_id: r.proveedorId,
    ventas_mes: r.ventasMes,
  }));

  const { data, error } = await db
    .from("products")
    .insert(payload)
    .select("id, nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes");

  if (error) throw error;
  return data.map(mapProductRow);
}
