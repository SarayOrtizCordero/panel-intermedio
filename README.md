# Panel de Inventario — Intermedio

Demo estática que añade contexto de negocio al nivel [`básico`](https://github.com/SarayOrtizCordero/panel-intermedio/blob/main/README.md):
de dónde viene el stock, cómo se mueve, y variantes de producto. Sin backend,
sin build step — HTML + CSS + JS vainilla, organizado en pestañas.

## Funcionalidades

- **Dashboard con analíticas:** dos gráficos de barras horizontales (SVG/CSS,
  sin librerías externas) con los 5 productos más vendidos del mes y los 5
  con menos movimiento ("stock muerto"), animados al cargar.
- **Pestaña Proveedores:** tarjetas expandibles (acordeón con transición de
  altura vía CSS Grid) que listan qué productos se compran a cada proveedor.
- **Módulo de atributos:** productos con variantes de talla × color, cada
  combinación con su propio stock independiente; al modificar una variante
  se recalcula automáticamente el stock total del producto en la tabla y el
  dashboard.
- **Importación desde Excel (simulada):** botón destacado que abre un modal,
  simula la subida de un archivo con una barra de progreso de ~2s y añade 50
  productos generados de golpe, con aviso de confirmación.

## Cómo previsualizar

Es 100% estático:

```bash
python -m http.server 8000
```

y visitar `http://localhost:8000`. También puedes abrir `index.html`
directamente con doble clic.

## Estructura

```
intermedio/
├── index.html
├── css/
│   └── styles.css      Variables de color, tabs, tabla, gráficos, modales
└── js/
    ├── data.js          Productos (+ variantes, proveedor, ventas) y proveedores
    ├── charts.js         Gráficos de barras (top ventas / stock muerto)
    ├── products.js        Tabla de productos + enlace "Ver variantes"
    ├── suppliers.js        Pestaña Proveedores (acordeón)
    ├── import.js           Simulación de importación desde Excel
    └── app.js              Navegación entre pestañas e inicialización
```

## Datos de ejemplo

`js/data.js` define `PRODUCTS` (10 productos con `proveedorId`, `ventasMes`
y, para camiseta/sudadera/vestido, un array `variantes: [{talla, color,
stock}]`) y `PROVEEDORES` (4 proveedores). Todo vive en memoria: **los
cambios de stock y las importaciones se pierden al recargar la página**.

Los 10 productos están repartidos exactamente en top-5-vendidos /
top-5-sin-movimiento para que ambos gráficos se vean poblados desde el
primer render.

## Notas para extender

- Mismo sistema de variables CSS y patrón de animación de entrada
  (`opacity:0; animation: fadeInUp … both;` con delay escalonado) que en el
  nivel básico — consulta su README para el detalle.
- **Ojo con `hidden` + `display` propio en la misma regla:** el modal de
  importación tiene tres estados (`idle` / `progress` / `success`) que se
  alternan con el atributo `hidden`. Si `.import-state { display: flex }` no
  llevara también `.import-state[hidden] { display: none; }`, los tres
  estados se verían superpuestos — ya nos pasó una vez, no lo quites.
- Al añadir un producto con variantes, asegúrate de que
  `variantes.reduce((s, v) => s + v.stock, 0)` coincida con el `stock` del
  producto — la UI no lo valida automáticamente, solo lo mantiene
  consistente a partir de esa igualdad inicial.
- No hay multi-almacén, lotes, código de barras ni módulo financiero — eso
  vive en [`completo/`](../completo/README.md).
