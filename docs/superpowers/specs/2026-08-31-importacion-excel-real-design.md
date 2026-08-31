# Importación real de Excel — panel-intermedio

## Contexto

El botón "Importar desde Excel" de `panel-intermedio` es hoy una simulación:
no lee ningún archivo. `js/import.js` genera 50 productos aleatorios
(`generateFakeProducts`) con nombres de una lista fija, SKUs derivados de un
timestamp, stock/stock mínimo/ventas al azar, y un proveedor asignado por
turno rotatorio entre los proveedores ya cargados — y los inserta de verdad
en Supabase vía `insertProductsBatch`. El README ya no necesitará decir
"simulada" tras este cambio: el archivo que suba el usuario será el que
determine qué se inserta o actualiza.

El sibling `panel-basico` ya tiene un import real y validado (mapeo de
columnas con autodetección, vista previa, sustituir/sumar stock, escritura
por lotes) que este documento reutiliza como base. La diferencia principal
es el modelo de datos de `panel-intermedio`: los productos tienen un
proveedor (FK a `proveedores`, nullable en el esquema pero siempre exigido
hoy por el único punto de creación existente, el formulario manual) y
pueden tener variantes (talla/color con stock propio, sin ninguna vía de
creación o edición en la app aparte de SQL directo). Ambas cosas requieren
decisiones de diseño que no existían en básico.

## Alcance

**Incluido:**
1. Mapeo de columnas con autodetección para cinco campos: Nombre, SKU,
   Stock, Stock mínimo, Proveedor — las cinco obligatorias.
2. Resolución de Proveedor por nombre contra los proveedores existentes
   (sin crear proveedores nuevos).
3. Guardia que excluye del import cualquier producto existente que ya
   tenga variantes (no se toca su stock ni ningún otro campo).
4. Elección global de sustituir vs sumar el stock de productos existentes
   (sin variantes).
5. Vista previa con tres categorías de fila: válida, omitida (por
   variantes), inválida (con motivo).
6. Escritura real por lotes en Supabase vía upsert por SKU.

**Fuera de alcance:**
- Cualquier forma de crear, editar o importar variantes — no existe hoy en
  ningún punto de la app y este documento no lo introduce.
- Creación de proveedores nuevos desde el import.
- Mapeo de `ventas_mes` — no se importa; productos nuevos entran en 0,
  productos existentes conservan su valor actual.
- Cualquier cambio a la pestaña Dashboard, a `charts.js`, o a la lógica de
  los botones +/- de stock existentes.

## Diseño

### 1. Columnas y mapeo

Cinco columnas mapeables, todas obligatorias: **Nombre**, **SKU**, **Stock**,
**Stock mínimo**, **Proveedor**. A diferencia de básico (donde el usuario
podía marcar una columna como "No se usa este dato"), aquí no hay opción de
ignorar ninguno de los cinco campos porque los cinco son necesarios para
crear o actualizar un producto — si sobran columnas en el Excel, sencillamente
no se asignan a ningún campo y se ignoran sin necesidad de una opción
explícita por columna.

Autodetección por palabras clave en la cabecera (normalizada sin acentos,
en minúsculas, igual que en básico):

```js
const AUTO_MAPPING_RULES = [
  { field: "stockMinimo", keywords: ["minim"], wholeWords: ["min"] },
  { field: "sku", keywords: ["sku", "referencia"] },
  { field: "stock", keywords: ["stock", "cantidad", "existencias", "unidades"] },
  { field: "proveedor", keywords: ["proveedor", "supplier", "prov"] },
  { field: "nombre", keywords: ["nombre", "producto", "articulo", "item"] },
];
```

El orden de evaluación importa igual que en básico: cada regla solo
reclama un campo si ese campo no ha sido ya asignado a otra columna
(`claimedFields`), y las reglas se evalúan en el orden de la lista — por
eso `proveedor` va antes que `nombre`, para que una cabecera como
"Proveedor" no caiga en la regla de `nombre` por algún solape accidental
de palabras (no lo hay hoy, pero mantiene el mismo principio de básico:
reglas más específicas primero).

Texto explicativo de la pantalla de mapeo: *"Hemos intentado adivinar qué
columna es cada dato — revisa que esté bien y cambia lo que haga falta.
Las cinco son obligatorias: Nombre, SKU, Stock, Stock mínimo y
Proveedor."*

Se reutiliza el mecanismo de mapeo recordado de básico
(`localStorage`, clave `panelintermedio-import-mapping`, guardada como el
join de las cabeceras exactas) — nombre de clave distinto al de básico
(`panelbasico-import-mapping`) para no colisionar si alguna vez ambas apps
compartieran dominio, aunque hoy están en orígenes distintos.

### 2. Resolución de proveedor

El valor de la columna Proveedor de cada fila se compara contra
`PROVEEDORES` (ya cargado en memoria vía `fetchProveedores()`, refrescado
justo antes de construir la vista previa — ver sección 6) usando la misma
normalización que las cabeceras: minúsculas, sin acentos, y además
recortando espacios (`trim()`). La comparación es de **igualdad exacta**
tras normalizar, no de coincidencia parcial.

- Coincidencia encontrada → la fila usa ese `proveedor.id`.
- Ninguna coincidencia → fila inválida, motivo:
  `` Proveedor «${valorOriginal}» no encontrado ``, mostrando el texto tal
  cual venía en el Excel (sin normalizar) para que el usuario vea
  exactamente qué corregir.
- Coincidencias múltiples (el esquema no impone nombre único en
  `proveedores`) → se usa el proveedor de menor `id` — comportamiento
  determinista y documentado, no un error.
- Valor de Proveedor vacío tras `trim()` → fila inválida, motivo
  `"Proveedor vacío"` (igual tratamiento que un SKU o Nombre vacíos).

No se crean proveedores nuevos en ningún caso — el import solo referencia
proveedores que ya existen.

### 3. Guardia de variantes

Antes de clasificar las filas como válidas, se cruzan los SKUs del Excel
contra `PRODUCTS` (recién refrescado). Si el SKU coincide con un producto
existente cuyo campo `variantes` es un array no vacío (recordar: `mapRow`
en `data.js` deja `variantes` como `undefined` cuando no hay ninguna, así
que la comprobación es `Array.isArray(producto.variantes) &&
producto.variantes.length > 0`), la fila se clasifica como **omitida**, no
como válida ni como inválida:

- No se actualiza su `stock`, `nombre`, `stock_minimo` ni `proveedor_id`.
- Se muestra en la vista previa con el motivo:
  `"Ya tiene variantes — gestiónalo desde su ficha de producto."`
- No participa en absoluto en la llamada de escritura (ni en el cálculo
  de sustituir/sumar, ni en el upsert).

Esta comprobación ocurre **después** de las validaciones básicas de la
sección 4 — una fila con SKU vacío es inválida, no omitida, incluso si por
casualidad ese SKU vacío "coincidiera" con algo (no puede, pero el orden
de evaluación es: validar campos → si todo es válido, comprobar variantes
→ si tiene variantes, pasa de válida a omitida).

### 4. Validaciones de fila

Para cada fila (excepto la de cabecera), en este orden:

1. `nombre` no vacío tras `trim()` → si no, inválida: `"Nombre vacío"`.
2. `sku` no vacío tras `trim()` → si no, inválida: `"SKU vacío"`.
3. `stock` es un entero ≥ 0 vía `parseNonNegativeInt` (idéntica función a
   básico: rechaza no-numéricos, negativos, decimales, y valores
   `> 2147483647` por el límite de `integer` en Postgres) → si no,
   inválida: `"Stock no es un número válido"`.
4. `stockMinimo`, misma validación → inválida: `"Stock mínimo no es un
   número válido"`.
5. `proveedor` — ver sección 2 (vacío o no encontrado → inválida).
6. Si todo lo anterior es válido: comprobar la guardia de variantes
   (sección 3) — si aplica, la fila pasa a **omitida**.
7. Si no tiene variantes: fila **válida**.

Una fila puede tener más de un problema (por ejemplo, nombre vacío y stock
inválido a la vez); se reporta solo el primer motivo encontrado en el
orden de arriba, igual que básico reporta un único motivo por fila.

### 5. Vista previa

Tabla con columnas Nombre, SKU, Stock, Stock mínimo, Proveedor, y una
columna de Estado con tres estilos visuales distintos (reutilizando
`.import-error` de básico para inválidas, y una clase nueva
`.import-skipped` de aspecto neutro/informativo, no de error, para las
omitidas por variantes).

Resumen bajo la tabla: `"N filas válidas, M omitidas por tener variantes,
K con errores"` — tres números separados, no un total combinado, para que
el usuario entienda de un vistazo por qué el número de filas "que se van a
importar" es menor que el total del archivo.

El botón "Confirmar importación" solo se habilita si `N > 0` (al menos una
fila válida) — si todas las filas son inválidas u omitidas, el botón queda
deshabilitado con el resumen visible explicando por qué.

### 6. Refresco de datos antes de la vista previa

Al pulsar "Continuar" desde la pantalla de mapeo (antes de construir la
vista previa), se llama a `await Promise.all([fetchProducts(),
fetchProveedores()])` — refresca ambas cachés en memoria. Esto evita dos
problemas de datos obsoletos: la guardia de variantes usando una lista de
productos vieja, y la resolución de proveedor fallando (o acertando mal)
contra una lista de proveedores vieja si alguien más los modificó mientras
el modal estaba abierto.

### 7. Sustituir vs sumar

Igual que básico: un `radio-group` con dos opciones,
`replace` ("Sustituir su stock") y `sum` ("Sumar al stock actual"),
aplicado solo a las filas válidas que ya existen como producto (match por
SKU). Para las filas válidas que son productos nuevos, el modo no aplica —
su stock es directamente el del Excel.

Nombre, Stock mínimo y Proveedor de las filas válidas que actualizan un
producto existente se sobrescriben siempre con lo que traiga el Excel
(mismo criterio "todo lo que traiga la fila" que en básico) —
independientemente del modo de stock elegido.

### 8. Escritura

Se sustituye `insertProductsBatch` en `data.js` (que solo hacía un
`insert` plano, sin proveedor ni upsert, y que solo usaba el import falso)
por una función de upsert por lotes:

```js
async function upsertProductsChunk(rows) {
  const payload = rows.map(({ nombre, sku, stock, stockMinimo, proveedorId }) => ({
    nombre, sku, stock, stock_minimo: stockMinimo, proveedor_id: proveedorId,
  }));
  const { data, error } = await db
    .from("products")
    .upsert(payload, { onConflict: "sku" })
    .select("id, nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes, variantes(id, talla, color, stock)");
  if (error) throw error;
  return data.map(mapProductRow);
}
```

`ventas_mes` no aparece en el payload — al no incluirse en un upsert por
`onConflict`, Postgres no lo toca en las filas que ya existían, y las
filas nuevas usan el valor por defecto de la columna (`0`). El `.select()`
pide `variantes(...)` igual que `fetchProducts()` para que `mapProductRow`
funcione igual en ambos casos, aunque las filas que pasan por aquí nunca
tienen variantes (la guardia de la sección 3 las excluyó antes).

Se reutiliza el resto del mecanismo de básico sin cambios: lotes de 50
(`IMPORT_BATCH_SIZE`), token de ejecución (`importRun`) para descartar
trabajo huérfano si el modal se cierra y reabre a mitad de la escritura,
conjunto de SKUs ya comprometidos (`importCommittedSkus`) para no duplicar
la suma de stock en un reintento tras fallo parcial, y `window.confirm(...)`
antes de `startImport()` con el conteo de filas que se van a escribir.

### 9. Estado del modal (HTML)

`#importModal` pasa del único estado actual (con nombre de archivo
estático y barra de progreso falsa) a los mismos 5 estados que básico:
idle (con `<input type="file" accept=".xlsx,.xls,.csv">` real,
reemplazando el `<span class="file-name">inventario_agosto.xlsx</span>`
actual), mapping, preview, progress, result.

## Testing

No hay suite de tests en `panel-intermedio` (confirmado). Verificación
manual en navegador con un Excel de prueba que cubra:

- Filas válidas nuevas (SKU que no existe aún en la base de datos).
- Una fila con SKU de un producto existente sin variantes, probada en
  ambos modos (sustituir y sumar).
- Una fila con SKU de un producto existente que **sí** tiene variantes →
  debe aparecer como omitida, y tras importar su stock debe seguir
  exactamente igual que antes.
- Una fila con Proveedor vacío, y otra con un nombre de proveedor que no
  existe en la base de datos → ambas inválidas, con el motivo exacto
  mostrando el texto que trajo el Excel.
- Una fila con Nombre o SKU vacío, y otra con Stock o Stock mínimo no
  numérico, decimal o negativo → inválidas.
- Autodetección: cabeceras con variantes de texto ("Prov.", "Proveedor",
  "Supplier") para la nueva regla, junto con las cuatro ya existentes.
- Tras importar, comprobar sin recargar: el dashboard (total de
  productos, listos para vender), la tabla de Productos, y la pestaña de
  Proveedores (que el producto aparezca bajo el proveedor correcto)
  reflejan los cambios.

## Riesgos y consideraciones

- `insertProductsBatch` se elimina de `data.js` en vez de dejarse como
  código muerto — solo la usaba el import falso, que desaparece con este
  cambio.
- Las políticas RLS de `products` ya incluyen `insert` y `update` para
  `authenticated` (confirmado en `supabase/schema.sql`) — no hace falta
  ninguna migración SQL nueva para el `upsert`.
- Validar el proveedor contra la lista existente antes de escribir evita
  en la práctica el error de FK de Postgres, pero no elimina una ventana
  de carrera minúscula (alguien borra el proveedor entre que se abre el
  modal y se confirma la importación) — se acepta el mismo nivel de riesgo
  que básico acepta con SKUs duplicados entre pestañas: si ocurre, esa
  fila fallará al escribir y se reportará como error de fila igual que
  cualquier otro fallo de escritura, sin protección especial adicional.
- La guardia de variantes depende de que `PRODUCTS` esté recién
  refrescado (sección 6) — si esa llamada se omitiera, un producto al que
  otra persona le añadió variantes justo antes de la importación podría
  colarse como "válido" y desincronizar su stock de la suma de sus
  variantes. La sección 6 ya lo cubre; se menciona aquí como la razón de
  que ese refresco sea obligatorio y no una optimización opcional.
