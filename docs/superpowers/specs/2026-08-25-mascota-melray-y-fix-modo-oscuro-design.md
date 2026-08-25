# Mascota oficial de Melray, footer y fix de modo oscuro en Proveedores — panel-intermedio

## Contexto

`panel-intermedio` no tiene ninguna referencia visual a Melray: usa un icono
genérico de caja/paquete en el login y en la topbar, no tiene footer, y no
tiene favicon. Mientras tanto, `panel-basico` ya incorporó el mascot oficial
("fueguito") tomado directamente del sitio público `melray.vercel.app`
(mismo SVG que usa como favicon y como logo del header de esa web): una
silueta de llama sin cara, en degradado naranja `#fb7b15` → rojo `#df3314`,
`viewBox 0 0 32 32`.

Por separado, `panel-intermedio` tiene un bug de contraste en modo oscuro:
en la pestaña "Proveedores", el nombre de cada proveedor se muestra casi
negro sobre el fondo oscuro de la tarjeta, ilegible. La causa: el nombre
vive dentro de un `<button>` (`.supplier-header`) que no define `color`
en ningún sitio, así que el navegador aplica su color de botón por
defecto en lugar de heredar `var(--text)` (que sí está correctamente
definido para ambos temas). Los demás textos de la app funcionan bien
porque no están dentro de un `<button>` sin color propio.

Este documento cubre ambos cambios porque son pequeños, mecánicos y no
comparten código con el import real de Excel (que es un proyecto propio,
más grande, cubierto en un spec separado).

## Alcance

**Incluido:**
1. Sustituir el icono de caja por el mascot oficial (llama) en login y
   topbar.
2. Añadir un favicon con el mismo SVG oficial.
3. Añadir un footer ("Panel creado por Melray" + mascot pequeño) al final
   del panel, igual que en básico.
4. Arreglar el contraste del nombre de proveedor en modo oscuro.

**Fuera de alcance:**
- El botón "Importar desde Excel" y su funcionalidad (spec aparte).
- Auditoría de otros elementos de la interfaz en busca de problemas de
  contraste similares — este spec solo cubre el bug reportado y confirmado
  en Proveedores.
- Cualquier cambio a la paleta de colores o a las variables de tema.

## Diseño

### 1. Mascota — login y topbar

Reemplaza el `<svg>` dentro de `.brand-mark` (login, `index.html:40-42`) y
dentro de `.brand-icon` (topbar, `index.html:67-69`) por el mismo mascot
usado en `panel-basico`, verbatim:

**Login (`.brand-mark`)** — versión blanca sólida, sin degradado:
```html
<div class="brand-mark">
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#fff" d="M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z"/>
  </svg>
</div>
```
`.brand-mark` ya trae su propio fondo/círculo en el CSS existente de
intermedio (mismo patrón que básico) — no se toca esa regla, solo el
contenido del `<svg>` interno.

**Topbar (`.brand-icon`)** — versión en degradado:
```html
<span class="brand-icon">
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fueguitoGradTopbar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fb7b15"/>
        <stop offset="1" stop-color="#df3314"/>
      </linearGradient>
    </defs>
    <path fill="url(#fueguitoGradTopbar)" d="M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z"/>
  </svg>
</span>
```
El `id` del gradiente (`fueguitoGradTopbar`) es único en la página, igual
que en básico — no colisiona con el que se añade en el footer (paso 3).

### 2. Favicon

Añade en el `<head>` (`index.html`, justo después del `<title>`, antes del
script inline de tema — mismo punto donde se añadió en básico):

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='favGrad' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23fb7b15'/%3E%3Cstop offset='1' stop-color='%23df3314'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23favGrad)' d='M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z'/%3E%3C/svg%3E">
```

Idéntico byte a byte al de básico — mismo mascot, así que da igual qué
panel tenga la pestaña abierta en el navegador, el icono es coherente con
la marca.

### 3. Footer

Añade justo antes del cierre de `.app` (después de `</section>` de
`view-proveedores`, línea 184, y antes de `</div>` en la línea 186 actual):

```html
<footer class="app-footer">
  <svg class="footer-mascot" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fueguitoGradFooter" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fb7b15"/>
        <stop offset="1" stop-color="#df3314"/>
      </linearGradient>
    </defs>
    <path fill="url(#fueguitoGradFooter)" d="M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z"/>
  </svg>
  <span>Panel creado por Melray</span>
</footer>
```

El footer queda dentro de la pestaña activa visualmente (no está anidado
en ninguna `<section class="view">`, así que se ve en las tres pestañas:
Dashboard, Productos y Proveedores — igual que en básico, donde el footer
también está fuera de cualquier contenedor condicional).

CSS a añadir en `css/styles.css` (mismas reglas que básico, ya que las
variables `--text-muted` y el keyframe `fadeInUp` ya existen en
intermedio con los mismos nombres — confirmado, no hace falta adaptarlas):

```css
.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
  padding-top: 20px;
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 600;
  opacity: 0;
  animation: fadeInUp 0.5s ease 0.4s both;
}

.footer-mascot { width: 20px; height: 20px; flex-shrink: 0; }
```

Se añade al final de `css/styles.css`, después de la última regla
existente.

### 4. Fix de modo oscuro — nombre de proveedor

En `css/styles.css`, dentro de la regla `.supplier-header` (línea 738),
añade `color: inherit;`:

```css
.supplier-header {
  /* reglas existentes sin cambios */
  color: inherit;
}
```

Esto hace que `.supplier-name` (que no tiene `color` propio) herede
`var(--text)` desde el `<button>` en lugar del color de botón por defecto
del navegador — mismo mecanismo por el que `.product-name` (un `<div>`,
sin este problema) ya funciona correctamente en ambos temas. No se toca
ninguna otra regla ni se audita el resto de botones de la app (decisión
explícita: arreglo mínimo dirigido al bug reportado).

## Testing

No hay suite de tests en este proyecto (confirmado, igual que en básico).
Verificación manual en navegador:
- Login: mascot en blanco sólido, visible sobre el fondo del
  `.brand-mark`.
- Topbar: mascot en degradado naranja→rojo, visible en las tres pestañas.
- Pestaña del navegador: favicon con la llama.
- Footer: visible al final de cada una de las tres pestañas (Dashboard,
  Productos, Proveedores), con el mascot pequeño y el texto.
- Modo oscuro, pestaña Proveedores: el nombre de cada proveedor se lee
  con buen contraste (texto claro sobre tarjeta oscura), igual que ya
  ocurre con `.supplier-meta` y `.product-name`.
- Modo claro, pestaña Proveedores: el nombre de cada proveedor se sigue
  viendo correctamente (no debe romperse por el `color: inherit`, ya que
  `var(--text)` en modo claro es un tono oscuro apropiado sobre fondo
  claro).

## Riesgos y consideraciones

- Cambio puramente visual/CSS, sin tocar `js/*.js` ni el esquema de
  Supabase — riesgo muy bajo.
- El `id` de gradiente debe mantenerse único por documento
  (`fueguitoGradTopbar` / `fueguitoGradFooter`), igual que en básico, para
  evitar colisión de IDs SVG si ambos SVGs conviven en el DOM a la vez.
