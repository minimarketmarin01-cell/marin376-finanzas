// ============================================================
// PANEL FINANCIERO — MINIMARKET MARÍN
// Worker independiente (separado de Pedidos Marín 376), pero
// leyendo la MISMA base D1 "marin376" (productos, ventas_diarias,
// ventas_diarias_historico, mermas — todas de solo lectura desde acá).
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
async function batchRun(env, stmts, size = 400) {
  let changes = 0;
  for (const chunk of chunkArray(stmts, size)) {
    const results = await env.DB.batch(chunk);
    results.forEach(r => { changes += (r.meta && r.meta.changes) || 0; });
  }
  return changes;
}

const DICCIONARIO_FINANZAS = [
  ['RUIZ Y GUZMAN',              'COSTOS', 'PANADERIA',          'Marraqueta'],
  ['COOPERATIVA AGRI',           'COSTOS', 'LA VAQUITA',         'Vaquita'],
  ['ALIMENTOS Y FRUTOS',         'COSTOS', 'MINUTO VERDE',       'Minuto Verde'],
  ['AGROCOMERCIAL CODIGUA',      'COSTOS', 'POSTRES',            'Codigua'],
  ['PGB DISTRIBUTION',           'COSTOS', 'PGB DISTRIBUCIÓN',   'PGB'],
  ['ELABORADORA DE A',           'COSTOS', 'PAN CASTAÑO',        'Pan Castaño'],
  ['LA SELECTA',                 'COSTOS', 'SELECTA',            'Selecta'],
  ['ZAPATA OROZCO',              'COSTOS', 'HUEVOS',             'Huevos Zapata'],
  ['CERES SPA',                  'COSTOS', 'HUEVOS',             'Huevos Ceres'],
  ['COPIAPO',                    'COSTOS', 'SCORE',              'Score'],
  ['MERCADOPAGO',                'COSTOS', 'LA ESQUINA DEL AHORRO', 'Esquina del Ahorro'],
  ['EMBOTELLADORA ANDINA',       'COSTOS', 'COCA COLA',          'Coca Cola'],
  ['TRANSPORTES CCU',            'COSTOS', 'CCU',                'CCU'],
  ['AGROSUPER',                  'COSTOS', 'AGROSUPER',          'Agrosuper'],
  ['T122V2179',                  'COSTOS', 'AGROSUPER',          'Agrosuper'],
  ['SANTA ELENA',                'COSTOS', 'SANTA ELENA',        'Santa Elena'],
  ['IDEAL SA',                   'COSTOS', 'IDEAL',              'Ideal'],
  ['EVERCRISP',                  'COSTOS', 'EVERCRISP',          'Evercrisp'],
  ['ARC DOS COME',               'COSTOS', 'CAROZZI',            'Carozzi'],
  ['ARC  DOS COMERCI',           'COSTOS', 'CAROZZI',            'Carozzi'],
  ['MOVING FOOD',                'COSTOS', 'MOVING FOOD',        'Moving Food'],
  ['TRES VERTIENTES',            'COSTOS', 'TRES VERTIENTES',    'Tres Vertientes'],
  ['ALLENDES HERMAN',            'COSTOS', 'ALLENDES',           'Allendes'],
  ['ICB SA',                     'COSTOS', 'MARCO POLO',         'Marco Polo'],
  ['FERRBEST',                   'COSTOS', 'MCKAY',              'McKay'],
  ['NESTLE',                     'COSTOS', 'NESTLE',             'Nestle'],
  ['SUDAMERICANA',               'COSTOS', 'SUDAMERICANA',       'Sudamericana'],
  ['PROMERCO',                   'COSTOS', 'PROMERCO',           'Promerco'],
  ['ARCAYA',                     'COSTOS', 'ARCAYA',             'Arcaya'],
  ['GLOBAL VE',                  'COSTOS', 'GLOBAL VE',          'Global VE'],
  ['PRODUCTOS FERNAN',           'COSTOS', 'PRODUCTOS FERNANDEZ','Productos Fernandez'],
  ['DISTRIBUIDORA NACIONAL',     'COSTOS', 'DINAC',              'Dinac'],
  ['AGAMA',                      'COSTOS', 'AGAMA',              'Agama'],
  ['TRENDY',                     'COSTOS', 'TRENDY',             'Trendy'],
  ['OPAZO Y CAAMA',              'COSTOS', 'BISCOMUND',          'Biscomund'],
  ['TRESMONTES',                 'COSTOS', 'TRESMONTES',         'Tresmontes'],
  ['CONSORCIO INDUSTRIAL DE ALIME','COSTOS','CIAL',              'Cial'],
  ['VICEQUIM',                   'COSTOS', 'VICEQUIM',           'Vicequim'],
  ['COMERCIALIZADORA AGRICOLA JOS','COSTOS','AGRICOLA JOSE',     'Agricola Jose'],
  ['SALINAS CONTRERAS',          'COSTOS', 'PALTA',              'Palta Salinas'],
  ['SALAZAR ESCOBILLANA',        'COSTOS', 'PALTA',              'Palta Ricardo'],
  ['VASQUEZ HUENCHUAL',          'COSTOS', 'FRUTA',              'Fruta Vasquez'],
  ['DIAZ CEA CESAR',             'COSTOS', 'QUILTRATUE',         'Quiltratue'],
  ['MORALES OLIVARES',           'COSTOS', 'EMPANADAS',          'Empanadas Morales'],
  ['SANTANA MAYOR',              'COSTOS', 'GALLETAS VEGANAS',   'Galletas Veganas'],
  ['INVERSIONES VIA K',          'COSTOS', 'OREO',               'Oreo'],
  ['NUEVA ESTACION',             'COSTOS', 'NUEVA ESTACIÓN',     'Nueva Estacion'],
  ['RUT 77279874',               'COSTOS', 'POSTRES',            'Arabito'],
  ['RUT 77627213',               'COSTOS', 'EMPANADAS',          'Empanadas San Isidro'],
  ['RUT 76881543',               'COSTOS', 'QUESO LLANERO',      'Llanero'],
  ['RUT 77113718',               'COSTOS', 'DISPROCOL',          'Disprocol'],
  ['RUT 77953538',               'COSTOS', 'COMERCIAL BOOM',     'Boom'],
  ['RUT 78245114',               'COSTOS', 'KREEMS',             'Kreems'],
  ['RUT 77882788',               'COSTOS', 'COMERCIAL DISMARK',  'Dismark'],
  ['LO VALLEDOR',                'COSTOS', 'LO VALLEDOR',        'Valledor'],
  ['SAN JORGE',                  'COSTOS', 'SAN JORGE',          'San Jorge'],
  ['COMERCIAL BOOM',             'COSTOS', 'COMERCIAL BOOM',     'Boom'],
  ['FULL MOTO',                  'COSTOS', 'FULL MOTO',          'Full Moto'],
  ['NEMARICH',                   'COSTOS', 'NEMARICH',           'Nemarich'],
  ['AJUSTE CARGO INTERNET',      'GASTO OPE', 'INTERNET',        'Internet'],
  ['PAGO UNIRED',                'GASTO OPE', 'SERVICIOS BÁSICOS','Agua Unired'],
  ['KHIPU',                      'GASTO OPE', 'COMUNICACIONES',  'Celulares'],
  ['CONDOMINIO GEOCENTRO',       'GASTO OPE', 'GASTOS COMUNES',  'Gastos Comunes'],
  ['QUINCALLERIA',               'GASTO OPE', 'MATERIALES DE MANTENIMIENTO', 'Quincalleria'],
  ['FERRETERIA D',               'GASTO OPE', 'MATERIALES DE MANTENIMIENTO', 'Ferreteria'],
  ['PC PLAY',                    'GASTO OPE', 'MATERIALES DE MANTENIMIENTO', 'PC Play'],
  ['MATOS CHUMBES',              'GASTO OPE', 'PLASTICOS',       'Bolsas'],
  ['PAGO CW ENEL',               'GASTO OPE', 'ENEL',            'Enel'],
  ['ENEL',                       'GASTO OPE', 'ENEL',            'Enel'],
  ['DIAZ MARTINEZ RAUL',         'GASTO OPE', 'IVA',             'Diaz Martinez'],
  ['MINIMARKET E CL',            'GASTO OPE', 'ADMINISTRATIVO',  'Almuerzo personal'],
  ['VERA PEREDA',                'GASTO OPE', 'ARRIENDO',        'Arriendo'],
  ['SALAZAR REQUEJO EDWIN',      'GASTO OPE', 'ADMINISTRATIVO',  'Edwin'],
  ['ROJAS REQUEJO ROS',          'GASTO OPE', 'SUELDO',          'Rossy'],
  ['CLINICA DENT',               'RETIRO_UTILIDAD', 'RETIRO SOCIO',     'Clinica Dental'],
  ['MINIMARKET AZH',             'PRESTAMO', 'MINIMARKET AZH',   'Prestamo AZH'],
];

function limpiarMontoFinanzas(v) {
  const n = parseFloat(String(v || '0').replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.'));
  return isNaN(n) ? 0 : Math.round(n);
}

async function cargarDiccionarioAprendido(env) {
  try {
    const r = await env.DB.prepare("SELECT patron, tipo, categoria, nombre FROM diccionario_aprendido").all();
    return r.results || [];
  } catch (e) { return []; }
}

function clasificarMovimientoEnMemoria(descripcion, aprendidos) {
  const descU = String(descripcion || '').toUpperCase();
  for (const r of aprendidos) {
    if (descU.indexOf(String(r.patron).toUpperCase()) !== -1) return { tipo: r.tipo, categoria: r.categoria, nombre: r.nombre };
  }
  for (const [patron, tipo, categoria, nombre] of DICCIONARIO_FINANZAS) {
    if (descU.indexOf(patron) !== -1) return { tipo, categoria, nombre };
  }
  return null;
}

async function clasificarMovimientoFinanzas(env, descripcion) {
  const aprendidos = await cargarDiccionarioAprendido(env);
  return clasificarMovimientoEnMemoria(descripcion, aprendidos);
}

async function ingestarCartolaDesdeFilas(env, filasCrudas, nombreArchivo) {
  // Separar candidatos válidos (abono o cargo) sin tocar la DB todavía
  const candAbono = [], candCargo = [];
  for (const f of filasCrudas) {
    const cargo = limpiarMontoFinanzas(f.cargo);
    const abono = limpiarMontoFinanzas(f.abono);
    const descU = String(f.descripcion || '').toUpperCase();
    if (abono > 0) {
      if (descU.indexOf('RED GLOBAL') !== -1) continue; // esa plata llega por el reporte SCQ
      if (!f.nOperacion) continue;
      candAbono.push({ ...f, abono, descU, clave: 'OP|' + f.nOperacion });
    } else {
      if (!cargo || cargo <= 0) continue;
      if (!f.nOperacion) continue;
      candCargo.push({ ...f, cargo, clave: 'OP|' + f.nOperacion });
    }
  }

  const todasClaves = [...candAbono, ...candCargo].map(c => c.clave);
  const yaExisten = new Set();
  for (const bloque of chunkArray(todasClaves, 100)) {
    if (!bloque.length) continue;
    const placeholders = bloque.map(() => '?').join(',');
    const rs = await env.DB.prepare(`SELECT clave FROM control_dedup WHERE clave IN (${placeholders})`).bind(...bloque).all();
    rs.results.forEach(r => yaExisten.add(r.clave));
  }

  let escritos = 0, revisar = 0;
  const duplicados = todasClaves.filter(c => yaExisten.has(c)).length;
  const stmts = [];
  const clavesNuevas = new Set();
  const aprendidos = candCargo.length ? await cargarDiccionarioAprendido(env) : [];

  for (const f of candAbono) {
    if (yaExisten.has(f.clave) || clavesNuevas.has(f.clave)) continue;
    if (f.descU.indexOf('DEVOLUCION DE IMPUESTO') !== -1) {
      stmts.push(env.DB.prepare(
        `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
      ).bind('Devolucion PPM', f.fecha, 'PPM F22', 'INGRESO', 'BANCO', f.abono, f.nOperacion, 'CARTOLA'));
      escritos++;
    } else if (f.abono > 100000) {
      stmts.push(env.DB.prepare(
        `INSERT INTO por_revisar (fecha, n_operacion, descripcion, monto, motivo, archivo) VALUES (?,?,?,?,?,?)`
      ).bind(f.fecha, f.nOperacion, f.descripcion, f.abono, 'Transferencia recibida > $100.000: confirmar si es venta', nombreArchivo));
      revisar++;
    } else {
      stmts.push(env.DB.prepare(
        `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
      ).bind('Transferencia cliente', f.fecha, 'TRANSFERENCIA CLIENTES', 'INGRESO', 'BANCO', f.abono, f.nOperacion, 'CARTOLA'));
      escritos++;
    }
    stmts.push(env.DB.prepare("INSERT OR IGNORE INTO control_dedup (clave) VALUES (?)").bind(f.clave));
    clavesNuevas.add(f.clave);
  }

  for (const f of candCargo) {
    if (yaExisten.has(f.clave) || clavesNuevas.has(f.clave)) continue;
    const match = clasificarMovimientoEnMemoria(f.descripcion, aprendidos);
    if (match) {
      stmts.push(env.DB.prepare(
        `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
      ).bind(match.nombre, f.fecha, match.categoria, match.tipo, 'BANCO', f.cargo, f.nOperacion, 'CARTOLA'));
      escritos++;
    } else {
      stmts.push(env.DB.prepare(
        `INSERT INTO por_revisar (fecha, n_operacion, descripcion, monto, motivo, archivo) VALUES (?,?,?,?,?,?)`
      ).bind(f.fecha, f.nOperacion, f.descripcion, f.cargo, 'Sin clasificar (cargo)', nombreArchivo));
      revisar++;
    }
    stmts.push(env.DB.prepare("INSERT OR IGNORE INTO control_dedup (clave) VALUES (?)").bind(f.clave));
    clavesNuevas.add(f.clave);
  }

  if (stmts.length) await batchRun(env, stmts, 100);
  return { total_filas: filasCrudas.length, escritos_registros: escritos, enviados_a_revisar: revisar, duplicados_omitidos: duplicados };
}

async function ingestarAbonosSCQ(env, filasCrudas, nombreArchivo) {
  const candidatos = [];
  let ignoradas = 0;
  for (const f of filasCrudas) {
    const estado = String(f.estado || '').toUpperCase();
    if (estado.indexOf('ANULAD') !== -1 || estado.indexOf('RECHAZ') !== -1) { ignoradas++; continue; }
    const montoVenta = limpiarMontoFinanzas(f.montoVenta);
    const totalAbono = limpiarMontoFinanzas(f.totalAbono);
    if (!montoVenta || montoVenta <= 0 || !f.nOperacion) { ignoradas++; continue; }
    candidatos.push({
      fecha: f.fecha, nOperacion: f.nOperacion, montoVenta,
      comision: Math.max(0, montoVenta - totalAbono),
      clave: 'SCQTX|' + f.nOperacion
    });
  }

  // Revisar duplicados en bloques de 100 (en vez de 1 consulta por transacción)
  const yaExisten = new Set();
  for (const bloque of chunkArray(candidatos, 100)) {
    if (!bloque.length) continue;
    const claves = bloque.map(c => c.clave);
    const placeholders = claves.map(() => '?').join(',');
    const rs = await env.DB.prepare(`SELECT clave FROM control_dedup WHERE clave IN (${placeholders})`).bind(...claves).all();
    rs.results.forEach(r => yaExisten.add(r.clave));
  }

  const nuevos = candidatos.filter(c => !yaExisten.has(c.clave));
  const duplicadas = candidatos.length - nuevos.length;

  const stmts = [];
  const conteoPorYm = {};
  for (const c of nuevos) {
    stmts.push(env.DB.prepare(
      `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
    ).bind('Venta tarjeta SCQ', c.fecha, 'VENTAS TARJETA', 'INGRESO', 'BANCO', c.montoVenta, 'SCQ-' + c.nOperacion + '-V', 'SCQ'));
    if (c.comision > 0) {
      stmts.push(env.DB.prepare(
        `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
      ).bind('Comision SCQ', c.fecha, 'COMISION POS', 'GASTO OPE', 'BANCO', c.comision, 'SCQ-' + c.nOperacion + '-C', 'SCQ'));
    }
    stmts.push(env.DB.prepare("INSERT OR IGNORE INTO control_dedup (clave) VALUES (?)").bind(c.clave));
    const ym = c.fecha.slice(0, 7);
    conteoPorYm[ym] = (conteoPorYm[ym] || 0) + 1;
  }
  if (stmts.length) await batchRun(env, stmts, 100);

  const stmtsTx = Object.keys(conteoPorYm).map(ym =>
    env.DB.prepare(
      `INSERT INTO control_tx (ym, n_transacciones) VALUES (?, ?)
       ON CONFLICT(ym) DO UPDATE SET n_transacciones = n_transacciones + ?`
    ).bind(ym, conteoPorYm[ym], conteoPorYm[ym])
  );
  if (stmtsTx.length) await batchRun(env, stmtsTx, 100);

  return { total_filas: filasCrudas.length, transacciones_escritas: nuevos.length, duplicadas_omitidas: duplicadas, ignoradas };
}

async function financieroEditarFila(env, body) {
  const id = body.rowIndex;
  if (!id) return { ok: false, error: 'Falta rowIndex' };
  const v = body.valores || {};
  const campos = [], valores = [];
  if (v.nombre !== undefined) { campos.push('nombre = ?'); valores.push(v.nombre); }
  if (v.fecha !== undefined) { campos.push('fecha = ?'); valores.push(v.fecha); }
  if (v.categoria !== undefined) { campos.push('categoria = ?'); valores.push(v.categoria); }
  if (v.tipo !== undefined) { campos.push('tipo = ?'); valores.push(v.tipo); }
  if (v.cuenta !== undefined) { campos.push('cuenta = ?'); valores.push(v.cuenta); }
  if (v.monto !== undefined) { campos.push('monto = ?'); valores.push(Number(v.monto) || 0); }
  if (!campos.length) return { ok: false, error: 'Nada que actualizar' };
  campos.push("actualizado_en = datetime('now')");
  valores.push(id);
  await env.DB.prepare(`UPDATE registros SET ${campos.join(', ')} WHERE id = ?`).bind(...valores).run();
  return { ok: true, fila: id };
}

async function financieroEliminarFila(env, body) {
  const id = body.rowIndex;
  if (!id) return { ok: false, error: 'Falta rowIndex' };
  await env.DB.prepare("DELETE FROM registros WHERE id = ?").bind(id).run();
  return { ok: true };
}

async function financieroAgregarFila(env, body) {
  const v = body.valores || {};
  const nop = v.nop || ('MANUAL-' + Date.now());
  await env.DB.prepare(
    `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
  ).bind(v.nombre || '', v.fecha || '', v.categoria || '', v.tipo || '', v.cuenta || 'EFECTIVO', Number(v.monto) || 0, nop, 'MANUAL').run();

  // Si viene de aprobar un movimiento de Por revisar, aprende el patrón para
  // clasificar solo la próxima vez (igual que hacía Apps Script).
  if (v.categoria && v.tipo && v.aprenderPatron !== false) {
    const clave = v.patron || v.nombre;
    if (clave) {
      await env.DB.prepare(
        `INSERT INTO diccionario_aprendido (patron, tipo, categoria, nombre) VALUES (?,?,?,?)
         ON CONFLICT(patron) DO UPDATE SET tipo=excluded.tipo, categoria=excluded.categoria, nombre=excluded.nombre`
      ).bind(String(clave).toUpperCase(), v.tipo, v.categoria, v.nombre || clave).run();
    }
  }
  return { ok: true };
}

async function financieroQuitarRevisar(env, body) {
  const id = body.fila;
  if (!id) return { ok: false, error: 'Falta fila' };
  await env.DB.prepare("DELETE FROM por_revisar WHERE id = ?").bind(id).run();
  return { ok: true };
}

async function financieroLeerCierre(env, body) {
  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: 'Falta el secreto CLAUDE_API_KEY en el Worker (Settings → Variables and Secrets)' };
  if (!body.imagenBase64) return { ok: false, error: 'No llegó la imagen' };

  const prompt =
    'Esta es una foto de un cierre de caja MANUSCRITO de un minimarket chileno (Minimarket Marín). ' +
    'El cuaderno normalmente tiene DOS tipos de líneas muy distintos:\n' +
    '1) GASTOS REALES pagados en efectivo ese día (ej: nombre de proveedor, "Isabel", "Lavadora", ' +
    '"Agua", "Sueldo/Rossy", "Boom", "Bolsas", pagos a personas o proveedores). Estos SÍ van en costos_efectivo.\n' +
    '2) LÍNEAS DE RECONCILIACIÓN DE CAJA, que NO son gastos y debes EXCLUIR de costos_efectivo: ' +
    '"Caja apertura"/"Caja anterior" (saldo con que abrió la caja), "Efectivo" como TOTAL final de caja ' +
    '(no un gasto llamado "efectivo"), "Venta efectivo" (es un resultado, no un gasto), ' +
    '"Tarjetas"/"Compraqui"/"SCQ"/"Transferencia" (ventas con tarjeta o transferencia, ' +
    'no gastos), y cualquier subtotal con línea subrayada que sea una SUMA de los gastos de arriba. ' +
    'Si tienes dudas sobre si una línea es un gasto real o una reconciliación, exclúyela de costos_efectivo.\n\n' +
    'Para cada gasto real, sugiere también categoria y tipo usando EXACTAMENTE una de estas categorías ' +
    'conocidas del negocio (elige la más parecida por nombre/rubro; si ninguna calza bien usa categoria ' +
    '"OTROS EFECTIVO" y tipo "GASTO OPE"):\n' +
    '- "Isabel" (persona) -> categoria "ISABEL", tipo "ISABEL" (línea de ensaladas)\n' +
    '- "Rossy"/"Sueldo" -> categoria "SUELDO", tipo "GASTO OPE"\n' +
    '- "Bolsas"/plástico -> categoria "BOLSAS", tipo "PLASTICOS"\n' +
    '- Proveedores de fruta/verdura/abarrotes/panadería (ej. "Boom", "Vega", nombres propios de personas) -> tipo "COSTOS"\n' +
    '- Agua, luz, mantención, insumos de limpieza (ej. "Lavadora", "Amasado") -> tipo "GASTO OPE"\n\n' +
    'Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown:\n' +
    '{\n' +
    '  "fecha": "DD/MM/AAAA o vacío si no aparece",\n' +
    '  "venta_efectivo": número (SOLO si encuentras la etiqueta literal escrita a mano ' +
    '"Venta efectivo" en la foto —a veces con una flecha "→" apuntando a un número—, usa EXACTAMENTE ' +
    'ese número tal cual está escrito. NO calcules ni restes tú mismo esta cifra, y NO uses el número ' +
    'de la línea "Efectivo" (el total de caja) como si fuera la venta en efectivo: son cosas distintas. ' +
    'Si no encuentras la etiqueta "Venta efectivo" explícita en la foto, devuelve 0.),\n' +
    '  "costos_efectivo": [ {"detalle":"texto tal cual aparece", "monto":número, "categoria":"...", "tipo":"..."} ]\n' +
    '}\n' +
    'Los montos en Chile usan punto como separador de miles (ej: 45.000 = 45000). ' +
    'Si un número es ilegible, ponlo en 0 y no inventes. Devuelve solo el JSON.';

  const payload = {
    model: 'claude-sonnet-5', // verificar en docs.claude.com si sigue siendo el modelo vigente con visión
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: body.mediaType || 'image/jpeg', data: body.imagenBase64 } },
        { type: 'text', text: prompt }
      ]
    }]
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    let msg = 'HTTP ' + resp.status;
    try { const j = await resp.json(); if (j.error && j.error.message) msg += ' - ' + j.error.message; } catch (e) { }
    return { ok: false, error: msg };
  }
  const data = await resp.json();
  if (data.error) return { ok: false, error: data.error.message || 'Error de Claude API' };

  let texto = '';
  (data.content || []).forEach(b => { if (b.type === 'text') texto += b.text; });
  texto = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
  let extraido;
  try { extraido = JSON.parse(texto); }
  catch (e) { return { ok: false, error: 'No se pudo interpretar la respuesta', crudo: texto }; }

  const aprendidos = await cargarDiccionarioAprendido(env);
  (extraido.costos_efectivo || []).forEach(cst => {
    const m = clasificarMovimientoEnMemoria(String(cst.detalle || ''), aprendidos);
    if (m) { cst.categoria = m.categoria; cst.tipo = m.tipo; }
  });

  return { ok: true, extraido };
}

async function financieroGuardarCierre(env, body) {
  const d = body.datos || {};
  const fecha = d.fecha;
  if (!fecha) return { ok: false, error: 'Falta la fecha' };
  const stmts = [];
  let filas = 0;

  if (Number(d.venta_efectivo) > 0) {
    stmts.push(env.DB.prepare(
      `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
    ).bind('Venta efectivo', fecha, 'VENTAS EFECTIVO', 'INGRESO', 'EFECTIVO', Number(d.venta_efectivo), 'CAJA-' + fecha + '-' + Math.floor(Math.random() * 9999), 'CIERRE_CAJA'));
    filas++;
  }
  for (const cst of (d.costos_efectivo || [])) {
    if (Number(cst.monto) > 0) {
      const categoria = cst.categoria || 'COSTOS EFECTIVO';
      const tipo = cst.tipo || 'COSTOS';
      stmts.push(env.DB.prepare(
        `INSERT INTO registros (nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, origen) VALUES (?,?,?,?,?,?,?,?)`
      ).bind(cst.detalle || 'Costo efectivo', fecha, categoria, tipo, 'EFECTIVO', Number(cst.monto), 'CAJA-' + fecha + '-' + Math.floor(Math.random() * 9999) + '-' + filas, 'CIERRE_CAJA'));
      filas++;
      if (cst.detalle) {
        stmts.push(env.DB.prepare(
          `INSERT INTO diccionario_aprendido (patron, tipo, categoria, nombre) VALUES (?,?,?,?)
           ON CONFLICT(patron) DO UPDATE SET tipo=excluded.tipo, categoria=excluded.categoria, nombre=excluded.nombre`
        ).bind(String(cst.detalle).toUpperCase(), tipo, categoria, cst.detalle));
      }
    }
  }
  if (stmts.length) await batchRun(env, stmts, 100);
  return { ok: true, filas };
}

// --- Quiebre de stock valorizado: SKU en 0 con historial de venta previo ---
async function calcularQuiebreValorizado(env) {
  try {
    const rows = (await env.DB.prepare(
      `SELECT p.sku, p.nombre, p.categoria,
              COALESCE(v.venta_prom_dia, 0) AS venta_prom_dia
       FROM productos p
       LEFT JOIN (
         SELECT sku, AVG(venta) AS venta_prom_dia
         FROM ventas_diarias_historico
         WHERE venta > 0
         GROUP BY sku
       ) v ON v.sku = p.sku
       WHERE p.stock <= 0 AND p.track_stock = 1`
    ).all()).results;

    const conVenta = rows.filter(r => r.venta_prom_dia > 0);
    const impactoDiario = conVenta.reduce((s, r) => s + r.venta_prom_dia, 0);
    const top = conVenta
      .sort((a, b) => b.venta_prom_dia - a.venta_prom_dia)
      .slice(0, 15)
      .map(r => ({ sku: r.sku, nombre: r.nombre, categoria: r.categoria, ventaPromDia: r.venta_prom_dia }));

    return {
      totalSkuQuiebre: rows.length,
      skuConHistorialVenta: conVenta.length,
      impactoEstimadoDiario: impactoDiario,
      impactoEstimadoSemanal: impactoDiario * 7,
      top
    };
  } catch (e) {
    return { totalSkuQuiebre: 0, skuConHistorialVenta: 0, impactoEstimadoDiario: 0, impactoEstimadoSemanal: 0, top: [], error: e.message };
  }
}

// --- Categorías sin rotación: stock > 0 sin ninguna venta registrada desde julio ---
async function calcularCategoriasSinRotacion(env) {
  try {
    const rows = (await env.DB.prepare(
      `SELECT p.categoria, COUNT(*) AS n_productos, SUM(p.stock * p.costo) AS capital_inmovilizado
       FROM productos p
       LEFT JOIN (
         SELECT sku, SUM(venta) AS venta_total FROM ventas_diarias_historico GROUP BY sku
       ) v ON v.sku = p.sku
       WHERE p.stock > 0 AND (v.venta_total IS NULL OR v.venta_total = 0)
       GROUP BY p.categoria
       ORDER BY capital_inmovilizado DESC`
    ).all()).results;

    const totalCapital = rows.reduce((s, r) => s + (r.capital_inmovilizado || 0), 0);
    return { categorias: rows, totalCapitalInmovilizado: totalCapital };
  } catch (e) {
    return { categorias: [], totalCapitalInmovilizado: 0, error: e.message };
  }
}

// --- Vencimientos próximos: valor en riesgo (preventivo) + vencidos sin merma registrada ---
async function calcularVencimientosProximos(env) {
  try {
    const rows = (await env.DB.prepare(
      `SELECT sku, producto, categoria, cantidad, fecha_vencimiento, estado, prioridad, accion, costo_usado, costo_origen
       FROM vencimientos`
    ).all()).results;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proximos = [];
    const vencidosSinMerma = [];

    for (const r of rows) {
      const m = String(r.fecha_vencimiento || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!m) continue;
      const fechaVenc = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      const diasRestantes = Math.round((fechaVenc - hoy) / 86400000);
      const valor = (Number(r.cantidad) || 0) * (Number(r.costo_usado) || 0);

      if (diasRestantes >= 0) {
        proximos.push({ sku: r.sku, producto: r.producto, categoria: r.categoria, prioridad: r.prioridad, diasRestantes, valor, accion: r.accion });
      } else if (String(r.prioridad || '').indexOf('⚫') !== -1 || String(r.accion || '').toUpperCase().indexOf('VENCIDO') !== -1) {
        vencidosSinMerma.push({ sku: r.sku, producto: r.producto, categoria: r.categoria, diasVencido: -diasRestantes, valor, costoOrigen: r.costo_origen });
      }
    }

    proximos.sort((a, b) => a.diasRestantes - b.diasRestantes);
    vencidosSinMerma.sort((a, b) => b.valor - a.valor);

    return {
      valorTotalProximos: proximos.reduce((s, r) => s + r.valor, 0),
      nProximos: proximos.length,
      top: proximos.slice(0, 15),
      valorTotalVencidoSinMerma: vencidosSinMerma.reduce((s, r) => s + r.valor, 0),
      nVencidoSinMerma: vencidosSinMerma.length,
      topVencidoSinMerma: vencidosSinMerma.slice(0, 10)
    };
  } catch (e) {
    return { valorTotalProximos: 0, nProximos: 0, top: [], valorTotalVencidoSinMerma: 0, nVencidoSinMerma: 0, topVencidoSinMerma: [], error: e.message };
  }
}

async function payloadFinanciero(env) {
  const FECHA_INICIO_FINANZAS = '2026-07-01'; // Apps Script/Sheets quedó abandonado; arranca limpio desde julio 2026

  const filasDB = (await env.DB.prepare(
    "SELECT id, nombre, fecha, categoria, tipo, cuenta, monto, n_operacion, subtipo_original FROM registros WHERE fecha >= ? ORDER BY fecha"
  ).bind(FECHA_INICIO_FINANZAS).all()).results;

  const TIPOS = ['INGRESO','COSTOS','GASTO OPE','MERMA','PLASTICOS','RETIRO_UTILIDAD'];
  const meses = {};
  const filasTabla = [];
  const retiroPorSubtipoYm = {};

  for (const fila of filasDB) {
    const monto = Number(fila.monto) || 0;
    const tipo = String(fila.tipo || '').trim().toUpperCase();
    const cat = String(fila.categoria || '').trim();
    const cuenta = String(fila.cuenta || '').trim().toUpperCase();
    const nombre = String(fila.nombre || '').trim();
    const nop = String(fila.n_operacion || '').trim();
    const fecha = fila.fecha;
    const ym = fecha.slice(0, 7);
    const dia = fecha.slice(8, 10);
    const subtipo = String(fila.subtipo_original || '').trim();

    filasTabla.push({ rowIndex: fila.id, nombre, fecha, categoria: cat, tipo, cuenta, monto, nop, ym, subtipo });

    if (tipo === 'RETIRO_UTILIDAD') {
      const clave = subtipo || 'OTRO';
      if (!retiroPorSubtipoYm[ym]) retiroPorSubtipoYm[ym] = {};
      retiroPorSubtipoYm[ym][clave] = (retiroPorSubtipoYm[ym][clave] || 0) + monto;
    }

    if (!meses[ym]) {
      meses[ym] = { tipos: {}, dias: {}, proveedores: {}, gastoCats: {}, nIngresos: 0, ingresoPOS: 0, ingresoTransferencia: 0, ingresoEfectivo: 0, ingresoOtro: 0, ingresoBanco: 0 };
      TIPOS.forEach(t => meses[ym].tipos[t] = 0);
    }
    const M = meses[ym];
    if (M.tipos[tipo] === undefined) M.tipos[tipo] = 0;
    M.tipos[tipo] += monto;
    if (!M.dias[dia]) M.dias[dia] = { ingreso: 0, egreso: 0 };
    if (tipo === 'INGRESO') { M.dias[dia].ingreso += monto; M.nIngresos++; } else { M.dias[dia].egreso += monto; }
    if (tipo === 'COSTOS') M.proveedores[cat] = (M.proveedores[cat] || 0) + monto;
    if (tipo === 'GASTO OPE') M.gastoCats[cat] = (M.gastoCats[cat] || 0) + monto;
    if (tipo === 'INGRESO') {
      const catU = cat.toUpperCase();
      if (catU.indexOf('TARJETA') >= 0) M.ingresoPOS += monto;
      else if (catU.indexOf('TRANSFERENCIA') >= 0) M.ingresoTransferencia += monto;
      else if (cuenta === 'EFECTIVO') M.ingresoEfectivo += monto;
      else M.ingresoOtro += monto;
      if (cuenta !== 'EFECTIVO') M.ingresoBanco += monto;
    }
  }

  const conteoTxRows = (await env.DB.prepare("SELECT ym, n_transacciones FROM control_tx").all()).results;
  const conteoTx = {};
  conteoTxRows.forEach(r => conteoTx[r.ym] = r.n_transacciones);

  const porRevisarRows = (await env.DB.prepare(
    "SELECT id, fecha, n_operacion, descripcion, monto, motivo, archivo FROM por_revisar ORDER BY fecha"
  ).all()).results;
  const porRevisar = porRevisarRows.map(r => ({
    fila: r.id, fecha: r.fecha || '', nop: r.n_operacion || '', descripcion: r.descripcion || '',
    monto: Number(r.monto) || 0, motivo: r.motivo || '', archivo: r.archivo || ''
  }));

  const setCats = new Set();
  DICCIONARIO_FINANZAS.forEach(d => { if (d[2]) setCats.add(String(d[2]).toUpperCase().trim()); });
  try {
    const aprendidos = await env.DB.prepare("SELECT categoria FROM diccionario_aprendido").all();
    aprendidos.results.forEach(r => { if (r.categoria) setCats.add(String(r.categoria).toUpperCase().trim()); });
  } catch (e) { /* tabla vacía, seguimos */ }
  filasTabla.forEach(f => { if (f.categoria) setCats.add(String(f.categoria).toUpperCase().trim()); });
  const categorias = Array.from(setCats).sort();

  // --- Configuración (m², % distribución de utilidad) ---
  const cfgRows = (await env.DB.prepare("SELECT clave, valor FROM configuracion").all()).results;
  const config = {};
  cfgRows.forEach(r => config[r.clave] = r.valor);
  const areaVentasM2 = Number(config.area_ventas_m2) || 0;

  // --- Mermas y consumo interno (tabla `mermas`, compartida con Pedidos Marín 376) ---
  let mermaPorYm = {}, mermaCategoriaYm = {}, consumoCategoriaYm = {}, consumoResponsableYm = {};
  try {
    const mermaRows = (await env.DB.prepare(
      `SELECT substr(fecha,1,7) AS ym, motivo, categoria, responsable, SUM(costo_total) AS total, COUNT(*) AS n
       FROM mermas WHERE fecha >= ? GROUP BY ym, motivo, categoria, responsable`
    ).bind(FECHA_INICIO_FINANZAS).all()).results;
    mermaRows.forEach(r => {
      if (!mermaPorYm[r.ym]) mermaPorYm[r.ym] = { real: 0, consumoInterno: 0, cambioProveedor: 0, nReal: 0 };
      const bucket = mermaPorYm[r.ym];
      const motivo = String(r.motivo || '').toLowerCase();
      const cat = r.categoria || 'SIN CATEGORÍA';
      const resp = r.responsable || 'Sin responsable';

      if (motivo === 'consumo_interno') {
        // Aparte de la merma real — es retiro para uso propio, no pérdida de gestión.
        bucket.consumoInterno += r.total || 0;
        if (!consumoCategoriaYm[r.ym]) consumoCategoriaYm[r.ym] = {};
        consumoCategoriaYm[r.ym][cat] = (consumoCategoriaYm[r.ym][cat] || 0) + (r.total || 0);
        if (!consumoResponsableYm[r.ym]) consumoResponsableYm[r.ym] = {};
        consumoResponsableYm[r.ym][resp] = (consumoResponsableYm[r.ym][resp] || 0) + (r.total || 0);
      } else if (motivo === 'cambio_proveedor') {
        bucket.cambioProveedor += r.total || 0;
      } else {
        bucket.real += r.total || 0; bucket.nReal += r.n || 0; // vencido, dañado, robo, liquidado
        if (!mermaCategoriaYm[r.ym]) mermaCategoriaYm[r.ym] = {};
        mermaCategoriaYm[r.ym][cat] = (mermaCategoriaYm[r.ym][cat] || 0) + (r.total || 0);
      }
    });
  } catch (e) { /* tabla mermas aún no disponible */ }
  const pctRetiroSocios = Number(config.pct_retiro_socios) || 0;
  const pctInversion = Number(config.pct_inversion) || 0;
  const pctReserva = Number(config.pct_reserva) || 0;

  // --- Mix SKU/m² y venta por SKU (misma base D1 que Pedidos Marín 376) ---
  let skuActivos = 0, ventaTotalYm = {}, ventaPorCategoriaYm = {};
  try {
    const skuRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM productos").first();
    skuActivos = (skuRow && skuRow.n) || 0;

    const ventaTotalRows = (await env.DB.prepare(
      `SELECT substr(fecha,1,7) AS ym, SUM(venta) AS venta FROM ventas_diarias_historico WHERE fecha >= ? GROUP BY ym`
    ).bind(FECHA_INICIO_FINANZAS).all()).results;
    ventaTotalRows.forEach(r => ventaTotalYm[r.ym] = r.venta);

    const ventaCatRows = (await env.DB.prepare(
      `SELECT substr(vdh.fecha,1,7) AS ym, p.categoria AS categoria, SUM(vdh.venta) AS venta
       FROM ventas_diarias_historico vdh JOIN productos p ON p.sku = vdh.sku
       WHERE vdh.fecha >= ? GROUP BY ym, p.categoria`
    ).bind(FECHA_INICIO_FINANZAS).all()).results;
    ventaCatRows.forEach(r => {
      if (!ventaPorCategoriaYm[r.ym]) ventaPorCategoriaYm[r.ym] = {};
      ventaPorCategoriaYm[r.ym][r.categoria] = r.venta;
    });
  } catch (e) { /* si productos/ventas_diarias_historico aún no existen, seguimos sin esto */ }

  const quiebreValorizado = await calcularQuiebreValorizado(env);
  const categoriasSinRotacion = await calcularCategoriasSinRotacion(env);
  const vencimientosProximos = await calcularVencimientosProximos(env);

  const salida = {
    generado: new Date().toISOString(), meses: [], filas: filasTabla, porRevisar, categorias,
    skuActivos, areaVentasM2, mixSkuM2: areaVentasM2 ? skuActivos / areaVentasM2 : 0,
    pctRetiroSocios, pctInversion, pctReserva,
    quiebreValorizado, categoriasSinRotacion, vencimientosProximos
  };

  Object.keys(meses).sort().forEach(ym => {
    const M = meses[ym];
    const ing = M.tipos['INGRESO'] || 0, cos = M.tipos['COSTOS'] || 0, gop = M.tipos['GASTO OPE'] || 0;
    const mer = M.tipos['MERMA'] || 0, pla = M.tipos['PLASTICOS'] || 0;
    // RETIRO_UTILIDAD (antes INSUMOS/ISABEL/PERSONAL) NO entra en egresos —
    // es retiro de utilidad, no gasto operativo. El detalle de quién retira
    // queda en subtipo_original (columna nueva tras la migración de TIPO).
    const egresos = cos + gop + mer + pla, util = ing - egresos;
    const margenBruto = ing ? (ing - cos) / ing * 100 : 0, rent = ing ? util / ing * 100 : 0;
    const efectivo = M.ingresoEfectivo || 0, incompleto = efectivo === 0;
    const mc = ing ? (ing - cos) / ing : 0;
    const puntoEq = mc > 0 ? gop / mc : 0;
    const comisionPOS = M.gastoCats['COMISION POS'] || 0;
    const retiroUtilidadMes = M.tipos['RETIRO_UTILIDAD'] || 0;
    const ventaLoyverseMes = ventaTotalYm[ym] || 0;
    const rotacionCategoria = {};
    const catsCompra = Object.keys(M.proveedores || {});
    const catsVenta = Object.keys(ventaPorCategoriaYm[ym] || {});
    Array.from(new Set([...catsCompra, ...catsVenta])).forEach(cat => {
      const compra = (M.proveedores && M.proveedores[cat]) || 0;
      const venta = (ventaPorCategoriaYm[ym] && ventaPorCategoriaYm[ym][cat]) || 0;
      rotacionCategoria[cat] = { compra, venta, margen: venta - compra };
    });
    salida.meses.push({
      ym, ingreso: ing, costos: cos, gastoOpe: gop, merma: mer, plasticos: pla,
      retiroUtilidad: retiroUtilidadMes, retiroPorSubtipo: retiroPorSubtipoYm[ym] || {},
      mermaDetalle: {
        real: (mermaPorYm[ym] && mermaPorYm[ym].real) || 0,
        nReal: (mermaPorYm[ym] && mermaPorYm[ym].nReal) || 0,
        consumoInterno: (mermaPorYm[ym] && mermaPorYm[ym].consumoInterno) || 0,
        consumoPorCategoria: consumoCategoriaYm[ym] || {},
        consumoPorResponsable: consumoResponsableYm[ym] || {},
        cambioProveedor: (mermaPorYm[ym] && mermaPorYm[ym].cambioProveedor) || 0,
        porCategoria: mermaCategoriaYm[ym] || {},
        tasaPerdida: ing ? (((mermaPorYm[ym] && mermaPorYm[ym].real) || 0) / ing * 100) : 0
      },
      distribucionUtilidad: {
        total: retiroUtilidadMes,
        retiroSocios: Math.round(retiroUtilidadMes * pctRetiroSocios / 100),
        inversion: Math.round(retiroUtilidadMes * pctInversion / 100),
        reserva: Math.round(retiroUtilidadMes * pctReserva / 100)
      },
      ventaLoyverseMes, ventaPorSku: skuActivos ? ventaLoyverseMes / skuActivos : 0,
      rotacionCategoria,
      margenBruto, utilidad: util, rentabilidad: rent,
      efectivo, banco: M.ingresoBanco || 0, incompleto,
      pctPlasticos: ing ? pla / ing * 100 : 0, puntoEquilibrio: puntoEq,
      ticketPromedio: (conteoTx[ym] > 0) ? (M.ingresoPOS || 0) / conteoTx[ym] : (M.nIngresos ? ing / M.nIngresos : 0),
      comisionPOSmensual: Math.round(comisionPOS),
      abonadoPOS: Math.round((M.ingresoPOS || 0) - comisionPOS),
      nTransaccionesPOS: conteoTx[ym] || 0,
      ingresoPOS: M.ingresoPOS, ingresoTransferencia: M.ingresoTransferencia,
      ingresoEfectivo: M.ingresoEfectivo, ingresoOtro: M.ingresoOtro,
      dias: M.dias, proveedores: M.proveedores, gastoCats: M.gastoCats
    });
  });

  return salida;
}



export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";

    try {
      // ---------- GET: lectura del dashboard ----------
      if (request.method === "GET") {
        if (action === "financiero" || action === "") {
          return json(await payloadFinanciero(env));
        }
        return json({ ok: false, error: "Acción GET no reconocida: " + action }, 400);
      }

      // ---------- POST: escritura ----------
      if (request.method === "POST") {
        const body = await request.json();
        let result;
        switch (body.action) {
          case "financiero_leer_cierre":
            result = await financieroLeerCierre(env, body);
            break;
          case "financiero_guardar_cierre":
            result = await financieroGuardarCierre(env, body);
            break;
          case "financiero_editar_fila":
            result = await financieroEditarFila(env, body);
            break;
          case "financiero_eliminar_fila":
            result = await financieroEliminarFila(env, body);
            break;
          case "financiero_agregar_fila":
            result = await financieroAgregarFila(env, body);
            break;
          case "financiero_quitar_revisar":
            result = await financieroQuitarRevisar(env, body);
            break;
          case "ingesta_cartola_finanzas":
            result = { ok: true, resultado: await ingestarCartolaDesdeFilas(env, body.filas || [], body.archivo || "cartola.xlsx") };
            break;
          case "ingesta_abonos_scq":
            result = { ok: true, resultado: await ingestarAbonosSCQ(env, body.filas || [], body.archivo || "abonos.xlsx") };
            break;
          default:
            result = { ok: false, error: "Acción no disponible: " + body.action };
        }
        return json(result);
      }

      return json({ ok: false, error: "Método no soportado" }, 405);
    } catch (err) {
      return json({ ok: false, error: err.message }, 500);
    }
  }
};
