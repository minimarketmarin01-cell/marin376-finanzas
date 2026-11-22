# marin376-finanzas — panel financiero (Marín 376 y Argomedo 455)

Desde el 21-22 de noviembre de 2026 el panel corre **en Supabase**, no en Cloudflare. No uses `wrangler` ni D1 para este proyecto.

## Cómo está armado

| Pieza | Dónde | Qué hace |
|---|---|---|
| Servidor | Supabase Edge Function `finanzas-api` (`supabase/functions/finanzas-api/index.ts`) | Ejecuta el mismo `src/index.js` que antes era el Worker, con el adaptador `src/plataforma_supabase.js`. URL: `https://znywepjclzhgkctzrjxb.supabase.co/functions/v1/finanzas-api/` |
| Bases de datos | Mismo Postgres (proyecto `znywepjclzhgkctzrjxb`, sa-east-1) | `marin376` (Marín) · `argomedo455` (Argomedo) · `deuda_rossy` (abonos de la deuda de Rossy) |
| Capa D1→Postgres | `src/pg_supabase/` | Hace que el código con estilo D1 (`env.DB.prepare(...)`) corra sobre Postgres. Acepta `?1, ?2` y traduce `date('now','-90 days')` |
| Panel | repo `minimarket-dashboard` | `WORKER_FINANZAS_URL` apunta a la Edge Function |
| Cloudflare | Worker `marin376-finanzas` | **Solo reenvía** todo a la Edge Function (para celulares con la versión vieja del panel). Sin D1, sin cron. `SIN_PROXY=1` apaga el reenvío, pero no sirve de vuelta atrás |
| Lector de foto del cierre | `leerFotoConGemini` en `src/index.js` | Gemini (capa gratuita). Secreto `GEMINI_API_KEY` en Supabase → Edge Functions → Secrets |
| App de Rossy | Edge Function `rossy-api` (`rossy/worker.js`) | Mismo Postgres |

Funciones SQL que usa cada base: `public.ejecutar_sql_col` (Marín), `ejecutar_sql_col_argomedo`, `ejecutar_sql_rossy`.

## Qué ya NO se usa
- **D1** (`marin376`, `argomedo455-db`, `deuda_sueldo_rossy`): congeladas el 21-nov y desactualizadas. No son fuente de datos.
- **Workers AI** y la API de Claude para leer la foto del cierre: reemplazados por Gemini.
- El espejo D1→Supabase (`conEspejo`, `src/pg/`): desactivado; la base principal ya es Supabase.
- `wrangler.toml` conserva los bindings viejos solo por compatibilidad del Worker que reenvía.
- `migracion/*_d1.sql`: esquemas históricos. Los vigentes son `migracion/*_pg.sql`.

## Despliegue
- Se despliega a **Supabase** (Management API o dashboard; hace falta un token personal `sbp_`, que se pide con el formulario seguro, nunca por el chat). Los cambios en `src/index.js` o `supabase/functions/` no llegan a producción hasta desplegar la Edge Function.
- Probar siempre contra la base real después de desplegar (`?action=financiero` con la clave del panel).

## Acceso
- El token del panel está en la tabla `configuracion` (clave `token_dashboard`) del esquema `marin376`. Es el mismo para los dos locales.
- Llamadas: GET `?action=financiero&token=…&local=marin|argomedo`; POST con `{action, token, local, …}`. Cloudflare bloquea el User-Agent por defecto de Python: usa uno propio.
- Agregar `?forceFunctionRegion=sa-east-1` a toda llamada a Supabase; sin eso la función cae en EE. UU. y tarda 5-10 s.

## Límites (todo debe seguir en planes gratuitos)
Supabase Free: Edge Functions 2 s de CPU por petición y 500 000 invocaciones al mes; base de 500 MB; 5 GB de salida al mes (las respuestas van comprimidas con gzip). Cloudflare Free: solo el reenvío.

## Cosas a tener en cuenta
- **Ventas con tarjeta (SCQ):** hay una fila de venta y otra de comisión por transacción (~9 000 al mes). La respuesta del panel las manda sumadas por día (id negativo para no tocar transacciones reales).
- **N° de operación repetido:** el banco reutiliza el mismo N° para un mismo comercio de un mes a otro (p. ej. el pago de Enel). El cargador de cartolas tiene una regla de "clave vieja" que puede tomar uno nuevo por duplicado: después de cada carga, comparar cargos del archivo contra lo cargado.
- **No se aprenden reglas** de descripciones con SALAZAR REQUEJO, REQUEJO CALDERON o SALAZAR MONDRAGON (transferencias a cuentas de la familia).
- **Gemini gratis:** Google puede usar lo que se le envía para mejorar sus productos. La foto del cierre pasa por ahí.
- **Pendiente de probar:** una foto real de un cierre con el lector (solo se probó con una imagen sintética) y un `PAGO DEUDA` real desde el cierre viéndolo en la app de Rossy.
