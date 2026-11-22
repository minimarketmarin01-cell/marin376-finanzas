# marin376-finanzas — panel financiero (Marín 376 y Argomedo 455)

Desde el 21-22 de noviembre de 2026 el panel corre **en Supabase**, no en Cloudflare. No uses `wrangler` ni D1 para este proyecto.

## Cómo está armado

| Pieza | Dónde | Qué hace |
|---|---|---|
| Servidor | Supabase Edge Function `finanzas-api` (`supabase/functions/finanzas-api/index.ts`) | Ejecuta el mismo `src/index.js` que antes era el Worker, con el adaptador `src/plataforma_supabase.js`. URL: `https://znywepjclzhgkctzrjxb.supabase.co/functions/v1/finanzas-api/` |
| Bases de datos | Mismo Postgres (proyecto `znywepjclzhgkctzrjxb`, sa-east-1) | Esquemas `marin376` (Marín) · `argomedo455` (Argomedo) · `deuda_rossy` (abonos de la deuda de Rossy) |
| Capa D1→Postgres | `src/pg_supabase/` | Hace que el código con estilo D1 (`env.DB.prepare(...)`) corra sobre Postgres. Acepta `?1, ?2` y traduce `date('now','-90 days')` |
| Panel | repo `minimarket-dashboard` | `WORKER_FINANZAS_URL` apunta a la Edge Function |
| Cloudflare | Worker `marin376-finanzas` | **Solo reenvía** todo a la Edge Function (para celulares con la versión vieja del panel). Sin D1, sin cron. `SIN_PROXY=1` apaga el reenvío, pero no sirve de vuelta atrás |
| Lector de foto del cierre | `leerFotoConGemini` en `src/index.js` | Gemini (capa gratuita). Secreto `GEMINI_API_KEY` en Supabase → Edge Functions → Secrets |
| App de Rossy | Edge Function `rossy-api` (`rossy/worker.js`) | Mismo Postgres |

Funciones SQL que usa cada base: `public.ejecutar_sql_col` (Marín), `ejecutar_sql_col_argomedo`, `ejecutar_sql_rossy`.

Finanzas también **lee datos que llenan las apps de Pedidos** (mermas, ventas diarias, productos, proveedores, vencimientos, fiados) de las mismas bases. Si se cambia una de esas tablas en Pedidos (repos `marin376-cloudflare`, `Pedidos-Mar-n-`, `Argomedo455`), hay que revisar también las consultas de `payloadFinanciero` en `src/index.js`.

## Qué ya NO se usa
- **D1** (`marin376`, `argomedo455-db`, `deuda_sueldo_rossy`): congeladas el 21-nov y desactualizadas. No son fuente de datos.
- **Workers AI** y la API de Claude para leer la foto del cierre: reemplazados por Gemini.
- El espejo D1→Supabase (`conEspejo`, `src/pg/`): desactivado; la base principal ya es Supabase.
- `wrangler.toml` conserva los bindings viejos solo por compatibilidad del Worker que reenvía.
- `migracion/*_d1.sql`: esquemas históricos. Los vigentes son `migracion/*_pg.sql`.

## Despliegue (a Supabase, no a Cloudflare)
Hace falta un token personal de Supabase (`sbp_…`), guardado como network secret del entorno para el host `api.supabase.com`; nunca se pega en el chat. Se borra al terminar.

Con la Management API (sin CLI): `POST https://api.supabase.com/v1/projects/znywepjclzhgkctzrjxb/functions/deploy?slug=finanzas-api`, multipart con un campo `metadata` JSON (`{"entrypoint_path":"supabase/functions/finanzas-api/index.ts","name":"finanzas-api","verify_jwt":false}`) y un campo `file` por cada archivo, con el nombre **relativo a la raíz del repo** (la función importa archivos de `src/`). Archivos de `finanzas-api`: `supabase/functions/finanzas-api/index.ts`, `src/index.js`, `src/plataforma_supabase.js`, `src/uso.js`, `src/exportar_secretos.js`, `src/pg/{espejo,traductor,transporte_supabase}.js`, `src/pg_supabase/{d1_compat,traductor,transporte_supabase}.js`. Si se agrega un import nuevo, hay que sumarlo a la lista.

Probar siempre contra la base real después de desplegar (`?action=financiero` con la clave del panel, y las dos bases: `local=marin` y `local=argomedo`).

## Acceso
- El token del panel está en la tabla `configuracion` (clave `token_dashboard`) del esquema `marin376`. Es el mismo para los dos locales.
- Llamadas: GET `?action=financiero&token=…&local=marin|argomedo`; POST con `{action, token, local, …}`. Cloudflare bloquea el User-Agent por defecto de Python: usa uno propio.
- Agregar `?forceFunctionRegion=sa-east-1` a toda llamada a Supabase; sin eso la función cae en EE. UU. y tarda 5-10 s.

## Límites (todo debe seguir en planes gratuitos)
Supabase Free: Edge Functions 2 s de CPU por petición y 500 000 invocaciones al mes; base de 500 MB; 5 GB de salida al mes (las respuestas van comprimidas con gzip). Cloudflare Free: solo el reenvío.

## Cosas a tener en cuenta
- **Ventas con tarjeta (SCQ):** hay una fila de venta y otra de comisión por transacción (~9 000 al mes). La respuesta del panel las manda sumadas por día (id negativo para no tocar transacciones reales).
- **N° de operación repetido:** el banco reutiliza el mismo N° para un mismo comercio de un mes a otro (p. ej. el pago de Enel). El cargador de cartolas tiene una regla de "clave vieja" que puede tomar uno nuevo por duplicado: después de cada carga, comparar los cargos del archivo contra lo cargado.
- **No se aprenden reglas** de descripciones con SALAZAR REQUEJO, REQUEJO CALDERON o SALAZAR MONDRAGON (transferencias a cuentas de la familia).
- **Abonos de la deuda de Rossy:** un registro `PAGO DEUDA` con categoría `SUELDO DEUDA` se copia a `deuda_rossy.payments`; el tipo de pago es `transferencia` si la cuenta es BANCO y `efectivo` si no.
- **Gemini gratis:** Google puede usar lo que se le envía para mejorar sus productos. La foto del cierre pasa por ahí.
- **Pendiente de probar:** una foto real de un cierre con el lector (solo se probó con una imagen sintética).
