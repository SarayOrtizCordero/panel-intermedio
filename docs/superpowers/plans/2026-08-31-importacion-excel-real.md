# Importación real de Excel — panel-intermedio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el import de Excel simulado de `panel-intermedio` (que generaba 50 productos aleatorios) por uno real: lee el archivo, mapea columnas (con autodetección), valida y previsualiza cada fila, y escribe de verdad en Supabase por upsert de SKU — respetando el proveedor de cada producto y sin tocar nunca el stock de un producto que ya tenga variantes.

**Architecture:** Cambios en tres capas independientes: acceso a datos (`js/data.js`), estructura del modal (`index.html` + `css/styles.css`), y la lógica de import en sí (`js/import.js`, reescrito por completo). Se reutiliza el motor de parseo/autodetección/lotes ya validado en `panel-basico`, extendido con dos piezas nuevas específicas de este proyecto: resolución de proveedor por nombre, y una guardia que excluye del import cualquier producto que ya tenga variantes.

**Tech Stack:** HTML/CSS/JS vanilla, sin build step. SheetJS (`xlsx`) vía CDN para parsear el archivo en el navegador. Supabase JS SDK para el upsert. No hay suite de tests en el proyecto — verificación manual en navegador.

## Global Constraints

- Los cinco campos mapeables (Nombre, SKU, Stock, Stock mínimo, Proveedor) son **todos obligatorios** — no existe una opción de "no se usa este dato" en el selector de mapeo.
- El proveedor se resuelve por **coincidencia exacta de nombre** (normalizado: minúsculas, sin acentos, recortado) contra `PROVEEDORES` ya cargado — nunca se crean proveedores nuevos. Sin coincidencia → fila inválida con el motivo `` Proveedor «${valorOriginal}» no encontrado `` (mostrando el texto tal cual venía en el Excel). Vacío → `"Proveedor vacío"`. Coincidencias múltiples → gana el de menor `id` (ya es el orden natural de `PROVEEDORES`, cargado con `order("id", {ascending: true})`).
- Un producto existente cuyo campo `variantes` sea un array no vacío (`Array.isArray(p.variantes) && p.variantes.length > 0`) se **omite por completo** del import — no se toca su `stock`, `nombre`, `stock_minimo` ni `proveedor_id`. Se muestra en la vista previa con estado "omitida", no como error.
- `ventas_mes` nunca se mapea ni se toca desde el import — los productos nuevos entran con el valor por defecto de la columna (`0`), los existentes conservan el suyo.
- Antes de construir la vista previa hay que refrescar `PRODUCTS` y `PROVEEDORES` con `await Promise.all([fetchProducts(), fetchProveedores()])` — sin esto, la guardia de variantes y la resolución de proveedor pueden operar con datos obsoletos.
- La vista previa es **una sola tabla unificada** (Nombre, SKU, Stock, Stock mínimo, Proveedor, Estado) que muestra las tres categorías de fila (válida / omitida / inválida) con estilos visuales distintos — no una tabla de válidas más una lista de errores aparte.
- El resumen bajo la tabla reporta los tres conteos por separado: `` `${validCount} filas válidas, ${skippedCount} omitidas por tener variantes, ${invalidCount} con errores` ``.
- El botón "Confirmar importación" solo se habilita si hay al menos una fila válida.
- Escritura por lotes de 50 (`IMPORT_BATCH_SIZE`), con `window.confirm(...)` antes de escribir, token de ejecución (`importRun`) para descartar trabajo huérfano si el modal se cierra y reabre a mitad de la escritura, y un conjunto de SKUs ya comprometidos (`importCommittedSkus`) para no duplicar la suma de stock en un reintento parcial.

---

### Task 1: Capa de datos — `upsertProductsChunk`

**Files:**
- Modify: `js/data.js` (añadir función nueva después de `insertProductsBatch`, líneas 85-102 actuales — no se toca ni se borra `insertProductsBatch` todavía, la usa el import falso hasta la Task 3)

**Interfaces:**
- Consumes: nada de tareas anteriores (primera tarea del plan).
- Produces: `async function upsertProductsChunk(rows)` — recibe un array de objetos `{ nombre, sku, stock, stockMinimo, proveedorId }` (mismos nombres de campo que ya usa `insertProduct`/`mapProductRow` en este archivo) y devuelve una Promise que resuelve a un array de productos ya mapeados vía `mapProductRow` (con `id`, `nombre`, `sku`, `stock`, `stockMinimo`, `proveedorId`, `ventasMes`, `variantes`). Lanza si Supabase devuelve error. La Task 3 la usa como reemplazo de `insertProductsBatch`.

- [ ] **Step 1: Añadir `upsertProductsChunk` en `js/data.js`**

Después de la función `insertProductsBatch` (que termina en la línea 102 actual, justo antes del final del archivo), añade:

```js

async function upsertProductsChunk(rows) {
  const payload = rows.map(({ nombre, sku, stock, stockMinimo, proveedorId }) => ({
    nombre,
    sku,
    stock,
    stock_minimo: stockMinimo,
    proveedor_id: proveedorId,
  }));

  const { data, error } = await db
    .from("products")
    .upsert(payload, { onConflict: "sku" })
    .select("id, nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes, variantes(id, talla, color, stock)");

  if (error) throw error;
  return data.map(mapProductRow);
}
```

Nota: a diferencia de `insertProductsBatch`, el payload no incluye `ventas_mes` — al no aparecer en un `upsert` con `onConflict`, Postgres no lo toca en las filas que ya existían, y las filas nuevas usan el valor por defecto de la columna (`0`). El `.select()` pide `variantes(...)` igual que `fetchProducts()`, para que `mapProductRow` devuelva la misma forma de objeto en ambos sitios.

- [ ] **Step 2: Verificar sintaxis**

No hay test runner en este proyecto. Verifica que el archivo es JS válido:

```bash
node --check js/data.js
```

Expected: sin salida (significa que no hay errores de sintaxis).

- [ ] **Step 3: Commit**

```bash
git add js/data.js
git commit -m "feat: añade upsertProductsChunk para el import real de Excel"
```

---

### Task 2: Modal de importación — HTML y CSS

**Files:**
- Modify: `index.html:332-333` (añadir el script de SheetJS junto al resto de `<script>` del final del `<body>`), `index.html:233-268` (reemplazar el modal de importación completo, que hoy solo tiene 3 estados con nombre de archivo estático)
- Modify: `css/styles.css` (añadir reglas nuevas al final del archivo, y una regla dentro del bloque `@media (max-width: 720px)` ya existente)

**Interfaces:**
- Consumes: nada de Task 1 (HTML/CSS no dependen de `data.js`).
- Produces: los IDs de elemento que la Task 3 va a consultar por `document.getElementById`: `importModal`, `importFileInput`, `importFileName`, `importFileError`, `importIdleState`, `importMappingState`, `importPreviewState`, `importProgressState`, `importResultState`, `mappingList`, `mappingContinueBtn`, `previewSummary`, `previewBody`, `previewBackBtn`, `previewConfirmBtn`, `importProgressBar`, `importProgressText`, `importProgressLabel`, `importResultSummary`, `resultErrors`, `importResultCloseBtn`, `importCloseBtn`, `importOpenBtn` (ya existe, sin cambios), y el `name="mergeMode"` de los dos radios. También las clases CSS que la Task 3 usará al construir HTML dinámico: `.import-status-valid`, `.import-status-skipped`, `.import-error`.

**Nota:** el archivo `js/import.js` actual sigue referenciando IDs que este paso elimina (`importStartBtn`, `importSuccessState`, `importSuccessCount`) — el botón "Importar desde Excel" quedará roto entre esta tarea y la Task 3. Es intencional: las tres tareas de este plan se ejecutan de forma continua en la misma sesión, y la revisión final de rama cubre el conjunto completo antes de fusionar.

- [ ] **Step 1: Añadir el script de SheetJS**

En `index.html`, la lista de `<script>` al final del `<body>` es hoy:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/config.js"></script>
```

Cámbiala por:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
<script src="js/config.js"></script>
```

- [ ] **Step 2: Reemplazar el modal de importación**

Sustituye el bloque completo que empieza en `<!-- Modal: Importación Excel -->` (línea 233) y termina en el segundo `</div>` seguido, que cierra primero `.modal` y después `#importModal` (líneas 233-268 del archivo actual) por:

```html
<!-- Modal: Importación Excel -->
<div class="modal-overlay" id="importModal">
  <div class="modal modal--wide">
    <div class="modal-header">
      <div>
        <h3>Importar desde Excel</h3>
        <p class="modal-sub">Sube un archivo para actualizar tu inventario</p>
      </div>
      <button class="modal-close" id="importCloseBtn" aria-label="Cerrar">&times;</button>
    </div>

    <div class="import-state" id="importIdleState">
      <label class="file-card" for="importFileInput">
        <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <div class="file-info">
          <span class="file-name" id="importFileName">Ningún archivo seleccionado</span>
          <span class="file-meta">.xlsx, .xls o .csv</span>
        </div>
      </label>
      <input type="file" id="importFileInput" accept=".xlsx,.xls,.csv" class="visually-hidden">
      <p class="import-error" id="importFileError" hidden></p>
    </div>

    <div class="import-state" id="importMappingState" hidden>
      <p class="progress-label">Hemos intentado adivinar qué columna es cada dato — revisa que esté bien y cambia lo que haga falta. Las cinco son obligatorias: Nombre, SKU, Stock, Stock mínimo y Proveedor.</p>
      <div class="mapping-list" id="mappingList"></div>
      <div class="field">
        <span class="field-label">Al actualizar productos que ya existen</span>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" name="mergeMode" value="replace" checked>
            Sustituir su stock
          </label>
          <label class="radio-option">
            <input type="radio" name="mergeMode" value="sum">
            Sumar al stock actual
          </label>
        </div>
      </div>
      <button class="btn-primary" id="mappingContinueBtn" disabled>Continuar</button>
    </div>

    <div class="import-state" id="importPreviewState" hidden>
      <p class="preview-summary" id="previewSummary"></p>
      <div class="table-wrap preview-table-wrap">
        <table class="products-table">
          <thead>
            <tr><th>Nombre</th><th>SKU</th><th>Stock</th><th>Stock mínimo</th><th>Proveedor</th><th>Estado</th></tr>
          </thead>
          <tbody id="previewBody"></tbody>
        </table>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="previewBackBtn">Volver</button>
        <button class="btn-primary" id="previewConfirmBtn">Confirmar importación</button>
      </div>
    </div>

    <div class="import-state" id="importProgressState" hidden>
      <p class="progress-label" id="importProgressLabel">Importando…</p>
      <div class="progress-track">
        <div class="progress-fill" id="importProgressBar"></div>
      </div>
      <span class="progress-pct" id="importProgressText">0%</span>
    </div>

    <div class="import-state import-success" id="importResultState" hidden>
      <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <p id="importResultSummary"></p>
      <div class="preview-errors" id="resultErrors" hidden></div>
      <button class="btn-primary" id="importResultCloseBtn">Cerrar</button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Añadir la regla responsive de `.mapping-row`**

En `css/styles.css`, localiza el bloque `@media (max-width: 720px)` ya existente al final del archivo:

```css
@media (max-width: 720px) {
  .stat-grid { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 84px 1fr 26px; }
}
```

Añade una línea dentro de ese mismo bloque:

```css
@media (max-width: 720px) {
  .stat-grid { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 84px 1fr 26px; }
  .mapping-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: Añadir las reglas nuevas al final de `css/styles.css`**

Al final del archivo (después del bloque `@media` modificado en el Step 3), añade:

```css

.modal--wide { max-width: 560px; }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.file-card:hover, .file-card:has(+ #importFileInput:focus) { border-color: var(--primary); }

.import-error {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--danger);
  background: var(--danger-soft);
  padding: 8px 12px;
  border-radius: var(--radius-md);
}

.import-status-valid {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ok);
}

.import-status-skipped {
  font-size: 12.5px;
  font-style: italic;
  color: var(--text-muted);
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
}

.mapping-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 160px);
  align-items: center;
  gap: 12px;
}

.mapping-column-name {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mapping-select { padding: 8px 10px; font-size: 13px; }

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 18px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
.btn-secondary:active { transform: scale(0.98); }

.preview-summary {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted);
}

.preview-table-wrap { max-height: 260px; overflow-y: auto; }

.preview-errors {
  background: var(--danger-soft);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--danger);
}

.preview-errors ul { margin: 6px 0 0; padding-left: 18px; }
.preview-errors li { margin-bottom: 2px; }
```

Nota sobre `.file-card:has(+ #importFileInput:focus)`: el `<input type="file">` es hermano del `<label class="file-card">` (el label va primero, el input después, ambos hijos directos de `#importIdleState`), no un descendiente — por eso no sirve `:focus-within` aquí (no encontraría el input dentro del label). El selector `:has(+ ...)` sí funciona porque apunta explícitamente al hermano siguiente.

- [ ] **Step 5: Verificar en navegador**

No hay test runner. Levanta un servidor estático desde `panel-intermedio/` (por ejemplo `python -m http.server 8000`) y abre la página. Sin necesidad de iniciar sesión real, comprueba en la consola del navegador que no hay errores de sintaxis HTML/CSS evidentes (el modal no se puede abrir todavía de forma útil — `importOpenBtn` sigue enlazado al `import.js` viejo, que fallará al intentar usar IDs que ya no existen; eso se corrige en la Task 3). Verifica con las herramientas de desarrollador que `#importFileInput`, `#mappingList`, `#previewBody`, etc. existen en el DOM con los IDs correctos.

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: rediseña el modal de importación a 5 estados con input de archivo real"
```

---

### Task 3: Lógica de importación real

**Files:**
- Create/Replace: `js/import.js` (se sustituye el contenido completo — el archivo actual es la simulación)
- Modify: `js/data.js:85-102` (eliminar `insertProductsBatch`, que se queda sin ningún llamador tras este cambio)
- Modify: `README.md:27-29`, `README.md:76`, `README.md:85-90`, `README.md:95-97`

**Interfaces:**
- Consumes: `upsertProductsChunk(rows)` de Task 1 (`js/data.js`); todos los IDs de elemento y clases CSS de Task 2 (`index.html` / `css/styles.css`); `fetchProducts()`, `fetchProveedores()`, `PRODUCTS`, `PROVEEDORES`, `mapProductRow`, `escapeHtml` (ya existen en `js/data.js`, sin cambios); `renderProductsTable()`, `updateDashboardStats()` (`js/products.js`); `renderCharts()` (`js/charts.js`); `renderSuppliers()` (`js/suppliers.js`).
- Produces: nada que otra tarea de este plan consuma — última tarea del plan.

- [ ] **Step 1: Reemplazar `js/import.js` por completo**

Sustituye todo el contenido del archivo por:

```js
const importModal = document.getElementById("importModal");
const importFileInput = document.getElementById("importFileInput");
const importFileName = document.getElementById("importFileName");
const importFileError = document.getElementById("importFileError");
const importIdleState = document.getElementById("importIdleState");
const importMappingState = document.getElementById("importMappingState");
const importPreviewState = document.getElementById("importPreviewState");
const importProgressState = document.getElementById("importProgressState");
const importResultState = document.getElementById("importResultState");
const mappingList = document.getElementById("mappingList");
const mappingContinueBtn = document.getElementById("mappingContinueBtn");
const previewSummary = document.getElementById("previewSummary");
const previewBody = document.getElementById("previewBody");
const previewBackBtn = document.getElementById("previewBackBtn");
const previewConfirmBtn = document.getElementById("previewConfirmBtn");
const importProgressBar = document.getElementById("importProgressBar");
const importProgressText = document.getElementById("importProgressText");
const importProgressLabel = document.getElementById("importProgressLabel");
const importResultSummary = document.getElementById("importResultSummary");
const resultErrors = document.getElementById("resultErrors");
const importResultCloseBtn = document.getElementById("importResultCloseBtn");
const toast = document.getElementById("toast");

const IMPORT_MAPPING_STORAGE_KEY = "panelintermedio-import-mapping";
const IMPORT_FIELDS = [
  { key: "nombre", label: "Nombre" },
  { key: "sku", label: "SKU" },
  { key: "stock", label: "Stock" },
  { key: "stockMinimo", label: "Stock mínimo" },
  { key: "proveedor", label: "Proveedor" },
];
const IMPORT_BATCH_SIZE = 50;

let importHeaders = [];
let importDataRows = [];
let importValidRows = [];
let importPreviewRows = [];
let importRun = 0;
let importHeaderRowIndex = 0;
let importCommittedSkus = new Set();

function openImportModal() {
  importRun++;
  importCommittedSkus = new Set();
  importFileInput.value = "";
  importFileName.textContent = "Ningún archivo seleccionado";
  importFileError.hidden = true;
  showImportState("idle");
  importModal.classList.add("open");
}

function closeImportModal() {
  importRun++;
  importModal.classList.remove("open");
}

function showImportState(state) {
  importIdleState.hidden = state !== "idle";
  importMappingState.hidden = state !== "mapping";
  importPreviewState.hidden = state !== "preview";
  importProgressState.hidden = state !== "progress";
  importResultState.hidden = state !== "result";
}

// --- Paso 1: seleccionar y parsear el archivo ---

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];
  if (!file) return;

  importFileName.textContent = file.name;
  importFileError.hidden = true;

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell).trim() !== ""));
    const dataRows = headerIndex === -1 ? [] : rows.slice(headerIndex + 1);
    const hasData = dataRows.some((row) => row.some((cell) => String(cell).trim() !== ""));

    if (headerIndex === -1 || !hasData) {
      throw new Error("El archivo no tiene filas de datos, solo la cabecera (o está vacío).");
    }

    importHeaders = rows[headerIndex].map((h) => String(h).trim());
    importDataRows = dataRows;
    importHeaderRowIndex = headerIndex;
    renderMappingStep();
    showImportState("mapping");
  } catch (error) {
    console.error(error);
    importFileError.textContent = "No se pudo leer el archivo. Comprueba que es un .xlsx, .xls o .csv válido.";
    importFileError.hidden = false;
  }
});

// --- Paso 2: mapeo de columnas ---

function loadSavedMapping() {
  try {
    const raw = localStorage.getItem(IMPORT_MAPPING_STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[importHeaders.join("|")] || null;
  } catch (error) {
    return null;
  }
}

function saveMapping(headerToField) {
  try {
    const raw = localStorage.getItem(IMPORT_MAPPING_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[importHeaders.join("|")] = headerToField;
    localStorage.setItem(IMPORT_MAPPING_STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    // localStorage puede fallar (modo privado, cuota) — no es crítico, se ignora.
  }
}

const AUTO_MAPPING_RULES = [
  { field: "stockMinimo", keywords: ["minim"], wholeWords: ["min"] },
  { field: "sku", keywords: ["sku", "referencia"] },
  { field: "stock", keywords: ["stock", "cantidad", "existencias", "unidades"] },
  { field: "proveedor", keywords: ["proveedor", "supplier", "prov"] },
  { field: "nombre", keywords: ["nombre", "producto", "articulo", "item"] },
];

function normalizeForMatching(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function ruleMatches(rule, normalized) {
  if (rule.keywords.some((keyword) => normalized.includes(keyword))) return true;
  if (rule.wholeWords) {
    return rule.wholeWords.some((word) => new RegExp(`\\b${word}\\b`).test(normalized));
  }
  return false;
}

function guessColumnMapping(headers) {
  const guess = {};
  const claimedFields = new Set();

  headers.forEach((header) => {
    const normalized = normalizeForMatching(header);
    const rule = AUTO_MAPPING_RULES.find((r) => !claimedFields.has(r.field) && ruleMatches(r, normalized));
    if (rule) {
      guess[header] = rule.field;
      claimedFields.add(rule.field);
    } else {
      guess[header] = "";
    }
  });

  return guess;
}

function renderMappingStep() {
  const saved = loadSavedMapping();
  const guessed = saved ? null : guessColumnMapping(importHeaders);
  mappingList.innerHTML = "";

  const options = [`<option value="">Seleccionar…</option>`]
    .concat(IMPORT_FIELDS.map((f) => `<option value="${f.key}">${f.label}</option>`))
    .join("");

  importHeaders.forEach((header, index) => {
    const row = document.createElement("div");
    row.className = "mapping-row";
    row.innerHTML = `
      <span class="mapping-column-name">${escapeHtml(header)}</span>
      <select class="field-input mapping-select" data-column-index="${index}">${options}</select>
    `;
    mappingList.appendChild(row);
    row.querySelector("select").value = saved ? saved[header] || "" : guessed[header] || "";
  });

  mappingList.querySelectorAll(".mapping-select").forEach((select) => {
    select.addEventListener("change", updateMappingContinueState);
  });
  updateMappingContinueState();
}

function getCurrentMapping() {
  const mapping = {};
  mappingList.querySelectorAll(".mapping-select").forEach((select) => {
    const field = select.value;
    if (field) mapping[field] = Number(select.dataset.columnIndex);
  });
  return mapping;
}

function updateMappingContinueState() {
  const mapping = getCurrentMapping();
  mappingContinueBtn.disabled = IMPORT_FIELDS.some((f) => mapping[f.key] === undefined);
}

mappingContinueBtn.addEventListener("click", async () => {
  const mapping = getCurrentMapping();
  const mergeMode = document.querySelector('input[name="mergeMode"]:checked').value;

  const headerToField = {};
  importHeaders.forEach((header, index) => {
    const found = Object.entries(mapping).find(([, colIndex]) => colIndex === index);
    headerToField[header] = found ? found[0] : "";
  });
  saveMapping(headerToField);

  mappingContinueBtn.disabled = true;
  try {
    await Promise.all([fetchProducts(), fetchProveedores()]);
  } catch (error) {
    console.error(error);
    mappingContinueBtn.disabled = false;
    showToast("No se pudo comprobar el inventario actual. Inténtalo de nuevo.");
    return;
  }
  mappingContinueBtn.disabled = false;

  buildPreview(mapping, mergeMode);
  showImportState("preview");
});

// --- Paso 3: validar filas y construir la vista previa ---

function parseNonNegativeInt(value) {
  if (value === undefined || value === null) return null;
  const trimmed = typeof value === "string" ? value.trim() : value;
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n) || n > 2147483647) return NaN;
  return n;
}

function findProveedorByNombre(rawNombre) {
  const target = normalizeForMatching(rawNombre);
  return PROVEEDORES.find((p) => normalizeForMatching(p.nombre) === target) || null;
}

function buildPreview(mapping, mergeMode) {
  importValidRows = [];
  importPreviewRows = [];

  const validIndexBySku = new Map();

  importDataRows.forEach((row, i) => {
    const rowNumber = importHeaderRowIndex + i + 2; // fila real del archivo (la cabecera ocupa la fila importHeaderRowIndex + 1)
    if (row.every((cell) => String(cell).trim() === "")) return;

    const rawNombre = String(row[mapping.nombre] ?? "").trim();
    const rawSku = String(row[mapping.sku] ?? "").trim();
    const rawProveedor = String(row[mapping.proveedor] ?? "").trim();
    const stockParsed = parseNonNegativeInt(row[mapping.stock]);
    const stockMinimoParsed = parseNonNegativeInt(row[mapping.stockMinimo]);
    const display = {
      rowNumber,
      nombre: rawNombre,
      sku: rawSku,
      stock: row[mapping.stock],
      stockMinimo: row[mapping.stockMinimo],
      proveedorNombre: rawProveedor,
    };

    if (!rawNombre) { importPreviewRows.push({ ...display, status: "invalid", reason: "Nombre vacío" }); return; }
    if (!rawSku) { importPreviewRows.push({ ...display, status: "invalid", reason: "SKU vacío" }); return; }
    if (stockParsed === null || Number.isNaN(stockParsed)) { importPreviewRows.push({ ...display, status: "invalid", reason: "Stock no es un número válido" }); return; }
    if (stockMinimoParsed === null || Number.isNaN(stockMinimoParsed)) { importPreviewRows.push({ ...display, status: "invalid", reason: "Stock mínimo no es un número válido" }); return; }
    if (!rawProveedor) { importPreviewRows.push({ ...display, status: "invalid", reason: "Proveedor vacío" }); return; }

    const proveedor = findProveedorByNombre(rawProveedor);
    if (!proveedor) { importPreviewRows.push({ ...display, status: "invalid", reason: `Proveedor «${rawProveedor}» no encontrado` }); return; }

    if (importCommittedSkus.has(rawSku)) return; // ya se importó correctamente en un intento anterior de esta sesión

    const existing = PRODUCTS.find((p) => p.sku === rawSku);
    const hasVariantes = Boolean(existing && Array.isArray(existing.variantes) && existing.variantes.length > 0);
    if (hasVariantes) {
      importPreviewRows.push({
        ...display,
        stock: existing.stock,
        stockMinimo: existing.stockMinimo,
        status: "skipped",
        reason: "Ya tiene variantes — gestiónalo desde su ficha de producto.",
      });
      return;
    }

    const priorIndex = validIndexBySku.get(rawSku);
    const priorEntry = priorIndex !== undefined ? importValidRows[priorIndex] : null;
    const isUpdate = Boolean(priorEntry) || Boolean(existing);

    const baseStock = priorEntry ? priorEntry.stock : (existing ? existing.stock : 0);
    const finalStock = isUpdate && mergeMode === "sum" ? baseStock + stockParsed : stockParsed;

    const entry = {
      rowNumber,
      nombre: rawNombre,
      sku: rawSku,
      stock: finalStock,
      stockMinimo: stockMinimoParsed,
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      isUpdate,
      status: "valid",
    };

    if (priorIndex !== undefined) {
      importValidRows[priorIndex] = entry;
      const previewIndex = importPreviewRows.findIndex((r) => r.status === "valid" && r.sku === rawSku);
      importPreviewRows[previewIndex] = entry;
    } else {
      validIndexBySku.set(rawSku, importValidRows.length);
      importValidRows.push(entry);
      importPreviewRows.push(entry);
    }
  });

  renderPreview();
}

function renderPreview() {
  const validCount = importValidRows.length;
  const skippedCount = importPreviewRows.filter((r) => r.status === "skipped").length;
  const invalidCount = importPreviewRows.filter((r) => r.status === "invalid").length;
  previewSummary.textContent = `${validCount} filas válidas, ${skippedCount} omitidas por tener variantes, ${invalidCount} con errores`;

  const sorted = [...importPreviewRows].sort((a, b) => a.rowNumber - b.rowNumber);
  previewBody.innerHTML = "";
  sorted.forEach((row) => {
    let estadoHtml;
    if (row.status === "valid") {
      estadoHtml = `<span class="import-status-valid">${row.isUpdate ? "Actualización" : "Nuevo"}</span>`;
    } else if (row.status === "skipped") {
      estadoHtml = `<span class="import-status-skipped">${escapeHtml(row.reason)}</span>`;
    } else {
      estadoHtml = `<span class="import-error">${escapeHtml(row.reason)}</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.nombre)}</td>
      <td class="sku">${escapeHtml(row.sku)}</td>
      <td>${escapeHtml(String(row.stock))}</td>
      <td>${escapeHtml(String(row.stockMinimo))}</td>
      <td>${escapeHtml(row.proveedorNombre)}</td>
      <td>${estadoHtml}</td>
    `;
    previewBody.appendChild(tr);
  });

  if (sorted.length === 0) {
    previewBody.innerHTML = `<tr><td colspan="6" class="table-loading">No hay filas en el archivo.</td></tr>`;
  }

  previewConfirmBtn.disabled = validCount === 0;
}

previewBackBtn.addEventListener("click", () => {
  showImportState("mapping");
});

// --- Paso 4: confirmar e importar por lotes ---

previewConfirmBtn.addEventListener("click", () => {
  const confirmed = window.confirm(`¿Importar? Esto añadirá o actualizará ${importValidRows.length} productos de verdad en el inventario.`);
  if (!confirmed) return;
  runImport();
});

async function runImport() {
  const run = ++importRun;
  showImportState("progress");
  importProgressBar.style.width = "0%";
  importProgressText.textContent = "0%";

  const chunks = [];
  for (let i = 0; i < importValidRows.length; i += IMPORT_BATCH_SIZE) {
    chunks.push(importValidRows.slice(i, i + IMPORT_BATCH_SIZE));
  }

  let processed = 0;

  for (let i = 0; i < chunks.length; i++) {
    if (run !== importRun) return;
    importProgressLabel.textContent = `Lote ${i + 1} de ${chunks.length}…`;

    try {
      const chunk = chunks[i];
      const result = await upsertProductsChunk(chunk);
      if (run !== importRun) return;

      result.forEach((product) => {
        const existingIndex = PRODUCTS.findIndex((p) => p.sku === product.sku);
        if (existingIndex >= 0) PRODUCTS[existingIndex] = product;
        else PRODUCTS.push(product);
      });
      chunk.forEach((row) => importCommittedSkus.add(row.sku));

      processed += chunk.length;
      const pct = Math.round((processed / importValidRows.length) * 100);
      importProgressBar.style.width = `${pct}%`;
      importProgressText.textContent = `${pct}%`;
    } catch (error) {
      console.error(error);
      if (run !== importRun) return;
      renderProductsTable();
      updateDashboardStats();
      renderCharts();
      renderSuppliers();
      importValidRows = importValidRows.slice(processed);
      importPreviewRows = importPreviewRows.filter((r) => r.status !== "valid" || !importCommittedSkus.has(r.sku));
      renderPreview();
      showImportState("preview");
      const message = error.code === "23505" ? "Conflicto de SKU en un lote." : "No se pudo completar la importación.";
      showToast(`${message} Se procesaron ${processed} filas antes del fallo; quedan ${importValidRows.length} por reintentar.`);
      return;
    }
  }

  const added = importValidRows.filter((r) => !r.isUpdate).length;
  const updated = importValidRows.filter((r) => r.isUpdate).length;

  renderProductsTable();
  updateDashboardStats();
  renderCharts();
  renderSuppliers();
  showResult(added, updated);
}

function showResult(added, updated) {
  const skippedCount = importPreviewRows.filter((r) => r.status === "skipped").length;
  importResultSummary.innerHTML = `<strong>${added}</strong> productos añadidos, <strong>${updated}</strong> actualizados${skippedCount > 0 ? `, <strong>${skippedCount}</strong> omitidos por tener variantes` : ""}`;

  const invalidRows = importPreviewRows.filter((r) => r.status === "invalid");
  if (invalidRows.length > 0) {
    resultErrors.hidden = false;
    resultErrors.innerHTML = `<p class="progress-label">${invalidRows.length} filas con error, no importadas:</p><ul>${invalidRows
      .map((r) => `<li>fila ${r.rowNumber}: ${escapeHtml(r.reason)}</li>`)
      .join("")}</ul>`;
  } else {
    resultErrors.hidden = true;
    resultErrors.innerHTML = "";
  }

  showImportState("result");
}

importResultCloseBtn.addEventListener("click", closeImportModal);

// --- Toasts ---

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// --- Apertura / cierre del modal ---

document.getElementById("importOpenBtn").addEventListener("click", openImportModal);
document.getElementById("importCloseBtn").addEventListener("click", closeImportModal);
importModal.addEventListener("click", (event) => {
  if (event.target === importModal) closeImportModal();
});
```

- [ ] **Step 2: Eliminar `insertProductsBatch` de `js/data.js`**

Ahora que `js/import.js` usa `upsertProductsChunk` en su lugar, `insertProductsBatch` se queda sin ningún llamador. Elimina por completo esta función de `js/data.js` (líneas 85-102 actuales):

```js
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
```

- [ ] **Step 3: Verificar sintaxis**

```bash
node --check js/import.js
node --check js/data.js
```

Expected: sin salida en ambos casos.

- [ ] **Step 4: Verificar en navegador**

Levanta un servidor estático (o reutiliza el de la Task 2) y, con sesión iniciada contra un proyecto Supabase real que tenga el esquema de `supabase/schema.sql` cargado, prueba con un Excel de prueba que cubra:

- Una fila válida nueva (SKU que no existe).
- Una fila con SKU de un producto existente sin variantes, en modo sustituir y en modo sumar.
- Una fila con SKU de un producto existente que ya tiene variantes → debe aparecer como "omitida", y tras importar su stock no debe haber cambiado.
- Una fila con Proveedor vacío, y otra con un nombre de proveedor inexistente → ambas inválidas con el motivo correcto.
- Una fila con Nombre o SKU vacío, y otra con Stock/Stock mínimo no numérico o negativo → inválidas.
- Cabeceras con variantes de texto ("Prov.", "Proveedor", "Supplier") para comprobar la autodetección de la columna Proveedor.
- Tras importar, comprobar sin recargar que el dashboard, la tabla de Productos y la pestaña de Proveedores reflejan los cambios.

- [ ] **Step 5: Actualizar el README**

En `README.md`, sustituye el bullet de import (líneas 27-29 actuales):

```markdown
- **Importación desde Excel (simulada):** botón destacado que abre un modal,
  simula la subida de un archivo con una barra de progreso de ~2s y **inserta
  de verdad** 50 productos generados en la base de datos.
```

por:

```markdown
- **Importación real desde Excel:** botón que abre un modal con mapeo de
  columnas (con autodetección), vista previa fila a fila con validación —
  incluye resolución de proveedor por nombre y una guardia que nunca toca el
  stock de un producto que ya tenga variantes — y escritura real por lotes en
  la base de datos.
```

En la sección "Estructura", la línea de `import.js` (línea 76 actual):

```
    ├── import.js                      Simulación de importación desde Excel
```

por:

```
    ├── import.js                      Importación real desde Excel (mapeo, vista previa, escritura)
```

En "Notas para extender", sustituye el bullet sobre los tres estados del modal (líneas 85-90 actuales):

```markdown
- **Ojo con `hidden` + `display` propio en la misma regla:** el modal de
  importación tiene tres estados (`idle` / `progress` / `success`) que se
  alternan con el atributo `hidden`. Si `.import-state { display: flex }` no
  llevara también `.import-state[hidden] { display: none; }`, los tres
  estados se verían superpuestos — ya nos pasó una vez, no lo quites. Lo
  mismo aplica a `.login-screen[hidden]` y `.session-loading[hidden]`.
```

por:

```markdown
- **Ojo con `hidden` + `display` propio en la misma regla:** el modal de
  importación tiene cinco estados (`idle` / `mapping` / `preview` /
  `progress` / `result`) que se alternan con el atributo `hidden`. Si
  `.import-state { display: flex }` no llevara también
  `.import-state[hidden] { display: none; }`, los cinco estados se verían
  superpuestos — ya nos pasó una vez, no lo quites. Lo mismo aplica a
  `.login-screen[hidden]` y `.session-loading[hidden]`.
```

Y elimina el bullet sobre los SKU generados por semilla de tiempo (líneas 95-97 actuales, ya no aplica porque el import ya no genera SKUs):

```markdown
- Los SKU generados por la importación simulada usan la hora actual como
  semilla (no un contador fijo), para no chocar con SKU de una importación
  anterior ya guardada en la base de datos.
```

- [ ] **Step 6: Commit**

```bash
git add js/import.js js/data.js README.md
git commit -m "feat: importación real de Excel — mapeo, proveedor, guardia de variantes y escritura por lotes"
```
