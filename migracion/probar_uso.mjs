// Prueba del contador en Finanzas: el panel financiero (GET) se mide en la D1 del local elegido; las escrituras no se miden.
import fs from "fs";
import assert from "assert";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
function d1(esquema) {
  const sq = new DatabaseSync(":memory:"); sq.exec(fs.readFileSync("migracion/" + esquema, "utf8"));
  const mk = (sql, p = []) => ({ bind: (...a) => mk(sql, a), all: async () => ({ results: sq.prepare(sql).all(...p), meta: {} }), first: async (c) => { const r = sq.prepare(sql).get(...p) || null; return c && r ? r[c] : r; },
    run: async () => { const r = sq.prepare(sql).run(...p); return { results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } });
  return { sq, DB: { prepare: s => mk(s), batch: async l => { const o = []; for (const s of l) o.push(await s.run()); return o; } } };
}
const marin = d1("esquema_marin_d1.sql"), argo = d1("esquema_argomedo_d1.sql");
marin.sq.exec("INSERT INTO configuracion VALUES ('token_dashboard','tk')");
const ins = marin.sq.prepare("INSERT INTO registros(nombre,fecha,categoria,tipo,cuenta,monto,n_operacion,origen) VALUES (?,?,?,?,?,?,?,?)");
for (let i = 0; i < 600; i++) ins.run("Registro de prueba " + i + " con descripción larga", "2026-10-" + String(1 + (i % 28)).padStart(2, "0"), "CATEGORIA " + (i % 15), "GASTO OPE", "BANCO", 1000 + i, "OP-" + i, "CARTOLA");
const env = { DB: marin.DB, DB_ARGOMEDO: argo.DB };    // sin secretos de Supabase: sin espejo
const pend = []; const ctx = { waitUntil: p => pend.push(Promise.resolve(p).catch(() => {})) };
const esperar = async () => { while (pend.length) await pend.shift(); };
const get = async q => { const r = await worker.fetch(new Request("https://x/?token=tk&" + q), env, ctx); const t = await r.text(); await esperar(); return { st: r.status, bytes: new TextEncoder().encode(t).length, j: JSON.parse(t) }; };
let n = 0; const ok = m => console.log("ok", ++n, m);

const a = await get("local=marin&action=financiero");
assert(a.st === 200 && a.bytes > 50000, "panel " + a.st + " " + a.bytes);
const fila = marin.sq.prepare("select * from uso_diario").all();
assert.strictEqual(fila.length, 1); assert.strictEqual(fila[0].app, "finanzas"); assert.strictEqual(fila[0].accion, "financiero"); assert.strictEqual(fila[0].n, 1); assert.strictEqual(fila[0].bytes, a.bytes);
ok("el panel financiero de Marín (" + a.bytes + " bytes) quedó contado en la D1 de Marín, app 'finanzas'");
await get("local=argomedo&action=financiero"); 
assert.strictEqual(argo.sq.prepare("select count(*) n from sqlite_master where name='uso_diario'").get().n, 0); ok("el panel de Argomedo (liviano, sin datos) no se cuenta ni crea la tabla");
const mal = await worker.fetch(new Request("https://x/?token=malo&local=marin&action=financiero"), env, ctx); await esperar();
assert.strictEqual(mal.status, 401); assert.strictEqual(marin.sq.prepare("select sum(n) n from uso_diario").get().n, 1); ok("un acceso sin clave correcta no se cuenta");
const u = (await get("local=marin&action=uso_diario")).j;
assert(u.ok && u.apps.finanzas.hoyN === 1 && u.apps.finanzas.hoyBytes === a.bytes && u.limiteGB === 5, JSON.stringify(u));
ok("?action=uso_diario (con clave): hoy 1 carga, proyección a 30 días " + u.total.proyeccionMesGB + " GB de " + u.limiteGB);
const sp = await worker.fetch(new Request("https://x/?local=marin&action=uso_diario"), env, ctx); assert.strictEqual(sp.status, 401); ok("sin clave el uso no se puede ver");
const p = await worker.fetch(new Request("https://x/", { method: "POST", body: JSON.stringify({ token: "tk", local: "marin", action: "financiero_agregar_fila", valores: { nombre: "x", fecha: "2026-10-20", categoria: "C", tipo: "GASTO OPE", cuenta: "BANCO", monto: 1 } }) }), env, ctx); await esperar();
assert((await p.json()).ok !== false); assert.strictEqual(marin.sq.prepare("select sum(n) n from uso_diario").get().n, 1); ok("las escrituras (POST) no se miden");
console.log("\nTodas las pruebas pasaron:", n); process.exit(0);
