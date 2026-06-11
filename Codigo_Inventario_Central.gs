/**
 * ============================================================
 *  FURIA ROCK — MÓDULO CENTRAL DE INVENTARIO (v2.0)
 *  Google Apps Script — Centralizador de Compras / Ventas / Inventario
 * ============================================================
 *
 *  PRINCIPIO DE DISEÑO:
 *  - COMPRAS y VENTAS son el "libro mayor" (solo se agregan filas).
 *  - INVENTARIO es una tabla maestra que SIEMPRE se recalcula
 *    desde el libro mayor:  STOCK = COMPRAS - VENTAS  (por SKU).
 *  - El SKU es la llave única que conecta todos los módulos.
 *  - Nunca hay duplicados: el recálculo reconstruye la tabla
 *    completa agrupando por SKU.
 *  - Se permite stock negativo (mercancía pendiente por comprar);
 *    una compra posterior lo compensa automáticamente.
 *  - Los productos nuevos se crean solos en PRODUCTOS e INVENTARIO
 *    la primera vez que aparecen en una compra o venta.
 *
 *  COMPATIBLE con el frontend actual (furia-rock-costos.vercel.app):
 *  acciones: guardarCompra, guardarVenta, sincronizarInventarioBatch,
 *  guardarAbono, obtenerAbonos, guardarCotizacion, getCotizaciones,
 *  convertirCotizacion, actualizarEstadoPago, sincronizarResultados.
 * ============================================================
 */

// ------------------------------------------------------------
// CONFIGURACIÓN DE HOJAS
// ------------------------------------------------------------
const SHEETS = {
  PRODUCTOS:    'PRODUCTOS',
  INVENTARIO:   'INVENTARIO',
  COMPRAS:      'COMPRAS',
  VENTAS:       'VENTAS',
  ABONOS:       'ABONOS',
  COTIZACIONES: 'COTIZACIONES',
  DASHBOARD:    'DASHBOARD',
  RESULTADOS:   'RESULTADOS'
};

const HEADERS = {
  PRODUCTOS:  ['SKU','SKU_LEGIBLE','REF_ID','REFERENCIA','CATEGORIA','TALLA','COLOR','FORMA','CREADO'],
  INVENTARIO: ['SKU','SKU_LEGIBLE','REFERENCIA','CATEGORIA','TALLA','COLOR','FORMA','COMPRAS','VENTAS','STOCK','ESTADO','COSTO_PROM','VALOR_STOCK','ACTUALIZADO'],
  COMPRAS:    ['ID','FECHA','FACTURA','SKU','REF_ID','REFERENCIA','CATEGORIA','TALLA','COLOR','FORMA','CANTIDAD','PRECIO_UNIT','TOTAL','PROVEEDOR','NOTAS'],
  VENTAS:     ['ID','FECHA','SKU','REF_ID','REFERENCIA','CATEGORIA','TALLA','COLOR','FORMA','CANTIDAD','PRECIO','TOTAL','CLIENTE','TELEFONO','DOCUMENTO','DIRECCION','ORDEN_INTERNA','ESTADO_PAGO','NOTAS'],
  ABONOS:     ['VENTA_ID','CLIENTE','TOTAL_VENTA','FECHA','ABONO1','ABONO2','ABONO3','ABONO4','ABONO5','TOTAL_ABONADO','SALDO','OBSERVACIONES'],
  COTIZACIONES: ['ID','FECHA','CLIENTE','TELEFONO','DOCUMENTO','DESCRIPCIONES','CANTIDADES','PRECIOS','TOTAL','ESTADO','ITEMS_JSON'],
  DASHBOARD:  ['METRICA','VALOR','ACTUALIZADO'],
  RESULTADOS: ['FECHA','DATOS_JSON']
};

// ------------------------------------------------------------
// PUNTOS DE ENTRADA (doPost / doGet)
// ------------------------------------------------------------
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita escrituras simultáneas que dupliquen datos
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || '';
    let res;
    switch (action) {
      case 'guardarCompra':              res = guardarCompra(body); break;
      case 'guardarVenta':               res = guardarVenta(body); break;
      case 'sincronizarInventarioBatch': res = sincronizarInventarioBatch(body); break;
      case 'guardarAbono':               res = guardarAbono(body); break;
      case 'obtenerAbonos':              res = obtenerAbonos(); break;
      case 'guardarCotizacion':          res = guardarCotizacion(body); break;
      case 'convertirCotizacion':        res = convertirCotizacion(body); break;
      case 'actualizarEstadoPago':       res = actualizarEstadoPago(body); break;
      case 'sincronizarResultados':      res = sincronizarResultados(body); break;
      case 'recalcularInventario':       res = { status:'ok', filas: recalcularInventario() }; break;
      default: res = { status:'error', msg:'Accion no reconocida: ' + action };
    }
    return jsonOut(res);
  } catch (err) {
    return jsonOut({ status:'error', msg: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  try {
    switch (action) {
      case 'getCotizaciones': return jsonOut({ status:'ok', cotizaciones: leerComoObjetos(SHEETS.COTIZACIONES) });
      case 'getInventario':   return jsonOut({ status:'ok', inventario: leerComoObjetos(SHEETS.INVENTARIO) });
      case 'getCompras':      return jsonOut({ status:'ok', compras: leerComoObjetos(SHEETS.COMPRAS) });
      case 'getVentas':       return jsonOut({ status:'ok', ventas: leerComoObjetos(SHEETS.VENTAS) });
      case 'getDashboard':    return jsonOut({ status:'ok', dashboard: calcularDashboard() });
      default:                return jsonOut({ status:'ok', msg:'API Furia Rock activa' });
    }
  } catch (err) {
    return jsonOut({ status:'error', msg: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
// 1. LLAVE ÚNICA POR PRODUCTO (SKU)
// ------------------------------------------------------------
/**
 * SKU canónico (llave técnica): refId|TALLA|COLOR|FORMA
 * Es el mismo formato que ya usa el frontend, así todo queda conectado.
 */
function skuCanonico(refId, talla, color, forma) {
  const norm = v => String(v == null || v === '' ? '_' : v).trim().toUpperCase();
  return [norm(refId), norm(talla), norm(color), norm(forma)].join('|');
}

/**
 * SKU legible para humanos: COL-M-NEG (referencia-talla-color).
 * Solo informativo; la llave real es el SKU canónico.
 */
function skuLegible(referencia, talla, color) {
  const limpiar = v => String(v || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes y la ~ de la Ñ
    .replace(/[^A-Z0-9 ]/g, '');
  const palabras = limpiar(referencia).split(/\s+/).filter(w =>
    !['CAMISETA','PARA','DE','DEL','EN','LA','EL','GRAMOS','ALGODON'].includes(w));
  const refCod = (palabras[0] || limpiar(referencia) || 'PRD').substring(0, 4);
  const colCod = limpiar(color).substring(0, 3) || 'STD';
  const tallaCod = limpiar(talla).replace(/\s/g, '') || 'UNI';
  return refCod + '-' + tallaCod + '-' + colCod;
}

// ------------------------------------------------------------
// 3. FLUJO DE COMPRAS
// ------------------------------------------------------------
function guardarCompra(body) {
  const items = body.items || [];
  if (!items.length) return { status:'error', msg:'Sin items' };
  const sh = ensureSheet(SHEETS.COMPRAS);
  const facturaId = body.facturaId || ('FC-' + Date.now());

  items.forEach(it => {
    const sku = skuCanonico(it.refId, it.talla, it.color, it.forma);
    registrarProductoSiNoExiste(sku, it);   // 7. creación automática
    sh.appendRow([
      it.id || ('C-' + Date.now() + '-' + Math.floor(Math.random()*1000)),
      it.fecha || hoy(),
      facturaId,
      sku,
      it.refId || '',
      it.ref || '',
      it.cat || '',
      it.talla || '',
      it.color || '',
      it.forma || '-',
      Number(it.cantidad) || 0,
      Number(it.precio) || 0,
      Number(it.total) || (Number(it.precio)||0) * (Number(it.cantidad)||0),
      it.proveedor || '',
      it.notas || ''
    ]);
  });

  // La compra SIEMPRE actualiza el inventario (suma compras, recalcula stock,
  // y compensa automáticamente cualquier stock negativo — puntos 3 y 6).
  recalcularInventario();
  return { status:'ok', msg:'Compra registrada', factura: facturaId, items: items.length };
}

// ------------------------------------------------------------
// 4 y 5. FLUJO DE VENTAS (con inventario negativo permitido)
// ------------------------------------------------------------
function guardarVenta(body) {
  const sh = ensureSheet(SHEETS.VENTAS);
  const sku = skuCanonico(body.refId, body.talla, body.color, body.forma);
  registrarProductoSiNoExiste(sku, body);   // 7. creación automática

  sh.appendRow([
    body.id || ('V-' + Date.now()),
    body.fecha || hoy(),
    sku,
    body.refId || '',
    body.ref || '',
    body.cat || '',
    body.talla || '',
    body.color || '',
    body.forma || '-',
    Number(body.cantidad) || 0,
    Number(body.precio) || 0,
    Number(body.total) || (Number(body.precio)||0) * (Number(body.cantidad)||0),
    body.cliente || '',
    body.telefono || '',
    body.documento || '',
    body.direccion || '',
    body.ordenInterna || '',
    body.estadoPago || 'Pendiente de pago',
    body.notas || ''
  ]);

  // La venta descuenta inventario. Si no hay stock, queda NEGATIVO
  // (mercancía pendiente por comprar) — nunca se bloquea la venta.
  recalcularInventario();
  return { status:'ok', msg:'Venta registrada' };
}

// ------------------------------------------------------------
// 2, 6 y 8. INVENTARIO COMO TABLA MAESTRA ÚNICA (sin duplicados)
// ------------------------------------------------------------
/**
 * Reconstruye la tabla INVENTARIO completa desde COMPRAS y VENTAS.
 * - Una sola fila por SKU (imposible duplicar: se agrupa por llave).
 * - STOCK = COMPRAS - VENTAS (puede ser negativo).
 * - Una compra posterior compensa el negativo automáticamente,
 *   porque el stock siempre es la resta total acumulada.
 * - Calcula costo promedio y valor del inventario.
 */
function recalcularInventario() {
  const compras = leerComoObjetos(SHEETS.COMPRAS);
  const ventas  = leerComoObjetos(SHEETS.VENTAS);
  const mapa = {}; // SKU -> acumulado

  const asegurar = (sku, r) => {
    if (!mapa[sku]) {
      mapa[sku] = {
        sku: sku,
        skuLegible: skuLegible(r.REFERENCIA, r.TALLA, r.COLOR),
        referencia: r.REFERENCIA || '',
        categoria: r.CATEGORIA || '',
        talla: r.TALLA || '',
        color: r.COLOR || '',
        forma: r.FORMA || '-',
        compras: 0, ventas: 0,
        costoTotal: 0, unidadesCosteadas: 0
      };
    }
    // completa datos faltantes si una fila posterior trae mejor información
    if (!mapa[sku].referencia && r.REFERENCIA) mapa[sku].referencia = r.REFERENCIA;
    return mapa[sku];
  };

  compras.forEach(r => {
    const sku = r.SKU || skuCanonico(r.REF_ID, r.TALLA, r.COLOR, r.FORMA);
    const m = asegurar(sku, r);
    const cant = Number(r.CANTIDAD) || 0;
    m.compras += cant;
    m.costoTotal += Number(r.TOTAL) || 0;
    m.unidadesCosteadas += cant;
  });

  ventas.forEach(r => {
    const sku = r.SKU || skuCanonico(r.REF_ID, r.TALLA, r.COLOR, r.FORMA);
    const m = asegurar(sku, r);
    m.ventas += Number(r.CANTIDAD) || 0;
  });

  // Escribir la tabla maestra completa (borra y reescribe = cero duplicados)
  const sh = ensureSheet(SHEETS.INVENTARIO);
  const filas = Object.values(mapa).map(m => {
    const stock = m.compras - m.ventas;
    const estado = stock < 0 ? 'PENDIENTE COMPRA'
                 : stock === 0 ? 'AGOTADO'
                 : stock <= 2 ? 'Crítico'
                 : stock <= 5 ? 'Bajo' : 'OK';
    const costoProm = m.unidadesCosteadas > 0 ? m.costoTotal / m.unidadesCosteadas : 0;
    return [
      m.sku, m.skuLegible, m.referencia, m.categoria, m.talla, m.color, m.forma,
      m.compras, m.ventas, stock, estado,
      Math.round(costoProm),
      Math.round(Math.max(stock, 0) * costoProm), // valor solo del stock físico
      new Date()
    ];
  });
  // ordena: negativos primero (lo urgente), luego por referencia
  filas.sort((a, b) => (a[9] - b[9]) || String(a[2]).localeCompare(String(b[2])));

  sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), HEADERS.INVENTARIO.length).clearContent();
  if (filas.length) sh.getRange(2, 1, filas.length, HEADERS.INVENTARIO.length).setValues(filas);

  actualizarDashboard(filas);
  return filas.length;
}

/**
 * Compatibilidad con el frontend actual: cuando la app envía su "foto"
 * del inventario, NO se confía en ella (puede venir de un localStorage
 * desactualizado). En su lugar se recalcula desde el libro mayor.
 * Respuesta idéntica a la esperada por la app.
 */
function sincronizarInventarioBatch(body) {
  const filas = recalcularInventario();
  return { status:'ok', msg:'Inventario recalculado desde Compras y Ventas', filas: filas };
}

// ------------------------------------------------------------
// 7. CREACIÓN AUTOMÁTICA DE PRODUCTOS
// ------------------------------------------------------------
function registrarProductoSiNoExiste(sku, it) {
  const sh = ensureSheet(SHEETS.PRODUCTOS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === sku) return false; // ya existe
  }
  sh.appendRow([
    sku,
    skuLegible(it.ref || it.REFERENCIA, it.talla || it.TALLA, it.color || it.COLOR),
    it.refId || '',
    it.ref || '',
    it.cat || '',
    it.talla || '',
    it.color || '',
    it.forma || '-',
    new Date()
  ]);
  return true; // creado automáticamente, sin intervención manual
}

// ------------------------------------------------------------
// 9. DASHBOARD DE INVENTARIO
// ------------------------------------------------------------
function actualizarDashboard(filasInventario) {
  const f = filasInventario; // [sku, skuLeg, ref, cat, talla, color, forma, compras, ventas, stock, estado, costoProm, valor, fecha]
  const tot = (idx) => f.reduce((s, r) => s + (Number(r[idx]) || 0), 0);
  const metricas = [
    ['Total de referencias (SKUs)',  f.length],
    ['Unidades compradas',           tot(7)],
    ['Unidades vendidas',            tot(8)],
    ['Stock disponible',             f.reduce((s, r) => s + Math.max(Number(r[9])||0, 0), 0)],
    ['Stock negativo (pendiente)',   f.reduce((s, r) => s + Math.min(Number(r[9])||0, 0), 0)],
    ['SKUs con stock negativo',      f.filter(r => Number(r[9]) < 0).length],
    ['Valor total del inventario',   tot(12)]
  ];
  const sh = ensureSheet(SHEETS.DASHBOARD);
  sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 3).clearContent();
  const ahora = new Date();
  sh.getRange(2, 1, metricas.length, 3).setValues(metricas.map(m => [m[0], m[1], ahora]));
}

function calcularDashboard() {
  return leerComoObjetos(SHEETS.DASHBOARD);
}

// ------------------------------------------------------------
// ABONOS (compatibles con la app)
// ------------------------------------------------------------
function guardarAbono(body) {
  const sh = ensureSheet(SHEETS.ABONOS);
  const data = sh.getDataRange().getValues();
  const totalAbonado = [body.abono1, body.abono2, body.abono3, body.abono4, body.abono5]
    .reduce((s, a) => s + (Number(a) || 0), 0);
  const fila = [
    body.ventaId || '', body.cliente || '', Number(body.totalVenta) || 0,
    body.fecha || hoy(),
    Number(body.abono1)||0, Number(body.abono2)||0, Number(body.abono3)||0,
    Number(body.abono4)||0, Number(body.abono5)||0,
    totalAbonado,
    (Number(body.totalVenta) || 0) - totalAbonado,
    body.observaciones || ''
  ];
  // upsert por VENTA_ID: actualiza la misma fila, nunca duplica
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.ventaId)) {
      sh.getRange(i + 1, 1, 1, fila.length).setValues([fila]);
      return { status:'ok', msg:'Abono actualizado' };
    }
  }
  sh.appendRow(fila);
  return { status:'ok', msg:'Abono guardado' };
}

function obtenerAbonos() {
  const abonos = leerComoObjetos(SHEETS.ABONOS).map(r => ({
    ventaId: r.VENTA_ID, cliente: r.CLIENTE, totalVenta: r.TOTAL_VENTA,
    fecha: r.FECHA,
    abono1: r.ABONO1, abono2: r.ABONO2, abono3: r.ABONO3,
    abono4: r.ABONO4, abono5: r.ABONO5,
    totalAbonado: r.TOTAL_ABONADO, saldo: r.SALDO,
    observaciones: r.OBSERVACIONES
  }));
  return { status:'ok', abonos: abonos };
}

// ------------------------------------------------------------
// COTIZACIONES (compatibles con la app)
// ------------------------------------------------------------
function guardarCotizacion(body) {
  const c = body.cotizacion || {};
  const items = c.items || [];
  const sh = ensureSheet(SHEETS.COTIZACIONES);
  const id = 'COT-' + Date.now();
  sh.appendRow([
    id,
    c.fecha || hoy(),
    c.cliente || '',
    c.telefono || '',
    c.documento || '',
    items.map(i => [i.descripcion || i.ref || '', i.talla || '', i.color || '', i.forma || ''].join('|')).join(' / '),
    items.map(i => i.qty != null ? i.qty : (i.cantidad || 1)).join(' / '),
    items.map(i => i.precio || 0).join(' / '),
    Number(c.total) || 0,
    'Pendiente',
    JSON.stringify(items)
  ]);
  return { status:'ok', id: id };
}

function convertirCotizacion(body) {
  const c = body.cotizacion || {};
  const items = c.items || [];
  const shV = ensureSheet(SHEETS.VENTAS);

  items.forEach(it => {
    const sku = skuCanonico(it.refId, it.talla, it.color, it.forma);
    registrarProductoSiNoExiste(sku, it);
    shV.appendRow([
      'V-' + Date.now() + '-' + Math.floor(Math.random()*1000),
      c.fecha || hoy(),
      sku,
      it.refId || '',
      it.descripcion || it.ref || '',
      it.categoria || it.cat || '',
      it.talla || '', it.color || '', it.forma || '-',
      Number(it.cantidad) || 1,
      Number(it.precio) || 0,
      (Number(it.precio) || 0) * (Number(it.cantidad) || 1),
      c.cliente || '', c.telefono || '', c.documento || '',
      '', 'Cotización ' + (body.cotizacionId || ''), 'Pendiente de pago', ''
    ]);
  });

  // marcar la cotización como convertida
  const shC = ensureSheet(SHEETS.COTIZACIONES);
  const data = shC.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.cotizacionId)) {
      shC.getRange(i + 1, 10).setValue('Convertida');
      break;
    }
  }

  recalcularInventario(); // la venta convertida también descuenta stock
  return { status:'ok', msg:'Cotizacion convertida en venta' };
}

// ------------------------------------------------------------
// OTRAS ACCIONES
// ------------------------------------------------------------
function actualizarEstadoPago(body) {
  const sh = ensureSheet(SHEETS.VENTAS);
  const data = sh.getDataRange().getValues();
  const colId = HEADERS.VENTAS.indexOf('ID');
  const colEstado = HEADERS.VENTAS.indexOf('ESTADO_PAGO');
  let n = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colId]) === String(body.ventaId || body.id)) {
      sh.getRange(i + 1, colEstado + 1).setValue(body.estado || body.estadoPago || '');
      n++;
    }
  }
  return n ? { status:'ok', msg:'Estado actualizado' } : { status:'error', msg:'Venta no encontrada' };
}

function sincronizarResultados(body) {
  const sh = ensureSheet(SHEETS.RESULTADOS);
  sh.appendRow([new Date(), JSON.stringify(body)]);
  return { status:'ok' };
}

// ------------------------------------------------------------
// UTILIDADES
// ------------------------------------------------------------
function hoy() { return new Date().toISOString().split('T')[0]; }

/** Crea la hoja con sus encabezados si no existe; sana encabezados vacíos. */
function ensureSheet(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, HEADERS[nombre].length).setValues([HEADERS[nombre]])
      .setFontWeight('bold');
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS[nombre].length).setValues([HEADERS[nombre]])
      .setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Lee una hoja como lista de objetos {ENCABEZADO: valor}. */
function leerComoObjetos(nombre) {
  const sh = ensureSheet(nombre);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1)
    .filter(row => row.some(c => c !== '' && c != null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
      return obj;
    });
}

/**
 * UTILIDAD DE MIGRACIÓN — ejecutar UNA VEZ manualmente desde el editor:
 * Recalcula todo el inventario desde las hojas COMPRAS y VENTAS actuales
 * y elimina cualquier duplicado existente.
 */
function MIGRAR_recalcularTodo() {
  const filas = recalcularInventario();
  Logger.log('Inventario reconstruido: ' + filas + ' SKUs únicos.');
}
