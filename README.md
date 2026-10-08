# AutoBitácora · Sprints 1 a 3

Conoce el historial, costo y próximo mantenimiento de tu vehículo en un solo lugar.

**Stack:** React + TypeScript + Vite · Tailwind CSS · React Router · Supabase (Auth + PostgreSQL + RLS) · Cloudflare Pages.

**Sprint 3 (combustible):** pestaña *Combustible* en el detalle del vehículo con registro, edición y archivado de cargas; consumo (km/l) por el método de tanque lleno a tanque lleno; costo de combustible por km; gasto total, del año y del mes; y dashboard con el gasto del mes/año sumando mantenimiento + combustible. **No requiere SQL nuevo** si ya ejecutaste la migración 002 (calcula el total de cada carga, valida el orden del kilometraje y actualiza el kilometraje del vehículo).

**Sprint 2 (historial de mantenimiento):** ruta `/app/vehicles/:id` con registro, edición y archivado de mantenimientos, costos (total, año y mes), próximos mantenimientos por fecha y/o kilometraje, y dashboard con gasto en mantenimiento. **No requiere cambios en Supabase:** las tablas y policies del Sprint 1 ya cubren todo; no hay que ejecutar SQL nuevo.

**Qué incluye el Sprint 1:** registro e inicio de sesión, rutas privadas, esquema PostgreSQL completo con RLS, CRUD de vehículos (crear, editar, archivar) y dashboard conectado a datos reales (sin datos de ejemplo).

---

## 1. Requisitos

- Node.js 18.18+ (recomendado 20 LTS) → `node -v`
- Una cuenta gratuita en [supabase.com](https://supabase.com)
- VS Code (opcional pero recomendado)

## 2. Crear el proyecto en Supabase

1. Entra a Supabase → **New project**. Elige nombre (`autobitacora`), contraseña de base de datos (guárdala) y la región más cercana (por ejemplo *South America (São Paulo)*).
2. Espera a que termine de aprovisionarse (~2 min).
3. Ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon / publishable key** (la clave pública)

   > ⚠️ **Nunca** copies la clave `service_role` al frontend ni a una variable `VITE_*`.

## 3. Ejecutar el SQL

1. En Supabase abre **SQL Editor → New query**.
2. En un proyecto nuevo, pega y ejecuta `supabase/migrations/001_initial_schema.sql`.
3. Para un proyecto que ya tiene el esquema inicial, ejecuta en orden `supabase/migrations/002_business_rules.sql` y `supabase/migrations/003_add_suv_vehicle_type.sql` en queries separadas.
4. Verifica en **Table Editor** que existen: `profiles`, `vehicles`, `maintenance_records`, `fuel_records`, `expenses`, `reminders`, `subscriptions` y que cada una muestra el candado de RLS activo.

> La migración 001 se ejecuta una sola vez en un proyecto nuevo. Las migraciones posteriores agregan cambios a un esquema existente y deben ejecutarse en orden, una sola vez cada una.

## 4. Configurar autenticación

En **Authentication → Providers → Email**:

- **Confirm email** activado (recomendado en producción): el usuario debe confirmar su correo antes de iniciar sesión.
- Para pruebas rápidas locales puedes desactivarlo; así el registro inicia sesión de inmediato.

En **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:5173` (en desarrollo). Al desplegar, cámbialo por tu dominio de Cloudflare Pages.
- **Redirect URLs:** agrega también `http://localhost:5173/**` y, luego, `https://TU-DOMINIO.pages.dev/**`.

## 5. Configurar y ejecutar en local

```bash
cd autobitacora
npm install
cp .env.example .env.local      # en Windows (PowerShell): copy .env.example .env.local
```

Edita `.env.local`:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```

Ejecuta:

```bash
npm run dev        # http://localhost:5173
npm run build      # valida TypeScript y genera /dist
```

Si abres la app sin configurar `.env.local`, verás una pantalla guía que te lo indica.

## 6. Primera prueba funcional

1. Abre `http://localhost:5173` → te redirige a `/login`.
2. **Crear cuenta** → completa nombre, correo y contraseña (mín. 8 caracteres).
3. Si la confirmación de correo está activa, abre el enlace del email e inicia sesión.
4. Verás el **dashboard vacío** con el botón *Registrar mi primer vehículo*.
5. Registra un vehículo (por ejemplo: Honda · Civic · 1998 · ABC-123 · 227000 km).
6. Aparece en el dashboard. Ve a **Vehículos** → **Editar** → cambia el kilometraje → guarda.
7. **Archivar** → confirma. Desaparece de la lista (queda con `deleted_at` en la base).
8. Intenta registrar otro vehículo con la misma placa: debe mostrar *"Ya tienes un vehículo activo con esa placa"*. Tras archivar el primero, esa placa vuelve a estar disponible.

## 7. Probar que RLS funciona

**Prueba A: desde la app.** Crea un segundo usuario (otro correo) y entra con él. Su dashboard debe aparecer vacío: no ve los vehículos del primero.

**Prueba B: desde SQL.** En el SQL Editor, reemplaza los UUID (los ves en *Authentication → Users*):

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'UUID_USUARIO_B', 'role', 'authenticated')::text, true);

-- Debe devolver 0 filas (B no ve los vehículos de A)
select * from public.vehicles where user_id = 'UUID_USUARIO_A';

-- Debe fallar con "new row violates row-level security policy"
insert into public.vehicles (user_id, brand, model, year, license_plate)
values ('UUID_USUARIO_A', 'X', 'Y', 2000, 'ZZZ-999');

rollback;
```

**Prueba C: el plan no se puede cambiar desde el cliente.** Con el mismo bloque `set local role authenticated`, un `update public.subscriptions set plan = 'premium'` debe fallar (no existe policy ni privilegio de UPDATE).

## 8. Subir a GitHub

```bash
git init
git add .
git commit -m "Sprint 1: auth + vehículos con Supabase y RLS"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/autobitacora.git
git push -u origin main
```

Antes de hacer `git add .`, confirma con `git status` que **`.env.local` no aparece** (ya está en `.gitignore`).

## 9. Desplegar en Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** y elige el repositorio.
2. Configuración de build:
   - **Framework preset:** Vite (o *None*)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. En **Environment variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (mismos valores que en `.env.local`). Opcional: `NODE_VERSION=20`.
4. Despliega. Cloudflare Pages sirve el `index.html` como respaldo SPA cuando no hay un `404.html`, por lo que rutas como `/app/vehicles` funcionan al recargar.
5. Vuelve a Supabase → **Authentication → URL Configuration** y actualiza **Site URL** y **Redirect URLs** con tu dominio `https://TU-PROYECTO.pages.dev`.

---

## Estructura

```
src/
├── auth/AuthProvider.tsx        sesión, signUp / signIn / signOut
├── components/                  ProtectedRoute, VehicleForm, VehicleCard, Alert, ...
├── hooks/                       useVehicles, useVehicleDetail, useAllMaintenance, useAllFuel
├── lib/                         supabase, format (fechas/moneda), maintenance y fuel (reglas de negocio)
├── layouts/AppLayout.tsx        header + navegación de la zona privada
├── pages/                       Login, Register, Dashboard, Vehicles, VehicleDetail
├── services/                    vehicles.ts, maintenance.ts, fuel.ts (CRUD contra Supabase)
└── types/app.ts                 tipos y etiquetas
supabase/migrations/
├── 001_initial_schema.sql       esquema, RLS y policies
├── 002_business_rules.sql       triggers: orden de kilometraje, fechas, total de combustible
└── 003_add_suv_vehicle_type.sql
```

## Decisiones de seguridad

- RLS activo en las 7 tablas; las tablas hijas validan propiedad vía `owns_vehicle(vehicle_id)`.
- `vehicles.user_id` toma `auth.uid()` por defecto; el frontend no lo envía y RLS impide asignarlo a otro usuario.
- No existen policies `DELETE`: "archivar" es un `UPDATE` de `deleted_at`.
- `subscriptions` es de solo lectura para el usuario; el plan lo gestionará el backend/webhook (Sprint 8).
- Se revocan privilegios de `anon` sobre las tablas públicas.

## Probar el Sprint 2

1. Entra a **Vehículos** y pulsa **Historial** en tu vehículo (o haz clic en su nombre).
2. **Registrar mantenimiento**: por ejemplo *Cambio de aceite*, fecha de hoy, 227000 km, costo 180, y en *Próximo mantenimiento* pon 232000 km. Si el kilometraje es mayor al del vehículo, aparece la opción de actualizarlo.
3. Verifica: el historial lista el servicio, las tarjetas muestran total / año / último servicio, y aparece **Próximos mantenimientos** con "faltan 5,000 km".
4. Registra **otro "Cambio de aceite"** más reciente: el próximo anterior se reemplaza (no queda una alerta duplicada).
5. Edita el kilometraje del vehículo a 232500 desde **Vehículos → Editar**: el próximo mantenimiento pasa a **Vencido**.
6. **Archivar** un mantenimiento: sale del historial y deja de sumar en los costos.
7. Vuelve al **Resumen**: ves gasto del mes/año en mantenimiento y los próximos pendientes de todos tus vehículos.
8. Con un segundo usuario, abre la URL `/app/vehicles/<id>` del primero: debe mostrar "No encontramos este vehículo" (RLS).

### Reglas de negocio del Sprint 2

- **Próximo mantenimiento:** se toma solo el servicio *más reciente de cada tipo*. Si ya repetiste el servicio, el "próximo" anterior deja de alertar.
- **Estados:** *Vencido* si la fecha pasó o el kilometraje actual alcanzó/superó el objetivo; *Próximo* si faltan ≤ 30 días o ≤ 500 km; *Al día* en otro caso. Si hay fecha y km, manda lo que ocurra primero.
- **Costos:** desde el Sprint 3 el dashboard suma mantenimiento + combustible; los demás gastos se agregarán en sprints posteriores.
- Las fechas se manejan como fecha local (sin desfase de zona horaria).

## Probar el Sprint 3

1. Abre el detalle de un vehículo y entra a la pestaña **Combustible** (la URL queda como `/app/vehicles/<id>?tab=fuel`).
2. **Registrar carga**: kilometraje 227000, Gasolina, 40 L a S/ 4.20, *Llené el tanque* marcado. El total (S/ 168.00) se calcula al escribir.
3. Las tarjetas muestran el gasto, y *Consumo* y *Costo por km* piden una segunda carga de tanque lleno.
4. Registra una carga **parcial** (desmarca *Llené el tanque*): 227200 km, 10 L.
5. Registra otra carga de **tanque lleno**: 227500 km, 30 L. El consumo es 500 km / 40 L = **12,5 km/l** (la parcial se suma) y aparece en esa carga del historial.
6. El kilometraje del vehículo sube solo a 227500 (lo hace el trigger de la migración 002).
7. Intenta registrar una carga con fecha anterior y un kilometraje mayor a uno posterior: debe mostrar *"El kilometraje no coincide con el orden de los registros"*.
8. **Archivar** una carga: deja de contar en el historial, el consumo y los costos.
9. En el **Resumen**, *Gasto este mes / año* suma mantenimiento y combustible, con el desglose de cada uno.

### Reglas de negocio del Sprint 3

- **Consumo (km/l):** método *tanque lleno a tanque lleno*. Entre dos cargas llenas, km recorridos / todo lo cargado después del primer lleno (incluye las parciales intermedias y el segundo lleno). Las parciales antes del primer lleno se ignoran porque no se sabe desde qué nivel partió el tanque.
- **Promedio:** ponderado (km totales de los tramos / cantidad total), no promedio de promedios. También se muestra el último tramo.
- **Por tipo de combustible:** el consumo se calcula por separado para cada tipo (km/l de gasolina no se mezcla con km/m³ de GNV). En vehículos bicombustible el consumo por tipo es aproximado, porque los km de un tramo pueden haberse hecho en parte con el otro combustible.
- **Unidades:** la columna es `liters`, pero para **GNV** se registran m³ y para **eléctrico** kWh. El formulario muestra la unidad según el combustible.
- **Costo por km (solo combustible):** del primer al último tanque lleno (de cualquier tipo), lo pagado después del primer lleno / km recorridos. Solo se muestra con al menos dos llenos con kilometraje distinto; antes no hay historial suficiente.
- **Total de la carga:** lo calcula la base de datos como `round(litros × precio, 2)`, así que no se puede manipular desde el cliente.

## Siguiente: Sprint 4

Según el documento maestro. Las tablas `expenses` (otros gastos) y `reminders` (recordatorios) ya existen en el esquema con RLS.
