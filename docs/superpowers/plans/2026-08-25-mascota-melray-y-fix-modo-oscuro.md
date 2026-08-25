# Mascota Melray, footer, favicon y fix de modo oscuro en Proveedores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el icono genérico de `panel-intermedio` por el mascot oficial de Melray (llama), añadir favicon y footer coherentes con `panel-basico`, y arreglar el contraste ilegible del nombre de proveedor en modo oscuro.

**Architecture:** Cambios puramente de HTML/CSS en `index.html` y `css/styles.css`, sin tocar ningún archivo `.js` ni el esquema de Supabase. Se reutiliza verbatim el SVG del mascot oficial ya validado en `panel-basico` (mismo path, mismo degradado, mismo favicon). El fix de modo oscuro es una única propiedad CSS añadida a una regla existente.

**Tech Stack:** HTML/CSS vanilla, sin build step. No hay suite de tests en el proyecto — la verificación es manual en navegador.

## Global Constraints

- El SVG del mascot debe ser idéntico byte a byte al de `panel-basico`/`melray.vercel.app`: `viewBox 0 0 32 32`, path `M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z`.
- Colores del degradado: `#fb7b15` (offset 0) → `#df3314` (offset 1), dirección vertical (`x1=0 y1=0 x2=0 y2=1`).
- Los IDs de gradiente SVG deben ser únicos por documento: `fueguitoGradTopbar` (topbar) y `fueguitoGradFooter` (footer). No reutilizar el mismo ID en ambos.
- Texto del footer: exactamente "Panel creado por Melray" (igual que en básico).
- No modificar ningún archivo `.js`, `supabase/schema.sql`, ni las variables de tema en `:root`/`:root[data-theme="dark"]`.
- El fix de modo oscuro se limita a `.supplier-header` — no se toca ningún otro botón ni selector.

---

### Task 1: Mascota oficial, favicon y footer

**Files:**
- Modify: `index.html:6` (añadir favicon), `index.html:40-42` (mascot login), `index.html:67-69` (mascot topbar), `index.html:184-186` (añadir footer)
- Modify: `css/styles.css` (añadir reglas `.app-footer` y `.footer-mascot` al final del archivo)

**Interfaces:**
- Consumes: nada de tareas anteriores (primera tarea del plan).
- Produces: nada que otras tareas consuman — Task 2 es independiente y toca una regla CSS distinta (`.supplier-header`).

- [ ] **Step 1: Añadir el favicon en el `<head>`**

En `index.html`, justo después de la línea `<title>Panel de Inventario — Intermedio</title>` (línea 6) y antes del `<script>` inline de tema (línea 7), añade:

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='favGrad' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23fb7b15'/%3E%3Cstop offset='1' stop-color='%23df3314'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23favGrad)' d='M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z'/%3E%3C/svg%3E">
```

- [ ] **Step 2: Reemplazar el mascot del login**

En `index.html`, dentro de `<div class="brand-mark">` (línea 40), reemplaza el `<svg>` existente (líneas 41-42, el icono de caja con `stroke="currentColor"`) por:

```html
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill="#fff" d="M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z"/>
</svg>
```

`.brand-mark` es el mismo `<div>` contenedor existente — no se toca su CSS, solo el `<svg>` interno.

- [ ] **Step 3: Reemplazar el mascot de la topbar**

En `index.html`, dentro de `<span class="brand-icon">` (línea 67), reemplaza el `<svg>` existente (línea 68, el mismo icono de caja) por:

```html
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fueguitoGradTopbar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fb7b15"/>
      <stop offset="1" stop-color="#df3314"/>
    </linearGradient>
  </defs>
  <path fill="url(#fueguitoGradTopbar)" d="M15 2.3C18.3 6.3 22.2 10.8 22.8 16.2C23.7 11.7 22.2 8.3 20.7 6.3C23.7 8.7 25.8 13.2 25.5 18.3C25.5 25.2 20.9 30.3 15 30.3C9.2 30.3 4.5 25.2 4.5 18.3C4.5 13.8 6.9 10.2 10.2 7.5C9 10.2 9.3 13.2 11.1 15C10.5 10.8 12.3 6.3 15 2.3Z"/>
</svg>
```

- [ ] **Step 4: Añadir el footer**

En `index.html`, busca el final de la sección `view-proveedores`:

```html
    <div class="suppliers-grid" id="suppliersGrid"></div>
  </section>

</div>
</div>
```

La primera `</div>` de esas dos cierra `.app`; la segunda cierra `#appScreen`. Inserta el footer **antes** de esa primera `</div>` (es decir, sigue dentro de `.app`, después de `</section>`):

```html
    <div class="suppliers-grid" id="suppliersGrid"></div>
  </section>

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

</div>
</div>
```

- [ ] **Step 5: Añadir el CSS del footer**

Al final de `css/styles.css`, añade:

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

- [ ] **Step 6: Verificar en navegador**

No hay suite de tests en este proyecto. Levanta un servidor estático desde `panel-intermedio/` (por ejemplo `python -m http.server 8935`) y abre la página en el navegador:
- La pestaña del navegador muestra el favicon con la llama (no el icono por defecto).
- Login: la llama en blanco sólido se ve centrada dentro de `.brand-mark`.
- Tras iniciar sesión (o forzando `document.getElementById('loginScreen').hidden = true; document.getElementById('appScreen').hidden = false;` desde la consola si no hay sesión real disponible): la llama en degradado naranja→rojo se ve en la topbar, junto a "Panel de Inventario".
- Cambia entre las pestañas Dashboard / Productos / Proveedores: el footer "Panel creado por Melray" con la llama pequeña es visible al final de las tres.
- Alterna modo claro/oscuro con el botón de tema: el footer se sigue leyendo bien en ambos (usa `var(--text-muted)`, ya theme-aware).

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: usa el mascot oficial de Melray (favicon, login, topbar y footer)"
```

---

### Task 2: Fix de contraste en modo oscuro — nombre de proveedor

**Files:**
- Modify: `css/styles.css:738` (regla `.supplier-header`)

**Interfaces:**
- Consumes: nada de Task 1 — cambio independiente en una regla CSS distinta.
- Produces: nada que otras tareas consuman — última tarea del plan.

- [ ] **Step 1: Añadir `color: inherit` a `.supplier-header`**

En `css/styles.css`, localiza la regla `.supplier-header` (línea 738) y añade `color: inherit;` dentro de sus declaraciones existentes, sin eliminar ninguna de las reglas actuales:

```css
.supplier-header {
  color: inherit;
  /* resto de declaraciones existentes sin cambios */
}
```

- [ ] **Step 2: Verificar en navegador — modo oscuro**

Levanta el servidor estático (o reutiliza el de la Task 1) y abre la pestaña Proveedores con el tema en oscuro (botón de tema en la topbar, o `localStorage.setItem('panelintermedio-theme', 'dark')` + recargar). Confirma que el nombre de cada proveedor (`.supplier-name`) se lee en un tono claro sobre la tarjeta oscura, igual que el texto secundario ("N productos · contacto") que ya funcionaba bien.

- [ ] **Step 3: Verificar en navegador — modo claro**

Cambia a modo claro (`localStorage.setItem('panelintermedio-theme', 'light')` + recargar, o el botón de tema) y confirma que el nombre de proveedor se sigue leyendo correctamente — no debe haberse roto por el cambio (el color heredado en modo claro es `var(--text): #2a1c10`, un tono oscuro apropiado sobre fondo claro).

- [ ] **Step 4: Commit**

```bash
git add css/styles.css
git commit -m "fix: corrige contraste del nombre de proveedor en modo oscuro"
```
