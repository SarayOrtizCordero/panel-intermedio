# Panel de Inventario — Intermedio

Panel de inventario funcional que añade contexto de negocio al nivel
[`básico`](https://github.com/SarayOrtizCordero/panel-basico/blob/main/README.md):
de dónde viene el stock, cómo se mueve, y variantes de producto. Login y
datos persistidos en el propio navegador (`localStorage`). Sin build step —
HTML + CSS + JS vainilla.

> **Sin backend por ahora:** este panel usaba Supabase (Postgres + Auth real),
> pero el proyecto gratuito se quedó sin plan y se pausó. Mientras se decide
> si se retoma esa migración, el login usa un usuario y contraseña fijos
> comprobados en el propio código (`js/config.js`) y los datos se guardan en
> `localStorage` en vez de en una base de datos — o sea, sin seguridad real y
> los datos solo viven en este navegador. `supabase/schema.sql` se deja tal
> cual para cuando se retome esa migración.

## Funcionalidades

- **Acceso con usuario y contraseña:** el inventario solo es visible tras
  iniciar sesión. Por ahora es una comprobación fija en el propio navegador
  (ver nota de arriba), no una autenticación real de servidor.
- **Modo claro / oscuro:** botón en la cabecera que cambia el tema y lo
  recuerda entre visitas; por defecto siempre es claro.
- **Dashboard con analíticas:** dos gráficos de barras horizontales (SVG/CSS,
  sin librerías externas) con los 5 productos más vendidos del mes y los 5
  con menos movimiento ("stock muerto"), animados al cargar.
- **Pestaña Proveedores:** tarjetas expandibles (acordeón con transición de
  altura vía CSS Grid) que listan qué productos se compran a cada proveedor.
- **Módulo de atributos:** productos con variantes de talla × color, cada
  combinación con su propio stock independiente; al modificar una variante
  se recalcula el stock total del producto y se guardan ambos cambios.
- **Reponer stock y añadir producto:** igual que en el nivel básico, con
  selección de proveedor al dar de alta.
- **Importación desde Excel (simulada):** botón destacado que abre un modal,
  simula la subida de un archivo con una barra de progreso de ~2s y **inserta
  de verdad** 50 productos generados en la base de datos.

## Cómo entrar

Entra con el usuario y contraseña definidos en [`js/config.js`](js/config.js)
(`DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD`). Cámbialos ahí si quieres otras
credenciales — no hay registro ni servidor, solo se comparan en el navegador.

## Cómo previsualizar

```bash
python -m http.server 8000
```

y visitar `http://localhost:8000`.

## Estructura

```
intermedio/
├── index.html
├── css/
│   └── styles.css        Variables de color (claro/oscuro), login, tabs, tabla, gráficos, modales
├── supabase/
│   └── schema.sql          proveedores + products + variantes, RLS y datos de ejemplo (sin usar por ahora, ver nota al principio)
└── js/
    ├── config.js            Usuario y contraseña fijos del login de demo
    ├── data.js                fetch/insert/update de proveedores, productos y variantes contra localStorage
    ├── auth.js                 Login, logout y qué pantalla se muestra
    ├── theme.js                 Toggle de modo claro/oscuro
    ├── charts.js                 Gráficos de barras (top ventas / stock muerto)
    ├── products.js                 Tabla de productos + enlace "Ver variantes"
    ├── variants.js                  Modal de variantes (talla × color)
    ├── suppliers.js                  Pestaña Proveedores (acordeón)
    ├── import.js                      Simulación de importación desde Excel
    ├── restock.js                      Modales "Reponer stock" y "Añadir producto"
    └── app.js                          Navegación entre pestañas e inicialización
```

## Notas para extender

- Mismo sistema de variables CSS (claro/oscuro) y patrón de animación de
  entrada que en el nivel básico — consulta su README para el detalle.
- **Ojo con `hidden` + `display` propio en la misma regla:** el modal de
  importación tiene tres estados (`idle` / `progress` / `success`) que se
  alternan con el atributo `hidden`. Si `.import-state { display: flex }` no
  llevara también `.import-state[hidden] { display: none; }`, los tres
  estados se verían superpuestos — ya nos pasó una vez, no lo quites. Lo
  mismo aplica a `.login-screen[hidden]` y `.session-loading[hidden]`.
- Al modificar una variante, `js/variants.js` guarda dos filas a la vez
  (la variante y el `stock` recalculado del producto) con `Promise.all`, y
  revierte ambas si cualquiera de las dos falla — así nunca quedan
  desincronizadas entre sí ni con lo que hay en pantalla.
- Los SKU generados por la importación simulada usan la hora actual como
  semilla (no un contador fijo), para no chocar con SKU de una importación
  anterior ya guardada en la base de datos.
- El usuario/contraseña de `js/config.js` y los datos de `localStorage` son
  solo para la demo — cualquiera con el código fuente puede leerlos o editar
  el storage del navegador. No uses este login tal cual con datos reales.
- No hay multi-almacén, lotes, código de barras ni módulo financiero — eso
  vive en [`completo/`](https://github.com/SarayOrtizCordero/panel-completo/blob/main/README.md).
