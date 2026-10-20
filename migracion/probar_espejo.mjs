// Prueba del espejo de Finanzas: las escrituras de cada local (Marín -> esquema marin376, Argomedo -> argomedo455) se
// repiten en Supabase con los mismos ids. D1 = SQLite local, Supabase = Postgres local.
// Uso: NODE_PATH=<carpeta con pg> PGHOST=... PGUSER=... PGDATABASE=... node migracion/probar_espejo.mjs
import http from "http";
import fs from "fs";
import assert from "assert";
import { createRequire } from "module";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
const { Client } = createRequire(import.meta.url)("pg");

function d1(esquema) {
  const sq = new DatabaseSync(":memory:"); sq.exec(fs.readFileSync("migracion/" + esquema, "utf8"));
  const mk = (sql, p = []) => ({ bind: (...a) => mk(sql, a),
    all: async () => ({ results: sq.prepare(sql).all(...p), meta: { changes: 0 } }),
    first: async (c) => { const r = sq.prepare(sql).get(...p) || null; return c && r ? r[c] : r; },
    run: async () => { if (/^\s*SELECT/i.test(sql)) return { results: sq.prepare(sql).all(...p), meta: { changes: 0 } }; const r = sq.prepare(sql).run(...p); return { results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } });
  return { sq, DB: { prepare: s => mk(s), batch: async l => { const o = []; sq.exec("BEGIN"); try { for (const s of l) o.push(await s.run()); sq.exec("COMMIT"); } catch (e) { sq.exec("ROLLBACK"); throw e; } return o; } } };
}
const marin = d1("esquema_marin_d1.sql"), argo = d1("esquema_argomedo_d1.sql");
marin.sq.exec("INSERT INTO configuracion VALUES ('token_dashboard','tk')");
const rossyD1 = d1("esquema_rossy_d1.sql"), rossy = rossyD1.sq, DB_DEUDA_ROSSY = rossyD1.DB;
rossy.exec("INSERT INTO categories VALUES ('app_gastos_sep2026','App de gastos','confirmado',1,'x',1); INSERT INTO payments(category_id,fecha,monto) VALUES ('app_gastos_sep2026','2026-09-30',1000)");

const c = new Client(); await c.connect();
await c.query("drop schema if exists marin376 cascade; drop schema if exists argomedo455 cascade");
await c.query(fs.readFileSync("migracion/esquema_marin_pg.sql", "utf8"));
await c.query(fs.readFileSync("migracion/esquema_argomedo_pg.sql", "utf8"));
await c.query("drop schema if exists deuda_rossy cascade"); await c.query(fs.readFileSync("migracion/esquema_rossy_pg.sql", "utf8"));
await c.query("INSERT INTO deuda_rossy.categories VALUES ('app_gastos_sep2026','App de gastos','confirmado',1,'x',1); INSERT INTO deuda_rossy.payments(id,category_id,fecha,monto,created_at) VALUES (1,'app_gastos_sep2026','2026-09-30',1000,'x')");
await c.query(fs.readFileSync("migracion/funciones_espejo.sql", "utf8").replace(/revoke all[^;]*;|grant execute[^;]*;/g, ""));
const llamadas = {};
const srv = http.createServer(async (req, res) => {
  let body = ""; for await (const ch of req) body += ch;
  const fn = req.url.split("/rpc/")[1]; llamadas[fn] = (llamadas[fn] || 0) + 1;
  try { const r = await c.query("select public." + fn + "($1::jsonb) as r", [JSON.stringify(JSON.parse(body).sentencias)]); res.writeHead(200); res.end(JSON.stringify(r.rows[0].r)); }
  catch (e) { res.writeHead(400); res.end(JSON.stringify({ message: e.message })); }
}).listen(0);
const env = { DB: marin.DB, DB_ARGOMEDO: argo.DB, DB_DEUDA_ROSSY, SUPABASE_URL: "http://127.0.0.1:" + srv.address().port, SUPABASE_SERVICE_KEY: "k" };
const pendientes = []; const ctx = { waitUntil: p => { pendientes.push(Promise.resolve(p).catch(() => {})); } };
const esperar = async () => { while (pendientes.length) await pendientes.shift(); };
let n = 0; const ok = m => console.log("ok", ++n, m);
const post = async (local, action, extra) => (await worker.fetch(new Request("https://x/", { method: "POST", body: JSON.stringify({ token: "tk", local, action, ...extra }) }), env, ctx)).json();

const TABLAS = ["registros", "por_revisar", "control_dedup", "control_tx", "diccionario_aprendido"];
async function igual(base, esquema, etiqueta) {
  for (const t of TABLAS) {
    const orden = t === "control_dedup" ? "clave" : t === "control_tx" ? "ym" : t === "diccionario_aprendido" ? "patron" : "id";
    const a = base.sq.prepare("select * from " + t + " order by " + orden).all();
    const b = (await c.query("select * from " + esquema + "." + t + " order by " + orden)).rows;
    const norm = rs => JSON.stringify(rs.map(r => { const o = {}; for (const k of Object.keys(r).sort()) if (!/creado_en|aprendido_en/.test(k)) o[k] = r[k] === null ? null : String(r[k]); return o; }));
    assert.strictEqual(norm(b), norm(a), etiqueta + " · " + t);
  }
}
for (const [local, base, esquema] of [["marin", marin, "marin376"], ["argomedo", argo, "argomedo455"]]) {
  const cartola = [
    { fecha: "2026-10-15", descripcion: "TRANSFERENCIA DE CLIENTE PEREZ", nOperacion: "111", cargo: "", abono: "15.000" },
    { fecha: "2026-10-15", descripcion: "PAGO PROVEEDOR CCU", nOperacion: "112", cargo: "45.990", abono: "" },
    { fecha: "2026-10-16", descripcion: "COMPRA RARA 'X'", nOperacion: "113", cargo: "1.000", abono: "" }];
  for (const [a, extra] of [
    ["ingesta_cartola_finanzas", { filas: cartola, archivo: "cartola.xlsx" }],
    ["ingesta_cartola_finanzas", { filas: cartola, archivo: "cartola.xlsx" }],    // repetir la misma cartola: nada nuevo
    ["financiero_agregar_fila", { valores: { nombre: "Arriendo", fecha: "16/10/2026", categoria: "ARRIENDO", tipo: "GASTO OPE", cuenta: "BANCO", monto: 300000 } }],
    ["financiero_guardar_cierre", { datos: { fecha: "2026-10-17", venta_efectivo: 250000, costos_efectivo: [{ nombre: "Pan", categoria: "PAN", monto: 12000 }, { detalle: "Rossy", categoria: "SUELDO DEUDA", tipo: "GASTO OPE", monto: 50000 }] } }]]) {
    const j = await post(local, a, extra); assert(j.ok !== false, local + " " + a + ": " + JSON.stringify(j));
  }
  const id = base.sq.prepare("select id from registros where nombre='Arriendo'").get().id;
  assert((await post(local, "financiero_editar_fila", { rowIndex: id, valores: { nombre: "Arriendo local", fecha: "2026-10-16", categoria: "ARRIENDO", tipo: "GASTO OPE", cuenta: "BANCO", monto: 310000 } })).ok !== false);
  const pr = base.sq.prepare("select id from por_revisar order by id limit 1").get();
  if (pr) await post(local, "financiero_quitar_revisar", { fila: pr.id });
  const otro = base.sq.prepare("select id from registros order by id desc limit 1").get().id;
  assert((await post(local, "financiero_eliminar_fila", { rowIndex: otro })).ok !== false);
  await esperar();
  const nReg = base.sq.prepare("select count(*) n from registros").get().n, nPr = base.sq.prepare("select count(*) n from por_revisar").get().n;
  assert(nReg >= 3, "hay registros"); 
  await igual(base, esquema, local);
  ok(local + ": cartola (2 veces), fila manual, editar, quitar de Por revisar, eliminar y cierre de caja → Supabase igual a D1, ids incluidos (" + nReg + " registros, " + nPr + " por revisar)");
}
const pagosD1 = rossy.prepare("select id, category_id, fecha, monto, nota from payments order by id").all().map(r => [r.id, r.category_id, r.fecha, r.monto, r.nota].join("|"));
const pagosPg = (await c.query("select id, category_id, fecha, monto, nota from deuda_rossy.payments order by id")).rows.map(r => [r.id, r.category_id, r.fecha, r.monto, r.nota].join("|"));
assert.deepStrictEqual(pagosPg, pagosD1); assert.strictEqual(pagosD1.length, 2, "solo Marín anota en Deuda Rossy");
ok("el abono SUELDO DEUDA del cierre de Marín llegó también a Supabase (deuda_rossy), mismo id: " + pagosD1[1]);
assert(llamadas.ejecutar_sql_espejo > 0 && llamadas.ejecutar_sql_espejo_argomedo > 0); ok("cada local va a su propia base en Supabase (" + JSON.stringify(llamadas) + ")");
assert.strictEqual(Number((await c.query("select count(*) n from argomedo455.registros where nombre like 'Venta efectivo%'")).rows[0].n), 1);
assert.strictEqual(Number((await c.query("select count(*) n from marin376.registros where nombre like 'Venta efectivo%'")).rows[0].n), 1); ok("lo de Argomedo no cae en Marín ni al revés");
const sinEspejo = await (await worker.fetch(new Request("https://x/?token=tk&local=argomedo&action=financiero"), { ...env, SUPABASE_URL: undefined }, ctx)).json();
assert(sinEspejo.ok !== false); ok("sin los secretos de Supabase la app sigue funcionando igual (sin copia)");
console.log("\nTodas las pruebas pasaron:", n); srv.close(); await c.end(); process.exit(0);
