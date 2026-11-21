// API de la app "Plan de pago a Rossy" en Supabase (reemplaza al Worker deuda-sueldo-rossy de Cloudflare).
// rossy/worker.js es el código que corría en Cloudflare (sin cambios); la página ahora vive en GitHub Pages
// (Pedidos-Mar-n-/deuda-rossy/), por eso aquí se agregan las cabeceras CORS.
import original from "../../../rossy/worker.js";
import { servir, transporteDirecto } from "../../../src/plataforma_supabase.js";
import { crearDB } from "../../../src/pg_supabase/d1_compat.js";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type" };
const worker = {
  async fetch(req: Request, env: Record<string, unknown>, ctx: unknown) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const path = new URL(req.url).pathname;
    if (!path.startsWith("/api/")) return Response.json({ ok: false, error: "La app está en GitHub Pages" }, { status: 404, headers: CORS });
    const r = await original.fetch(req, env, ctx);
    const h = new Headers(r.headers);
    for (const [k, v] of Object.entries(CORS)) h.set(k, v);
    return new Response(r.body, { status: r.status, headers: h });
  },
  scheduled() {}
};

servir({
  worker,
  nombre: "rossy-api",
  prefijoSecretos: "rossy",
  armarEnv: () => ({ DB: crearDB(transporteDirecto("ejecutar_sql_rossy")) })
});
