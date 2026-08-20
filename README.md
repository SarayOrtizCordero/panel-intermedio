# Panel de Inventario — Intermedio

Panel de inventario funcional que añade contexto de negocio al nivel
[`básico`](https://github.com/SarayOrtizCordero/panel-basico/blob/main/README.md):
de dónde viene el stock, cómo se mueve, y variantes de producto. Login y
datos persistidos en una base de datos real (Supabase / Postgres). Sin
build step — HTML + CSS + JS vainilla, más el SDK de Supabase por CDN.

## Funcionalidades

- **Acceso con usuario y contraseña:** el inventario solo es visible tras
  iniciar sesión (Supabase Auth). Sin sesión no se puede ni leer ni escribir
  ningún dato — lo aplica la Row Level Security de la base de datos, no solo
  la pantalla de login.
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

## Configuración de Supabase (una sola vez)

1. Crea una cuenta y un proyecto gratuito en [supabase.com](https://supabase.com).
2. En el proyecto, ve a **SQL Editor** → pega y ejecuta todo el contenido de
   [`supabase/schema.sql`](supabase/schema.sql). Esto crea las tablas
   `proveedores`, `products` y `variantes`, activa la Row Level Security y
   carga los datos de ejemplo (4 proveedores, 10 productos, sus variantes).
3. Ve a **Authentication → Providers → Email** y desactiva **"Allow new
   users to sign up"**. Importante: sin este paso, cualquiera con la anon
   key podría crearse una cuenta propia y entrar al panel.
4. Ve a **Authentication → Users → Add user** y crea la cuenta con la que
   entrará el cliente (correo + contraseña). Ese es el login del panel —
   no hay registro público.
5. Ve a **Project Settings → API** y copia la **Project URL** y la **anon /
   public key**.
6. Pégalos en [`js/config.js`](js/config.js), sustituyendo los marcadores
   `TU-PROYECTO` y `TU-ANON-KEY`.

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
│   └── schema.sql          proveedores + products + variantes, RLS y datos de ejemplo
└── js/
    ├── config.js            URL y anon key de tu proyecto Supabase (a rellenar)
    ├── supabaseClient.js     Inicializa el cliente ("db")
    ├── data.js                fetch/insert/update de proveedores, productos y variantes
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
- La anon key en `js/config.js` está pensada para ir en el navegador — no es
  un secreto por sí sola. Quien de verdad protege los datos es la Row Level
  Security del esquema (`to authenticated`), no la key.
- No hay multi-almacén, lotes, código de barras ni módulo financiero — eso
  vive en [`completo/`](https://github.com/SarayOrtizCordero/panel-completo/blob/main/README.md).
