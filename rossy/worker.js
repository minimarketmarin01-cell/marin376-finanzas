var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/pg/traductor.js
var PK_POR_TABLA = {
  riesgo_excluidos: ["sku"],
  favoritos: ["sku"],
  carritos_guardados: ["provId"]
};
var IDENT_MIXTOS = ["provId", "provLabel", "sinCosto"];
var UPDATE_OR_IGNORE = {
  producto_proveedor_id: { cambia: "proveedor_id", resto: ["sku"] },
  producto_clasificacion_aprendida: null
};
var TS_UTC = "to_char(now() at time zone 'utc','YYYY-MM-DD HH24:MI:SS')";
var D_UTC = "to_char(now() at time zone 'utc','YYYY-MM-DD')";
function fueraDeTextos(sql, fn) {
  let out = "", i = 0;
  while (i < sql.length) {
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else {
      let j = i;
      while (j < sql.length && sql[j] !== "'") j++;
      out += fn(sql.slice(i, j));
      i = j;
    }
  }
  return out;
}
__name(fueraDeTextos, "fueraDeTextos");
function fueraDeTextosGlob(sql) {
  return sql.replace(/\bGLOB\s+'([^']*)'/gi, (_, pat) => {
    const re = pat.replace(/\*/g, ".*").replace(/\?/g, ".").replace(/(\[[^\]]+\])\1+/g, (m, g) => g + "{" + m.length / g.length + "}");
    return "~ '^" + re + "$'";
  });
}
__name(fueraDeTextosGlob, "fueraDeTextosGlob");
function aliasEnHaving(sql) {
  const mh = /\bHAVING\b([\s\S]*?)(?=\bORDER\s+BY\b|\bLIMIT\b|$)/i.exec(sql);
  if (!mh) return sql;
  let out = sql;
  const mSel = /^\s*SELECT\s+([\s\S]*?)\s+FROM\b/i.exec(sql);
  if (!mSel) return sql;
  const alias = {};
  const partes = [];
  let prof = 0, ini = 0;
  const sel = mSel[1];
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "(") prof++;
    else if (ch === ")") prof--;
    else if (ch === "," && prof === 0) {
      partes.push(sel.slice(ini, i));
      ini = i + 1;
    }
  }
  partes.push(sel.slice(ini));
  partes.forEach((p) => {
    const m = /^([\s\S]+?)\s+AS\s+(\w+)\s*$/i.exec(p.trim());
    if (m && /\(/.test(m[1])) alias[m[2]] = m[1].trim();
  });
  let having = mh[1];
  Object.keys(alias).forEach((a) => {
    having = having.replace(new RegExp("\\b" + a + "\\b", "g"), "(" + alias[a] + ")");
  });
  return out.replace(mh[1], having);
}
__name(aliasEnHaving, "aliasEnHaving");
function calificarUpsert(sql) {
  const mt = /^\s*INSERT\s+INTO\s+(\w+)/i.exec(sql);
  const md = /\bDO\s+UPDATE\s+SET\b([\s\S]*)$/i.exec(sql);
  if (!mt || !md) return sql;
  const tabla = mt[1];
  const nuevo = md[1].split(/,(?![^()]*\))/).map((asig) => {
    const m = /^(\s*)(\w+)(\s*=\s*)([\s\S]*)$/.exec(asig);
    if (!m) return asig;
    const rhs = m[4].replace(/(?<![\w.])(\w+)(?![\w(.])/g, (x, id, off, str) => /^(excluded|now|coalesce|case|when|then|else|end|null|and|or|not|is|in|\d+)$/i.test(id) ? x : id === m[2] || md[1].includes(id + " ") && false ? tabla + "." + id : x);
    return m[1] + m[2] + m[3] + rhs;
  }).join(",");
  return sql.replace(md[1], nuevo);
}
__name(calificarUpsert, "calificarUpsert");
function traducirSql(sqlOriginal) {
  let sql = String(sqlOriginal).trim().replace(/;\s*$/, "");
  sql = sql.replace(/^(\s*DELETE\s+FROM\s+"?\w+"?)\s*$/i, "$1 WHERE true");
  const mUpd = /^\s*UPDATE\s+OR\s+IGNORE\s+(\w+)\s+SET\s+(\w+)\s*=\s*\?\s+WHERE\s+(\w+)\s*=\s*\?\s*$/i.exec(sql);
  if (mUpd) {
    const [, tabla, colSet, colWhere] = mUpd;
    const regla = UPDATE_OR_IGNORE[tabla];
    if (regla === void 0 || colSet !== colWhere) throw new Error("UPDATE OR IGNORE no soportado para " + tabla);
    sql = regla ? "UPDATE " + tabla + " t SET " + colSet + " = ? WHERE t." + colWhere + " = ? AND NOT EXISTS (SELECT 1 FROM " + tabla + " x WHERE " + regla.resto.map((c) => "x." + c + " = t." + c).join(" AND ") + " AND x." + colSet + " = $1)" : "UPDATE " + tabla + " SET " + colSet + " = ? WHERE " + colWhere + " = ?";
  }
  const esInsertIgnore = /^\s*INSERT\s+OR\s+IGNORE\s+INTO/i.test(sql);
  const mReplace = /^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([^)]*)\)/i.exec(sql);
  sql = sql.replace(/^\s*INSERT\s+OR\s+(IGNORE|REPLACE)\s+INTO/i, "INSERT INTO");
  sql = fueraDeTextos(
    sql,
    (t) => t.replace(/\bGROUP_CONCAT\s*\(\s*([^(),]+?)\s*\)/gi, "string_agg(($1)::text, ',')").replace(/\b(\w+)\s+COLLATE\s+NOCASE\b/gi, "lower($1)").replace(/\browid\b/gi, "id").replace(/\bLIKE\b/gi, "ILIKE").replace(/\bIFNULL\s*\(/gi, "COALESCE(").replace(/\bAUTOINCREMENT\b/gi, "")
  );
  sql = fueraDeTextosGlob(sql);
  sql = aliasEnHaving(sql);
  sql = calificarUpsert(sql);
  sql = sql.replace(/datetime\(\s*'now'\s*\)/gi, TS_UTC).replace(/date\(\s*'now'\s*\)/gi, D_UTC).replace(/date\(\s*([^,()]+?)\s*,\s*'-(\d+) day'\s*\)/gi, "to_char(($1)::date - $2,'YYYY-MM-DD')").replace(/date\(\s*([^,()]+?)\s*,\s*'-'\s*\|\|\s*(\?)\s*\|\|\s*' day'\s*\)/gi, "to_char(($1)::date - ($2)::int,'YYYY-MM-DD')");
  if (/^\s*(CREATE|ALTER)\s/i.test(sql)) {
    sql = fueraDeTextos(
      sql,
      (t) => t.replace(/\bINTEGER\s+PRIMARY\s+KEY\s*(?=[,)])/gi, "BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY").replace(/\bINTEGER\b/gi, "BIGINT").replace(/\bREAL\b/gi, "DOUBLE PRECISION").replace(/\bADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/gi, "ADD COLUMN IF NOT EXISTS ")
    );
    sql = sql.replace(/DEFAULT\s*\(\s*(to_char\([^)]*\)[^)]*\))\s*\)/gi, "DEFAULT $1");
  }
  IDENT_MIXTOS.forEach((id) => {
    sql = fueraDeTextos(sql, (t) => t.replace(new RegExp('(?<![\\w"])' + id + '(?![\\w"])', "g"), '"' + id + '"'));
  });
  if (esInsertIgnore) sql += " ON CONFLICT DO NOTHING";
  if (mReplace) {
    const tabla = mReplace[1];
    const cols = mReplace[2].split(",").map((s) => s.trim());
    const pk = PK_POR_TABLA[tabla];
    if (!pk) throw new Error("INSERT OR REPLACE sin clave primaria conocida para " + tabla);
    const q = /* @__PURE__ */ __name((c) => IDENT_MIXTOS.includes(c) ? '"' + c + '"' : c, "q");
    const sets = cols.filter((c) => !pk.includes(c)).map((c) => q(c) + " = EXCLUDED." + q(c));
    sql += " ON CONFLICT (" + pk.map(q).join(", ") + ") " + (sets.length ? "DO UPDATE SET " + sets.join(", ") : "DO NOTHING");
  }
  let n = 0;
  sql = fueraDeTextos(sql, (t) => t.replace(/\?/g, () => "$" + ++n));
  return { text: sql, nParams: n };
}
__name(traducirSql, "traducirSql");

// src/pg/transporte_supabase.js
function literal(v) {
  if (v === null || v === void 0) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
__name(literal, "literal");
function literalParam(v) {
  if (typeof v === "number" && Number.isFinite(v)) return "'" + String(v) + "'";
  return literal(v);
}
__name(literalParam, "literalParam");
function incrustar(text, params) {
  if (!params || !params.length) return text;
  let out = "", i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "'") {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "'") {
          if (text[j + 1] === "'") {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === "$" && /\d/.test(text[i + 1] || "")) {
      let j = i + 1;
      while (/\d/.test(text[j] || "")) j++;
      const idx = parseInt(text.slice(i + 1, j), 10) - 1;
      out += literalParam(params[idx]);
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}
__name(incrustar, "incrustar");
function crearTransporteSupabase({ url, key, fetchFn, rpc: nombreRpc = "ejecutar_sql" }) {
  const f = fetchFn || fetch;
  async function rpc(sentencias) {
    const r = await f(url.replace(/\/$/, "") + "/rest/v1/rpc/" + nombreRpc, {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ sentencias })
    });
    const txt = await r.text();
    let j;
    try {
      j = JSON.parse(txt);
    } catch (_) {
      throw new Error("Supabase respondi\xF3 algo inesperado (HTTP " + r.status + "): " + txt.slice(0, 200));
    }
    if (!r.ok) throw new Error("Supabase: " + (j.message || j.error || txt).toString().slice(0, 300));
    return j;
  }
  __name(rpc, "rpc");
  return {
    async query(text, params) {
      const [res] = await rpc([incrustar(text, params)]);
      return res;
    },
    async transaccion(lista) {
      return rpc(lista.map((s) => incrustar(s.text, s.params)));
    }
  };
}
__name(crearTransporteSupabase, "crearTransporteSupabase");

// src/pg/espejo.js
var ES_ESCRITURA = /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP)\b/i;
var TABLAS_CON_ID = /* @__PURE__ */ new Set([
  "proveedores",
  "fiados",
  "prestamos_dinero",
  "auditoria",
  "facturas_calculos",
  "fiados_lineas",
  "historial_precios",
  "llegadas",
  "logs",
  "mermas",
  "movimientos_stock",
  "pagos_fiado",
  "por_revisar",
  "prestamos",
  "prestamos_dinero_abonos",
  "registros",
  "sectores",
  "vencimientos",
  "ventas_diarias"
]);
var MAX_POR_ENVIO = 150;
var _errores = 0;
var _enviadas = 0;
var _ultimoAviso = 0;
var _ultimoError = "";
function normalizarNumerados(sql, params) {
  if (!/\?\d/.test(sql)) return { sql, params };
  const out = [];
  let txt = "", i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      txt += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === "?") {
      let j = i + 1;
      while (/\d/.test(sql[j] || "")) j++;
      const k = j > i + 1 ? parseInt(sql.slice(i + 1, j), 10) - 1 : out.length;
      out.push(params[k]);
      txt += "?";
      i = j;
      continue;
    }
    txt += ch;
    i++;
  }
  return { sql: txt, params: out };
}
__name(normalizarNumerados, "normalizarNumerados");
function conIdDeD1(sql, params, lastRowId, tablasConId = TABLAS_CON_ID) {
  const m = /^\s*INSERT\s+(?:OR\s+\w+\s+)?INTO\s+"?(\w+)"?\s*\(([^)]*)\)\s*VALUES\s*\(/i.exec(sql);
  if (!m || !lastRowId || !tablasConId.has(m[1])) return null;
  const cols = m[2].split(",").map((c) => c.trim().replace(/"/g, "").toLowerCase());
  if (cols.includes("id")) return null;
  const resto = sql.slice(m.index + m[0].length);
  if (/\)\s*,\s*\(/.test(resto)) return null;
  const cabeza = m[0].replace(/\(([^)]*)\)\s*VALUES\s*\($/i, "(id, $1) VALUES (");
  return { sql: sql.slice(0, m.index) + cabeza + "?, " + resto, params: [lastRowId, ...params] };
}
__name(conIdDeD1, "conIdDeD1");
function conEspejo(env, ctx, { rpc = "ejecutar_sql_espejo", tablasConId = TABLAS_CON_ID } = {}) {
  if (!env || !env.DB || env.__espejo || env.__modo === "supabase") return env;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || String(env.ESPEJO_SUPABASE || "1") === "0") return env;
  const d1 = env.DB;
  const cola = [];
  let enviando = null;
  function encolar(sql, params, meta) {
    if (!ES_ESCRITURA.test(sql)) return;
    if (/^\s*INSERT/i.test(sql) && meta && meta.changes === 0) return;
    let { sql: s, params: p } = normalizarNumerados(sql, params || []);
    const ajustado = /^\s*INSERT/i.test(s) && meta && meta.changes === 1 ? conIdDeD1(s, p, meta.last_row_id, tablasConId) : null;
    if (ajustado) {
      s = ajustado.sql;
      p = ajustado.params;
    }
    try {
      const { text } = traducirSql(s);
      cola.push(incrustar(text, p.map((v) => v === void 0 ? null : v === true ? 1 : v === false ? 0 : v)));
    } catch (e) {
      _errores++;
      _ultimoError = "traducci\xF3n: " + e.message;
    }
    if (!enviando && ctx && ctx.waitUntil) {
      enviando = vaciar();
      ctx.waitUntil(enviando);
    }
  }
  __name(encolar, "encolar");
  async function vaciar() {
    await new Promise((r) => setTimeout(r, 25));
    while (cola.length) {
      const lote = cola.splice(0, MAX_POR_ENVIO);
      try {
        const r = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/" + rpc, {
          method: "POST",
          headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ sentencias: lote })
        });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j) throw new Error("HTTP " + r.status + " " + JSON.stringify(j).slice(0, 200));
        _enviadas += lote.length;
        const fallas = j.errores || [];
        if (fallas.length) {
          _errores += fallas.length;
          _ultimoError = String(fallas[0].error) + " \xB7 " + String(fallas[0].sql).slice(0, 120);
        }
      } catch (e) {
        _errores += lote.length;
        _ultimoError = "env\xEDo: " + e.message;
      }
    }
    enviando = null;
    if (_errores && Date.now() - _ultimoAviso > 6e5) {
      _ultimoAviso = Date.now();
      try {
        await d1.prepare("INSERT INTO logs (mensaje) VALUES (?)").bind("\u26A0\uFE0F Espejo Supabase: " + _errores + " escrituras sin copiar \xB7 " + _ultimoError.slice(0, 200)).run();
      } catch (_) {
      }
    }
  }
  __name(vaciar, "vaciar");
  const envolver = /* @__PURE__ */ __name((stmt, sql, params) => ({
    _d1: stmt,
    _sql: sql,
    _params: params,
    bind(...p) {
      return envolver(stmt.bind(...p), sql, p);
    },
    async run() {
      const r = await stmt.run();
      encolar(sql, params, r && r.meta);
      return r;
    },
    async all() {
      const r = await stmt.all();
      encolar(sql, params, r && r.meta);
      return r;
    },
    async first(col) {
      const r = await stmt.first(col);
      encolar(sql, params, null);
      return r;
    },
    async raw(o) {
      const r = await stmt.raw(o);
      encolar(sql, params, null);
      return r;
    }
  }), "envolver");
  const DB = {
    prepare(sql) {
      return envolver(d1.prepare(sql), sql, []);
    },
    async batch(lista) {
      const res = await d1.batch(lista.map((s) => s && s._d1 || s));
      lista.forEach((s, i) => {
        if (s && s._sql) encolar(s._sql, s._params, res[i] && res[i].meta);
      });
      return res;
    },
    exec(q) {
      return d1.exec(q);
    },
    dump() {
      return d1.dump();
    }
  };
  return { ...env, DB, __espejo: true };
}
__name(conEspejo, "conEspejo");

// src/pg/comparar.js
var TABLAS = ["settings", "salary_tramos", "categories", "payments"];
var SUMAS = [["Abonos (suma)", "SELECT COALESCE(SUM(monto),0) AS v FROM payments"], ["Tramos de sueldo (suma)", "SELECT COALESCE(SUM(monto),0) AS v FROM salary_tramos"]];
var _cache = { t: 0, r: null };
async function compararRossy(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error("Faltan los secretos SUPABASE_URL y SUPABASE_SERVICE_KEY en el servidor");
  if (_cache.r && Date.now() - _cache.t < 6e4) return { ..._cache.r, enCache: true };
  const tx = crearTransporteSupabase({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY, rpc: "ejecutar_sql_rossy" });
  const consultas = [...TABLAS.map((t) => "SELECT COUNT(*) AS v FROM " + t), ...SUMAS.map((x) => x[1])];
  const d1 = await env.DB.batch(consultas.map((s) => env.DB.prepare(s)));
  const sb = await tx.transaccion(consultas.map((s) => ({ text: s.replace(/ FROM (\w+)/, " FROM deuda_rossy.$1"), params: [] })));
  const val = /* @__PURE__ */ __name((r2) => Number((r2 && (r2.results || r2.rows) || [])[0]?.v ?? NaN), "val");
  const tablas = TABLAS.map((t, i) => ({ tabla: t, d1: val(d1[i]), supabase: val(sb[i]) })).map((x) => ({ ...x, coincide: x.d1 === x.supabase }));
  const control = SUMAS.map((x, k) => {
    const i = TABLAS.length + k;
    return { nombre: x[0], d1: val(d1[i]), supabase: val(sb[i]), coincide: val(d1[i]) === val(sb[i]) };
  });
  const r = { ok: true, todoCoincide: tablas.every((x) => x.coincide) && control.every((x) => x.coincide), tablas, control, revisadoEn: (/* @__PURE__ */ new Date()).toISOString() };
  _cache = { t: Date.now(), r };
  return r;
}
__name(compararRossy, "compararRossy");

// src/index.js
var json = /* @__PURE__ */ __name((data, init) => new Response(JSON.stringify(data), {
  ...init,
  headers: { "content-type": "application/json;charset=UTF-8", ...init && init.headers }
}), "json");
var badRequest = /* @__PURE__ */ __name((msg) => json({ error: msg }, { status: 400 }), "badRequest");
var notFound = /* @__PURE__ */ __name(() => json({ error: "No encontrado" }, { status: 404 }), "notFound");
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var TIPOS_PAGO = /* @__PURE__ */ new Set(["transferencia", "efectivo", "otro"]);
function slugify(name) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "grupo";
}
__name(slugify, "slugify");
async function getState(db) {
  const [settingsRes, tramosRes, categoriesRes, paymentsRes] = await Promise.all([
    db.prepare("SELECT key, value FROM settings").all(),
    db.prepare("SELECT id, label, from_date, to_date, monto, fuente FROM salary_tramos ORDER BY sort_order").all(),
    db.prepare("SELECT id, name, status, checked, description FROM categories ORDER BY sort_order").all(),
    db.prepare("SELECT id, category_id, fecha, monto, nota, tipo FROM payments ORDER BY fecha").all()
  ]);
  const settings = {};
  for (const row of settingsRes.results) settings[row.key] = row.value;
  const subtotals = {};
  for (const p of paymentsRes.results) {
    subtotals[p.category_id] = (subtotals[p.category_id] || 0) + p.monto;
  }
  const categories = categoriesRes.results.map((c) => ({
    ...c,
    checked: !!c.checked,
    subtotal: subtotals[c.id] || 0
  }));
  return {
    settings,
    tramos: tramosRes.results,
    categories,
    payments: paymentsRes.results
  };
}
__name(getState, "getState");
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const db = conEspejo(env, ctx, { rpc: "ejecutar_sql_espejo_rossy", tablasConId: /* @__PURE__ */ new Set(["payments"]) }).DB;
    if (!pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    try {
      if (pathname === "/api/espejo_comparar" && request.method === "GET") {
        return json(await compararRossy(env));
      }
      if (pathname === "/api/state" && request.method === "GET") {
        return json(await getState(db));
      }
      if (pathname === "/api/settings" && request.method === "PUT") {
        const body = await request.json();
        if (!DATE_RE.test(body.fecha_inicio || "")) return badRequest("fecha_inicio invalida");
        await db.prepare("INSERT INTO settings (key, value) VALUES ('fecha_inicio', ?1) ON CONFLICT(key) DO UPDATE SET value=?1").bind(body.fecha_inicio).run();
        return json({ ok: true });
      }
      let m = pathname.match(/^\/api\/tramos\/(\d+)$/);
      if (m && request.method === "PUT") {
        const id = Number(m[1]);
        const body = await request.json();
        const monto = Number(body.monto);
        if (!Number.isFinite(monto) || monto < 0) return badRequest("monto invalido");
        const res = await db.prepare("UPDATE salary_tramos SET monto = ?1 WHERE id = ?2").bind(monto, id).run();
        if (res.meta.changes === 0) return notFound();
        return json({ ok: true });
      }
      m = pathname.match(/^\/api\/categories\/([a-zA-Z0-9_-]+)$/);
      if (m && request.method === "PUT") {
        const id = m[1];
        const body = await request.json();
        const checked = body.checked ? 1 : 0;
        const res = await db.prepare("UPDATE categories SET checked = ?1 WHERE id = ?2").bind(checked, id).run();
        if (res.meta.changes === 0) return notFound();
        return json({ ok: true });
      }
      if (pathname === "/api/categories" && request.method === "POST") {
        const body = await request.json();
        const name = (body.name || "").trim();
        if (!name) return badRequest("nombre requerido");
        let id = slugify(name);
        const exists = await db.prepare("SELECT id FROM categories WHERE id = ?1").bind(id).first();
        if (exists) id = id + "_" + Date.now().toString(36);
        const maxOrder = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories").first();
        const sortOrder = (maxOrder ? maxOrder.m : 0) + 1;
        await db.prepare(
          "INSERT INTO categories (id, name, status, checked, description, sort_order) VALUES (?1, ?2, 'confirmado', 1, ?3, ?4)"
        ).bind(id, name, body.description || "Grupo agregado desde la app.", sortOrder).run();
        return json({ ok: true, id, name }, { status: 201 });
      }
      if (pathname === "/api/payments" && request.method === "POST") {
        const body = await request.json();
        const { category_id, fecha, nota } = body;
        const monto = Number(body.monto);
        const tipo = body.tipo || "transferencia";
        if (!category_id) return badRequest("category_id requerido");
        if (!DATE_RE.test(fecha || "")) return badRequest("fecha invalida (usa YYYY-MM-DD)");
        if (!Number.isFinite(monto) || monto <= 0) return badRequest("monto invalido");
        if (!TIPOS_PAGO.has(tipo)) return badRequest("tipo invalido (usa transferencia, efectivo u otro)");
        const cat = await db.prepare("SELECT id FROM categories WHERE id = ?1").bind(category_id).first();
        if (!cat) return badRequest("categoria desconocida");
        const res = await db.prepare("INSERT INTO payments (category_id, fecha, monto, nota, tipo) VALUES (?1, ?2, ?3, ?4, ?5)").bind(category_id, fecha, monto, nota || null, tipo).run();
        return json({ ok: true, id: res.meta.last_row_id }, { status: 201 });
      }
      m = pathname.match(/^\/api\/payments\/(\d+)$/);
      if (m && request.method === "DELETE") {
        const id = Number(m[1]);
        const res = await db.prepare("DELETE FROM payments WHERE id = ?1").bind(id).run();
        if (res.meta.changes === 0) return notFound();
        return json({ ok: true });
      }
      return notFound();
    } catch (err) {
      return json({ error: String(err && err.message || err) }, { status: 500 });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
