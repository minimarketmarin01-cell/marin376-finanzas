// Panel financiero en Supabase (reemplaza al Worker marin376-finanzas de Cloudflare). Ver src/plataforma_supabase.js.
// Las tres bases del Worker (Marín, Argomedo, Deuda Rossy) son ahora esquemas del mismo Postgres.
// Lector de fotos: Gemini con el secreto GEMINI_API_KEY (Supabase → Edge Functions → Secrets).
import worker from "../../../src/index.js";
import { servir, transporteDirecto } from "../../../src/plataforma_supabase.js";
import { crearDB } from "../../../src/pg_supabase/d1_compat.js";

servir({
  worker,
  nombre: "finanzas-api",
  prefijoSecretos: "finanzas",
  armarEnv: () => ({
    DB: crearDB(transporteDirecto("ejecutar_sql_col")),
    DB_ARGOMEDO: crearDB(transporteDirecto("ejecutar_sql_col_argomedo")),
    DB_DEUDA_ROSSY: crearDB(transporteDirecto("ejecutar_sql_rossy")),
    GEMINI_API_KEY: Deno.env.get("GEMINI_API_KEY") || undefined,
    MODELO_GEMINI: Deno.env.get("MODELO_GEMINI") || undefined,
    LECTOR_FOTO: Deno.env.get("LECTOR_FOTO") || undefined
  })
});
