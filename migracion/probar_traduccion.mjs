// Prueba que TODAS las consultas de src/index.js se traducen a Postgres y son válidas en los dos esquemas de Supabase
// (marin376 y argomedo455). Uso: NODE_PATH=<carpeta con pg y acorn> PGHOST=... node migracion/probar_traduccion.mjs
import { execSync } from "child_process";
import fs from "fs";
import { createRequire } from "module";
import { traducirSql } from "../src/pg/traductor.js";
const { Client } = createRequire(import.meta.url)("pg");
execSync("node migracion/extrae_sql.mjs src/index.js /tmp/sql_finanzas.json", { stdio: "inherit" });
const todas = JSON.parse(fs.readFileSync("/tmp/sql_finanzas.json", "utf8"));
const limpia = s => s.replace(/\{\{[^}]*\}\}/g, "?");
const c = new Client(); await c.connect();
let fallas = 0;
for (const [esquema, archivo] of [["marin376", "esquema_marin_pg.sql"], ["argomedo455", "esquema_argomedo_pg.sql"]]) {
  await c.query("drop schema if exists " + esquema + " cascade");
  await c.query(fs.readFileSync("migracion/" + archivo, "utf8"));
  await c.query("set search_path = " + esquema);
  let ok = 0; const malas = [];
  for (const x of todas) {
    if (/\bpayments\b/.test(x.sql)) continue;   // tabla de la base de Deuda Rossy (no se copia a Supabase)
    let t; try { t = traducirSql(limpia(x.sql)).text; } catch (e) { malas.push("L" + x.line + " traductor: " + e.message); continue; }
    try { await c.query("PREPARE s AS " + t); await c.query("DEALLOCATE s"); ok++; }
    catch (e) { malas.push("L" + x.line + ": " + e.message + "\n     " + t.replace(/\s+/g, " ").slice(0, 160)); try { await c.query("DEALLOCATE s"); } catch {} }
  }
  console.log(esquema + ": consultas OK " + ok + ", con problema " + malas.length); malas.forEach(m => console.log("  " + m)); fallas += malas.length;
}
await c.end();
