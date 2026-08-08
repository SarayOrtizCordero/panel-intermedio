// Datos de ejemplo estáticos (demo sin backend)

const PROVEEDORES = [
  { id: 1, nombre: "Textiles Alba", contacto: "pedidos@textilesalba.com" },
  { id: 2, nombre: "Moda Rápida S.L.", contacto: "compras@modarapida.es" },
  { id: 3, nombre: "Calzados Nova", contacto: "ventas@calzadosnova.com" },
  { id: 4, nombre: "Accesorios Norte", contacto: "info@accesoriosnorte.com" },
];

const PRODUCTS = [
  {
    id: 1, nombre: "Camiseta básica", sku: "CAM-001", stock: 24, stockMinimo: 8,
    proveedorId: 1, ventasMes: 86,
    variantes: [
      { talla: "S", color: "Blanco", stock: 4 },
      { talla: "S", color: "Negro", stock: 3 },
      { talla: "M", color: "Blanco", stock: 5 },
      { talla: "M", color: "Negro", stock: 4 },
      { talla: "M", color: "Rojo", stock: 2 },
      { talla: "L", color: "Negro", stock: 3 },
      { talla: "L", color: "Gris", stock: 3 },
    ],
  },
  { id: 2, nombre: "Pantalón vaquero", sku: "PAN-002", stock: 15, stockMinimo: 5, proveedorId: 1, ventasMes: 52 },
  {
    id: 3, nombre: "Sudadera con capucha", sku: "SUD-003", stock: 9, stockMinimo: 6,
    proveedorId: 2, ventasMes: 5,
    variantes: [
      { talla: "S", color: "Negro", stock: 2 },
      { talla: "M", color: "Gris", stock: 3 },
      { talla: "M", color: "Negro", stock: 2 },
      { talla: "L", color: "Rojo", stock: 2 },
    ],
  },
  { id: 4, nombre: "Zapatillas running", sku: "ZAP-004", stock: 12, stockMinimo: 4, proveedorId: 3, ventasMes: 58 },
  { id: 5, nombre: "Gorra deportiva", sku: "GOR-005", stock: 30, stockMinimo: 10, proveedorId: 4, ventasMes: 61 },
  { id: 6, nombre: "Chaqueta impermeable", sku: "CHA-006", stock: 7, stockMinimo: 5, proveedorId: 2, ventasMes: 3 },
  {
    id: 7, nombre: "Vestido de verano", sku: "VES-007", stock: 11, stockMinimo: 5,
    proveedorId: 1, ventasMes: 4,
    variantes: [
      { talla: "S", color: "Rojo", stock: 3 },
      { talla: "M", color: "Rojo", stock: 3 },
      { talla: "M", color: "Blanco", stock: 2 },
      { talla: "L", color: "Negro", stock: 3 },
    ],
  },
  { id: 8, nombre: "Bufanda de lana", sku: "BUF-008", stock: 2, stockMinimo: 5, proveedorId: 4, ventasMes: 1 },
  { id: 9, nombre: "Calcetines (pack 3)", sku: "CAL-009", stock: 40, stockMinimo: 12, proveedorId: 4, ventasMes: 74 },
  { id: 10, nombre: "Guantes térmicos", sku: "GUA-010", stock: 6, stockMinimo: 6, proveedorId: 4, ventasMes: 2 },
];
