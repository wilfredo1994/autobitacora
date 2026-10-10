# AutoBitácora · Sprints 1 a 7

Conoce el historial, costo y próximo mantenimiento de tu vehículo en un solo lugar.

**Stack:** React + TypeScript + Vite · Tailwind CSS · React Router · Supabase (Auth + PostgreSQL + RLS) · Cloudflare Pages.

**Sprint 7 (Free vs Premium):** límites del plan validados en la base de datos — Free: 1 vehículo activo, 3 recordatorios pendientes y 6 meses de historial visible; Premium: hasta 5 vehículos, recordatorios ilimitados e historial completo — más la página *Mi plan* (`/app/account`) con el uso y la comparación de planes. Si Premium vence, nada se borra: los vehículos que exceden el límite quedan en solo lectura. **Requiere ejecutar la migración `004_plan_limits.sql`.** El pago se habilita en el Sprint 8.

**Sprint 6 (dashboard y estadísticas):** página `/app/stats` con gasto del periodo, promedio mensual, costo total por km y km recorridos; gráfico de gasto por mes apilado por tipo (con tooltip y vista de tabla); distribución por tipo, principales rubros y comparación por vehículo; filtros por periodo (últimos 12 meses o año) y por vehículo. El dashboard suma la tarjeta *Costo por km* del prototipo. **No requiere SQL nuevo** ni dependencias nuevas (los gráficos son HTML + Tailwind).

**Sprint 5 (recordatorios):** pestaña *Recordatorios* en el detalle del vehículo para crear, editar, completar, descartar, reabrir y archivar recordatorios por fecha y/o kilometraje; página `/app/reminders` con los pendientes de todos los vehículos ordenados por proximidad; y sección *Recordatorios* en el dashboard. En móvil, la navegación pasa a una barra inferior. **No requiere SQL nuevo:** la tabla `reminders`, sus policies RLS, el check *fecha o km* y el trigger que sincroniza `completed_at` ya existen (migraciones 001 y 002).

**Sprint 4 (gastos + historial consolidado):** pestaña *Gastos* en el detalle del vehículo con registro, edición y archivado de otros gastos (SOAT, seguro, impuesto, peajes, etc.); pestaña *Historial* del vehículo y página `/app/history` que unen mantenimientos, combustible y gastos en una línea de tiempo por mes, con filtros por tipo y vehículo; y dashboard con el gasto del mes/año sumando los tres tipos de movimiento, más los últimos movimientos. **No requiere SQL nuevo:** la tabla `expenses`, sus policies RLS y el trigger de fecha no futura ya existen (migraciones 001 y 002).

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
3. Para un proyecto que ya tiene el esquema inicial, ejecuta en orden `supabase/migrations/002_business_rules.sql`, `supabase/migrations/003_add_suv_vehicle_type.sql` y `supabase/migrations/004_plan_limits.sql` en queries separadas.
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
├── plan/PlanProvider.tsx        plan efectivo, límites y uso (rpc get_my_plan)
├── components/                  ProtectedRoute, VehicleForm, VehicleCard, Alert, ... y charts/ (gráficos)
├── hooks/                       useVehicles, useVehicleDetail, useAllMaintenance, useAllFuel, useAllExpenses, usePendingReminders, useMovements
├── lib/                         supabase, format (fechas/moneda), due, maintenance, fuel, expenses, history, reminders, stats y plan (reglas de negocio)
├── layouts/AppLayout.tsx        header + navegación de la zona privada
├── pages/                       Login, Register, Dashboard, Vehicles, VehicleDetail, History, Reminders, Stats, Account
├── services/                    vehicles.ts, maintenance.ts, fuel.ts, expenses.ts, reminders.ts, plan.ts (CRUD y RPC contra Supabase)
└── types/app.ts                 tipos y etiquetas
supabase/migrations/
├── 001_initial_schema.sql       esquema, RLS y policies
├── 002_business_rules.sql       triggers: orden de kilometraje, fechas, total de combustible
├── 003_add_suv_vehicle_type.sql
└── 004_plan_limits.sql          límites Free/Premium: vehículos, recordatorios, solo lectura
```

## Decisiones de seguridad

- RLS activo en las 7 tablas; las tablas hijas validan propiedad vía `owns_vehicle(vehicle_id)`.
- `vehicles.user_id` toma `auth.uid()` por defecto; el frontend no lo envía y RLS impide asignarlo a otro usuario.
- No existen policies `DELETE`: "archivar" es un `UPDATE` de `deleted_at`.
- `subscriptions` es de solo lectura para el usuario; el plan lo gestionará el backend/webhook (Sprint 8).
- Se revocan privilegios de `anon` sobre las tablas públicas.
- Los límites del plan (vehículos, recordatorios, solo lectura) se validan con triggers `security definer`. Las funciones internas (`plan_for_user`, `vehicle_is_writable`) no se pueden llamar desde el cliente; la app solo usa `get_my_plan()`, que devuelve el plan del usuario autenticado.

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
- **Costos:** desde el Sprint 4 el dashboard suma mantenimiento + combustible + otros gastos.
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

## Probar el Sprint 4

1. Abre el detalle de un vehículo y entra a la pestaña **Gastos** (`/app/vehicles/<id>?tab=expenses`).
2. **Registrar gasto**: SOAT, fecha de hoy, S/ 95.50, kilometraje vacío. Aparece en la lista y en las tarjetas (total, año/mes y *Categoría principal*).
3. Registra otro gasto del mismo tipo, fecha y monto: el formulario avisa de un posible duplicado (no lo bloquea).
4. Intenta guardar un monto de 0 o una fecha futura: el formulario lo impide (la BD también rechaza fechas futuras).
5. Entra a la pestaña **Historial**: ves mantenimientos, cargas y gastos juntos, agrupados por mes con el total de cada mes, y el costo total del vehículo con su desglose. Filtra por *Combustible* u *Otros gastos*.
6. Haz clic en un movimiento del historial: te lleva a la pestaña donde se edita.
7. En el menú, abre **Historial** (`/app/history`): ves los movimientos de todos tus vehículos activos; con dos o más vehículos aparece el filtro por vehículo.
8. **Archivar** el gasto: sale de la lista, del historial y de los costos.
9. En el **Resumen**, *Gasto este mes / año* suma mantenimiento, combustible y otros gastos, y aparecen los **Últimos movimientos**.
10. Con un segundo usuario, `/app/history` aparece vacío (RLS).

### Reglas de negocio del Sprint 4

- **Categorías de gasto:** lista fija (SOAT, Seguro vehicular, Impuesto vehicular, Peajes, Estacionamiento, Lavado, Multas, Accesorios, Trámites, Otro) para que las estadísticas del Sprint 6 agrupen sin variantes de escritura. La columna sigue siendo `TEXT`; si un gasto tiene otra categoría, se conserva al editarlo. Lo que es mantenimiento (aceite, frenos, revisión técnica…) se registra en *Mantenimiento*.
- **Monto:** obligatorio y mayor a 0 (un gasto de S/ 0 no aporta información).
- **Kilometraje del gasto:** opcional y solo de referencia. No valida el orden con otros registros ni actualiza el kilometraje del vehículo, porque muchos gastos (seguro, impuesto) no dependen del odómetro.
- **Historial:** orden cronológico, más reciente primero; en un mismo día, por kilometraje (si ambos lo tienen) y luego por orden de registro. Solo incluye registros activos de vehículos activos. Es de solo lectura: cada movimiento se edita en su pestaña.
- **Gasto mensual / anual:** suma de mantenimientos (`cost`), combustible (`total_amount`) y otros gastos (`amount`) cuya fecha cae en el mes / año actual (fecha local).

## Probar el Sprint 5

1. Abre el detalle de un vehículo y entra a la pestaña **Recordatorios** (`/app/vehicles/<id>?tab=reminders`).
2. **Nuevo recordatorio**: *Renovar SOAT* con una fecha dentro de 10 días. Aparece como **Próximo** ("en 10 días").
3. Crea otro solo por kilometraje: *Rotación de llantas* a los km actuales + 5000. Aparece como **Al día** ("faltan 5,000 km").
4. Intenta guardar uno sin fecha ni km: el formulario lo impide (la BD también, con el check `reminders_has_due`).
5. Pon un kilometraje menor al actual: el formulario avisa que ya estaría vencido (no lo bloquea).
6. Edita el kilometraje del vehículo desde **Vehículos → Editar** (o registra una carga de combustible) hasta superar el objetivo del recordatorio por km: pasa a **Vencido** y sube al primer lugar.
7. **Completar** un recordatorio: sale de pendientes y aparece en *Completados y descartados* con la fecha en que se completó. **Reabrir** lo devuelve a pendientes (la BD limpia `completed_at`).
8. **Descartar** otro y luego **Archivar** desde *Completados y descartados*.
9. En el menú, abre **Recordatorios** (`/app/reminders`): ves los pendientes de todos tus vehículos, con el filtro por vehículo si tienes dos o más. Puedes completarlos o descartarlos desde ahí.
10. En el **Resumen** aparece la sección *Recordatorios* con los más cercanos y el número de vencidos.
11. Con un segundo usuario, `/app/reminders` aparece vacío (RLS).

### Reglas de negocio del Sprint 5

- **Vencimiento:** un recordatorio vence por fecha, por kilometraje o por ambos (lo que ocurra primero). Se usa la misma regla que el próximo mantenimiento (`src/lib/due.ts`): *Vencido* si la fecha pasó o el kilometraje actual alcanzó el objetivo; *Próximo* si faltan ≤ 30 días o ≤ 500 km; *Al día* en otro caso.
- **Orden por proximidad** (sección 18 del documento maestro): primero vencidos, luego próximos y al día; dentro de cada grupo, por días que faltan y luego por km que faltan.
- **Estados:** *Pendiente* → *Completado* (la BD guarda `completed_at`) o *Descartado* (ya no aplica, pero queda el registro). Ambos se pueden reabrir. *Archivar* lo oculta (borrado lógico).
- **Kilometraje de referencia:** el `current_mileage` del vehículo, que se actualiza al registrar mantenimientos y cargas o al editar el vehículo.
- **Fecha:** al crear, el formulario no ofrece fechas pasadas; al editar sí se permiten, para no bloquear recordatorios antiguos.
- **Solo vehículos activos:** los recordatorios de un vehículo archivado no aparecen en el dashboard ni en `/app/reminders`.
- **Límite del plan Free:** 3 recordatorios pendientes desde el Sprint 7 (ver reglas del Sprint 7).
- **Avisos:** los recordatorios se ven al abrir la app. Las notificaciones push o por correo quedan para más adelante (requieren PWA del Sprint 9 o un backend).

## Probar el Sprint 6

1. En el **Resumen**, la cuarta tarjeta es **Costo por km**. Sin historial suficiente dice que aparecerá con 500 km medidos (no muestra una cifra engañosa).
2. Registra en un vehículo un mantenimiento a 227000 km (hace un mes) y una carga a 227600 km (hoy): el costo por km aparece y es lo gastado después del primer registro entre 600 km.
3. Entra a **Estadísticas** (menú; en móvil *Análisis*): ves gasto del periodo, promedio mensual, costo por km y km recorridos.
4. **Gasto por mes**: pasa el mouse (o toca) una columna para ver el desglose del mes. *Ver como tabla* muestra los 12 meses con números.
5. Cambia el periodo a un año: el gráfico va de enero a diciembre. Con dos o más vehículos, filtra por vehículo y revisa la tabla **Por vehículo**.
6. **Principales rubros** agrupa por tipo de servicio y categoría de gasto (sin distinguir mayúsculas) y junta el resto en *Otros rubros*.
7. Con un segundo usuario, las estadísticas aparecen vacías (RLS).

### Reglas de negocio del Sprint 6

- **Periodo:** *últimos 12 meses* (incluido el actual) o un año calendario. El gasto del periodo suma mantenimiento (`cost`), combustible (`total_amount`) y otros gastos (`amount`).
- **Promedio mensual:** gasto del periodo / meses transcurridos del periodo desde tu primer registro. Si empezaste hace 3 meses, divide entre 3, no entre 12.
- **Costo total por km** (sección 18 del documento maestro):
  - *Km:* por vehículo, última lectura de odómetro del periodo − primera. Las lecturas salen de mantenimientos y cargas (la BD valida su orden); el km opcional de los gastos no se usa porque no se valida.
  - *Costo:* todo lo gastado (los tres tipos) **después del día de la primera lectura** y hasta la última. Lo pagado ese primer día corresponde a km anteriores (mismo criterio que el costo por km de combustible).
  - *Varios vehículos:* suma de costos / suma de km (no promedio de promedios).
  - *Historial suficiente:* solo se muestra con **al menos 500 km medidos** y dos lecturas en fechas distintas; si no, se explica qué falta.
- **Colores:** cada tipo tiene un color fijo (azul = mantenimiento, naranja = combustible, aqua = otros gastos), validado para daltonismo. El color sigue al tipo: los filtros no repintan. Siempre hay leyenda y vista de tabla.
- **Navegación:** con 5 secciones, el menú va en la cabecera solo en pantallas grandes (≥ 1024 px); en móvil y tablet va en la barra inferior.

## Probar el Sprint 7

**Antes:** ejecuta `supabase/migrations/004_plan_limits.sql` en el *SQL Editor*. Sin ella, la app avisa que falta la migración y muestra los límites Free, pero la base de datos todavía no los valida.

**Cambiar el plan de un usuario para probar** (solo desde el *SQL Editor*; la app no puede hacerlo). El UUID está en *Authentication → Users*:

```sql
-- Pasar a Premium
update public.subscriptions set plan = 'premium', status = 'active', expires_at = null where user_id = 'UUID_DEL_USUARIO';

-- Volver a Free
update public.subscriptions set plan = 'free', status = 'active', expires_at = null where user_id = 'UUID_DEL_USUARIO';

-- Simular un cobro fallido dentro de los 7 días de gracia (sigue Premium y la app avisa)
update public.subscriptions set plan = 'premium', status = 'past_due', expires_at = now() - interval '3 days' where user_id = 'UUID_DEL_USUARIO';
```

Recarga la app después de cada cambio.

1. **Free · vehículos:** con 1 vehículo activo, *Vehículos* ya no muestra *Registrar vehículo* sino el aviso de Premium. En la cabecera aparece la etiqueta **Free**, que lleva a *Mi plan*.
2. **Free · recordatorios:** crea 3 pendientes (en uno o varios vehículos). La pestaña muestra *3 de 3 pendientes* y el aviso de Premium. Completa uno: vuelve a permitir crear. *Reabrir* se deshabilita mientras estés en el límite.
3. **Free · historial:** registra un gasto con fecha de hace 8 meses. Se guarda con el aviso *"Por su fecha se verá en el historial con Premium"* y no aparece en la lista; abajo se muestra *"1 registro anterior al …"*. Si es un mantenimiento con *próximo mantenimiento*, su alerta sí aparece.
4. **Free · estadísticas:** el periodo es *últimos 6 meses* (6 columnas); los años aparecen deshabilitados con *· Premium*; *Principales rubros* muestra solo el primero.
5. **Premium:** pásate a Premium con el SQL de arriba. Puedes registrar hasta 5 vehículos, recordatorios sin límite, ver todo el historial y las estadísticas de 12 meses y de cada año.
6. **Volver a Free con 3 vehículos:** el más antiguo sigue editable; los otros dos muestran *Solo lectura* (sin botones de registrar ni editar) y *Mi plan* lo explica. Archiva uno de ellos: se libera sin problema.
7. **Gracia:** con el SQL de cobro fallido, *Mi plan* avisa hasta qué fecha mantienes Premium. Con `expires_at = now() - interval '8 days'` pasa a Free.

**Probar que la BD valida los límites** (como en la sección 7, con un usuario Free que ya tiene 1 vehículo):

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'UUID_USUARIO_FREE', 'role', 'authenticated')::text, true);

-- Debe fallar con PL001 "Tu plan permite 1 vehículo(s) activo(s)."
insert into public.vehicles (brand, model, year, license_plate) values ('X', 'Y', 2020, 'TST-001');

rollback;
```

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'UUID_USUARIO_FREE', 'role', 'authenticated')::text, true);

-- Debe fallar con 42501 (permission denied): la función interna no es pública
select public.plan_for_user('UUID_USUARIO_FREE');

rollback;
```

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'UUID_USUARIO_FREE', 'role', 'authenticated')::text, true);

-- Debe devolver plan free, vehicle_limit 1, reminder_limit 3, history_months 6 y el uso actual
select * from public.get_my_plan();

rollback;
```

(Cada prueba va en su propio bloque: después de un error, PostgreSQL ignora el resto de la transacción).

### Reglas de negocio del Sprint 7

| | Free | Premium |
|---|---|---|
| Vehículos activos | 1 | Hasta 5 |
| Recordatorios pendientes | 3 | Ilimitados |
| Historial visible | Últimos 6 meses | Completo |
| Estadísticas | Últimos 6 meses, rubro principal | 12 meses, cada año, todos los rubros, comparación entre vehículos |

- **Decisión de producto:** el documento maestro (sección 20.1) proponía *hasta 5 recordatorios* en Free; se fijó en **3**.
- **Plan efectivo** (`plan_for_user`): Premium si el plan es `premium` y: `active` hasta `expires_at` + **7 días de gracia**; `past_due` (cobro fallido) hasta `expires_at` + 7 días; `cancelled` hasta `expires_at` (ya pagó ese periodo, sin gracia). En cualquier otro caso, Free.
- **Qué cuenta en los límites:** vehículos activos (los archivados no) y recordatorios *pendientes* de vehículos activos (completados, descartados y archivados no). Se valida al crear, al reabrir y al desarchivar.
- **Historial de 6 meses:** es un límite de *visualización* que aplica la app. Los registros antiguos se guardan y se siguen usando para el próximo mantenimiento, el consumo km/l, los totales de gasto del mes/año y el costo por km. Se pueden registrar con fecha antigua (por ejemplo, el último servicio que recuerdes).
- **Volver a Free:** nada se borra. Solo los N vehículos activos **más antiguos** (N = límite del plan) son editables; en los demás la BD rechaza crear o modificar registros (`PL003`), pero se pueden ver y archivar. Los recordatorios por encima del límite se conservan, pero no se crean nuevos hasta bajar de 3.
- **Errores:** la BD responde `PL001` (vehículos), `PL002` (recordatorios) y `PL003` (solo lectura); la app los traduce a mensajes con la salida (archivar, completar o Premium).
- **Pagos:** el botón *Pasarme a Premium* dice *Disponible pronto*. La exportación (Excel/CSV) y el reporte PDF quedan para un sprint aparte.

## Siguiente: Sprint 8

Pagos y webhooks: integrar el proveedor de pagos (por ejemplo, Mercado Pago o Culqi para Perú), un webhook en el backend que actualice `subscriptions` con la clave `service_role` (nunca en el frontend) y el botón *Pasarme a Premium*.
