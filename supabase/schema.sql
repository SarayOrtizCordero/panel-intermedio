-- Panel de Inventario — Intermedio
-- Ejecuta este script completo en Supabase → SQL Editor (proyecto nuevo, una sola vez).

create table if not exists public.proveedores (
  id bigint generated always as identity primary key,
  nombre text not null,
  contacto text not null default ''
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  nombre text not null,
  sku text not null unique,
  stock integer not null default 0 check (stock >= 0),
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  proveedor_id bigint references public.proveedores(id) on delete set null,
  ventas_mes integer not null default 0 check (ventas_mes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.variantes (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  talla text not null,
  color text not null,
  stock integer not null default 0 check (stock >= 0)
);

alter table public.proveedores enable row level security;
alter table public.products enable row level security;
alter table public.variantes enable row level security;

-- Solo usuarios que han iniciado sesión pueden ver o modificar el inventario.
-- No se concede ningún permiso al rol "anon" (visitante sin login).
create policy "Usuarios autenticados pueden ver proveedores"
  on public.proveedores for select to authenticated using (true);
create policy "Usuarios autenticados pueden crear proveedores"
  on public.proveedores for insert to authenticated with check (true);

create policy "Usuarios autenticados pueden ver productos"
  on public.products for select to authenticated using (true);
create policy "Usuarios autenticados pueden crear productos"
  on public.products for insert to authenticated with check (true);
create policy "Usuarios autenticados pueden actualizar productos"
  on public.products for update to authenticated using (true) with check (true);

create policy "Usuarios autenticados pueden ver variantes"
  on public.variantes for select to authenticated using (true);
create policy "Usuarios autenticados pueden crear variantes"
  on public.variantes for insert to authenticated with check (true);
create policy "Usuarios autenticados pueden actualizar variantes"
  on public.variantes for update to authenticated using (true) with check (true);

grant usage on schema public to authenticated;
grant select, insert on public.proveedores to authenticated;
grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.variantes to authenticated;

-- Datos de ejemplo (los mismos de la demo original).
-- Seguro de re-ejecutar: si ya hay proveedores/productos, no duplica nada.
do $$
declare
  v_alba bigint;
  v_moda bigint;
  v_calzados bigint;
  v_accesorios bigint;
  v_camiseta bigint;
  v_sudadera bigint;
  v_vestido bigint;
begin
  if exists (select 1 from public.proveedores) then
    raise notice 'Ya hay proveedores cargados, no se insertan datos de ejemplo.';
    return;
  end if;

  insert into public.proveedores (nombre, contacto) values
    ('Textiles Alba', 'pedidos@textilesalba.com') returning id into v_alba;
  insert into public.proveedores (nombre, contacto) values
    ('Moda Rápida S.L.', 'compras@modarapida.es') returning id into v_moda;
  insert into public.proveedores (nombre, contacto) values
    ('Calzados Nova', 'ventas@calzadosnova.com') returning id into v_calzados;
  insert into public.proveedores (nombre, contacto) values
    ('Accesorios Norte', 'info@accesoriosnorte.com') returning id into v_accesorios;

  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Camiseta básica', 'CAM-001', 24, 8, v_alba, 86) returning id into v_camiseta;
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Pantalón vaquero', 'PAN-002', 15, 5, v_alba, 52);
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Sudadera con capucha', 'SUD-003', 9, 6, v_moda, 5) returning id into v_sudadera;
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Zapatillas running', 'ZAP-004', 12, 4, v_calzados, 58);
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Gorra deportiva', 'GOR-005', 30, 10, v_accesorios, 61);
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Chaqueta impermeable', 'CHA-006', 7, 5, v_moda, 3);
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Vestido de verano', 'VES-007', 11, 5, v_alba, 4) returning id into v_vestido;
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Bufanda de lana', 'BUF-008', 2, 5, v_accesorios, 1);
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Calcetines (pack 3)', 'CAL-009', 40, 12, v_accesorios, 74);
  insert into public.products (nombre, sku, stock, stock_minimo, proveedor_id, ventas_mes) values
    ('Guantes térmicos', 'GUA-010', 6, 6, v_accesorios, 2);

  insert into public.variantes (product_id, talla, color, stock) values
    (v_camiseta, 'S', 'Blanco', 4),
    (v_camiseta, 'S', 'Negro', 3),
    (v_camiseta, 'M', 'Blanco', 5),
    (v_camiseta, 'M', 'Negro', 4),
    (v_camiseta, 'M', 'Rojo', 2),
    (v_camiseta, 'L', 'Negro', 3),
    (v_camiseta, 'L', 'Gris', 3);

  insert into public.variantes (product_id, talla, color, stock) values
    (v_sudadera, 'S', 'Negro', 2),
    (v_sudadera, 'M', 'Gris', 3),
    (v_sudadera, 'M', 'Negro', 2),
    (v_sudadera, 'L', 'Rojo', 2);

  insert into public.variantes (product_id, talla, color, stock) values
    (v_vestido, 'S', 'Rojo', 3),
    (v_vestido, 'M', 'Rojo', 3),
    (v_vestido, 'M', 'Blanco', 2),
    (v_vestido, 'L', 'Negro', 3);
end $$;
