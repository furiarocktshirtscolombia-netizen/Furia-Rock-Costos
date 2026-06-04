import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// v1.4 - Fixes: PDF unit price, cotizacion total calculation
// ══ DATOS REALES DEL SPREADSHEET FURIA ROCK ══════════════════════════
const REFS_DEFAULT: Ref[] = [
  { id:"r1",  name:"CAMISETA ALGODON PERUANO 178G",           cost:18000, cat:"Adulto" },
  { id:"r2",  name:"CAMISETA ALGODON PERUANO 320G",           cost:37000, cat:"Adulto" },
  { id:"r3",  name:"CAMISETA ALGODON PERUANO 270G",           cost:33000, cat:"Adulto" },
  { id:"r4",  name:"CAMISETA CATAR",                          cost:37000, cat:"Adulto" },
  { id:"r5",  name:"CAMISETA C4 ALGODON NACIONAL 200G",       cost:19000, cat:"Adulto" },
  { id:"r6",  name:"HOODIE PERUANO 400G",                     cost:82000, cat:"Adulto" },
  { id:"r7",  name:"CAMISETA NINO ALGODON PERUANO 200G",      cost:24000, chat:"Nino"   },
  { id:"r8",  name:"CAMISETA NINO NACIONAL 200G",             cost:14000, cat:"Nino"   },
  { id:"r9",  name:"CAMISETA ACID WASH NINO",                 cost:18000, cath:"Nino"   },
  { id:"r10", name:"BERMUDA NINO ALGODON PERCHADO",           cost:13500, cat:"Nino"   },
  { id:"r11", name:"SUDADERA NINOS ALGODON PERCHADO",         cost:19000, cat:"Nino"   },
  { id:"r12", name:"CONJUNTO NINO CAMISETA PERUANO + BERMUDA",cost:37500, cat:"Nino"   },
  { id:"r13", name:"CONJUNTO NINO CAMISETA NACIONAL + BERMUDA",cost:27500,cat:"Nino"   },
  { id:"r14", name:"CONJUNTO NINO CAMISETA PERUANO + JOGGER", cost:43000, cat:"Nino"   },
  { id:"r15", name:"CONJUNTO NINO CAMISETA NACIONAL + JOGGER",cost:33000, cat:"Nino"   },
]

const COLORES_DEFAULT  = ["NEGRO","BLANCO","VERDE PINO","VERDE NACIONAL","AZUL CIELO","ROJO","GRIS","AZUL MARINO","ROSADO","MOSTAZA","VAINILLA"];
const TALLAS_ADULTO    = ["XS","S","M","L","XL","XXL"];
const TALLAS_NINO      = ["0-2","2-4","4-6","6-8","8-10","10-12","12-14","14-16"];
const TODAS_TALLAS     = [...TALLAS_ADULTO, ...TALLAS_NINO];
const TIPOS_IMP        = ["DTF","DTG","Bordado"];
const SEDES            = ["Medellin","Bogota","Cali","Online","Otra"];
const FORMAS_CAMISETA  = ["Oversize","Regular Fit"];

// Helper: detectar si una referencia es de Niño (acepta "Nino","niño","nino","Niño",etc.)
const esNino = (cat: string) =>
  cat.toLowerCase().replace(/[^a-z]/g,'').includes('nin');

// COSTOS FIJOS DE PRODUCCION
const GANANCIA_NETA_FIJA = 30000;
const DTF_POR_CM2        = 170;
const COSTO_EMPAQUE      = 1500;
const COSTO_PLANCHADA    = 1000;
const MARGEN_PCT     = 0.53; // Margen de ganancia estandar (53%)
const MARGEN_PCT_ALT = 0.55; // Margen de ganancia alternativo (55%)
const MARGEN_47      = 0.47; // Margen de ganancia 47%
const MARGEN_45      = 0.45; // Margen de ganancia 45%
const MARGEN_40      = 0.40; // Margen de ganancia 40%

const GAS_URL = 'https://script.google.com/macros/s/AKfycby9m-yDkajrDZyINyGjsrWW_Efu48IbI9GtjOpU0aIsO_uZsMppobAnIx8hIRU1yYsd/exec';

// ─── Types ────────────────────────────────────────────────────────────
interface Ref  { id:string; name:string; cost:number; cat:string }
interface Item { ref:string; refId:string; cat:string; talla:string; color:string; forma:string; comprado:number; vendido:number; stock:number; estado:string }
interface Venta {
  id:string; fecha:string; cliente:string; ref:string; refId:string;
  talla:string; color:string; cantidad:number; cat:string;
  precio:number; totalVenta:number; costo:number; ganancia:number;
  tipoImp:string; diseno:string; sede:string; forma:string;
  telefono:string; documento:string; direccion:string; ordenInterna:string;
  estadoPago?: string;
}
interface Compra {
  id:string; fecha:string; refId:string; ref:string; cat:string;
  color:string; talla:string; cantidad:number; precio:number; total:number;
  proveedor:string; notas:string; forma:string;
}
interface Calc { costo:number; ganancia:number; precio:number }
interface Abono {
  id: string;
  ventaId: string;
  cliente: string;
  totalVenta: number;
  fecha: string;
  abono1: number; abono2: number; abono3: number; abono4: number; abono5: number;
  totalAbonado: number;
  saldoPendiente: number;
  estado: string;
  observaciones: string;
}
type Tab = 'cotizador'|'ventas'|'compras'|'inventario'|'dashboard'|'cuenta'|'cotizaciones'|'abonos'|'abonos';

// ─── Helpers ──────────────────────────────────────────────────────────
const sendToGAS = async (body: object) => {
  const r = await fetch(GAS_URL, {
    method:'POST', redirect:'follow',
    body: JSON.stringify(body)
  });
  return r.json();
};

const calcInventario = (ventas: Venta[], compras: Compra[], refsList: Ref[] = []) => {
  const resolveRef = (ref: string, refId: string): string => {
    if (ref && ref.length > 3 && !/^r\d+$/.test(ref)) return ref;
    const found = refsList.find(r => r.id === refId || r.name === ref);
    return found ? found.name : (ref || refId || '-');
  };
  const map: Record<string, Item> = {};
  compras.forEach(c => {
    const k = `${c.refId}|${c.talla}|${c.color}|${c.forma || '_'}`;
    if (!map[k]) map[k] = { ref: resolveRef(c.ref, c.refId), refId: c.refId, cat: c.cat, talla: c.talla, color: c.color, forma: c.forma || '-', comprado: 0, vendido: 0, stock: 0, estado: '' };
    map[k].comprado += c.cantidad;
  });
  ventas.forEach(v => {
    const k = `${v.refId}|${v.talla}|${v.color}|${v.forma || '_'}`;
    if (!map[k]) map[k] = { ref: resolveRef(v.ref, v.refId), refId: v.refId, cat: v.cat, talla: v.talla, color: v.color, forma: v.forma || '-', comprado: 0, vendido: 0, stock: 0, estado: '' };
    map[k].vendido += v.cantidad;
  });
  Object.values(map).forEach(i => {
    i.stock = i.comprado - i.vendido;
    i.estado = i.stock > 5 ? 'OK' : i.stock > 2 ? 'Bajo' : 'Crítico';
    if (!i.ref || i.ref === '-' || /^r\d+$/.test(i.ref)) {
      const found = refsList.find(r => r.id === i.refId);
      if (found) i.ref = found.name;
    }
  });
  return Object.values(map);
};
const cop  = (n:number) => '$' + Math.round(n).toLocaleString('es-CO');
const today = () => new Date().toISOString().split('T')[0];
const uid   = () => Date.now().toString();

const calcPrice = (ref: Ref, qty: number, tipoImp: string, cmDTF: number, numPlanchadas: number, costoDTG: number, costoBordado: number, margen: number = MARGEN_PCT): Calc => {
  const base       = ref.cost;
  const empaque    = COSTO_EMPAQUE;
  let impresion    = 0;
  if (tipoImp === 'DTF') impresion = cmDTF * DTF_POR_CM2 + numPlanchadas * COSTO_PLANCHADA;
  if (tipoImp === 'DTG') impresion = costoDTG;
  if (tipoImp === 'Bordado') impresion = costoBordado;
  const costoUnit  = base + empaque + impresion;
  const precioUnit    = Math.round(costoUnit / (1 - margen));
  const gananciaUnit = precioUnit - costoUnit;
  return { costo: costoUnit * qty, ganancia: gananciaUnit * qty, precio: precioUnit * qty };
};

const loadLS = <T,>(key:string, def:T): T => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
};
const exportCSV = (rows: object[], name:string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? '')).join(','))].join('\n');
  const a    = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = name + '.csv';
  a.click();
};

// ─── UI Atoms ─────────────────────────────────────────────────────────
const Card = ({children,className=''}:{children:React.ReactNode;className?:string}) => (
  <div className={`bg-gray-800 rounded-xl p-4 ${className}`}>{children}</div>
);
const CardTitle = ({text}:{text:string}) => (
  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">{text}</h2>
);
const FG = ({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);
const Inp = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 ${p.className??''}`}/>
);
const Sel = (p: React.SelectHTMLAttributes<HTMLSelectElement> & {options:string[]}) => (
  <select {...p} className={`w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 ${p.className??''}`}>
    <option value="">- Selecciona -</option>
    {p.options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);
const Btn = ({children,onClick,variant='primary',disabled=false,className=''}:{children:React.ReactNode;onClick?:()=>void;variant?:'primary'|'danger'|'secondary';disabled?:boolean;className?:string}) => {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40';
  const v = variant==='primary'?'bg-indigo-600 hover:bg-indigo-700 text-white':variant==='danger'?'bg-red-600 hover:bg-red-700 text-white':'bg-gray-700 hover:bg-gray-600 text-gray-200';
  return <button onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>{children}</button>;
};
const Badge = ({text,color}:{text:string;color:'green'|'yellow'|'red'}) => {
  const c = color==='green'?'bg-green-900 text-green-300':color==='yellow'?'bg-yellow-900 text-yellow-300':'bg-red-900 text-red-300';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c}`}>{text}</span>;
};

// ─── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState<Tab>('cotizador');
  const [refs, setRefs]         = useState<Ref[]>(REFS_DEFAULT);
  const [colorMap, setColorMap] = useState<Record<string,string[]>>(() => loadLS('colorMap', {}));
  const [coloresDrive, setColoresDrive] = useState<string[]>(() => loadLS('coloresDrive', []));
  const [ventas, setVentas]     = useState<Venta[]>([]);  const [searchVentas, setSearchVentas] = useState('');
  const [filterEstadoVentas, setFilterEstadoVentas] = useState('');

  // ── Filtro Global de Fecha ─────────────────────────────
  const [fechaInicio,      setFechaInicio]      = useState('');
  const [fechaFin,         setFechaFin]         = useState('');
  const [filtroModo,       setFiltroModo]       = useState<'rango'|'mes'|'dia'>('rango');
  const [filtroMes,        setFiltroMes]        = useState(''); // formato: 2026-05
  const [filtroDia,        setFiltroDia]        = useState(''); // formato: 2026-05-25

  const [compras, setCompras]   = useState<Compra[]>([]);

  const [invDrive, setInvDrive] = useState<any[]>([]);  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');

  // Cotizador
  const [selRef,        setSelRef]        = useState('');
  const [selColor,      setSelColor]      = useState('');
  const [selTalla,      setSelTalla]      = useState('');
  const [selQty,        setSelQty]        = useState(1);
  const [selTipoImp,    setSelTipoImp]    = useState('DTF');
  const [selMargenPct,  setSelMargenPct]  = useState<number>(MARGEN_PCT);
  const [selForma,      setSelForma]      = useState('');
  const [cmDTF,         setCmDTF]         = useState(100);
  const [numPlanchadas, setNumPlanchadas] = useState(3);
  const [costoDTG,      setCostoDTG]      = useState(0);
  const [costoBordado, setCostoBordado] = useState(0);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTel,    setClienteTel]    = useState('');
  const [clienteDoc,    setClienteDoc]    = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteSede,   setClienteSede]   = useState('');
  const [clienteDiseno, setClienteDiseno] = useState('');
  const [clienteOrden,  setClienteOrden]  = useState('');
  const [clienteEstadoPago, setClienteEstadoPago] = useState('Pendiente de pago');
  const [gasErr,        setGasErr]        = useState('');
  const [cartItems, setCartItems] = useState<{ref:string; refId:string; cat:string; color:string; talla:string; forma:string; qty:number; precio:number; costo:number}[]>([]);

  // Compras
  const [cRef,    setCRef]    = useState('');
  const [cColor,  setCColor]  = useState('');
  const [cTalla,  setCTalla]  = useState('');
  const [cQty,    setCQty]    = useState(1);
  const [cPrecio, setCPrecio] = useState(0);
  const [cProv,   setCProv]   = useState('');
  const [cNotas,  setCNotas]  = useState('');
  const [cForma,  setCForma]  = useState('');
  const [cartCompras, setCartCompras] = useState<any[]>([]);
  const [facturaCompraId, setFacturaCompraId] = useState<string>('FC-' + Date.now());

  // Cuenta de Cobro
  const [ccId,     setCcId]     = useState('');
  const [ccData,   setCcData]   = useState<any>(null);
  const [ccStatus, setCcStatus] = useState<'idle'|'loading'|'found'|'not_found'|'error'>('idle');
  const [ccMsg,    setCcMsg]    = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    fetch(GAS_URL)
      .then(r => r.json())
      .then(d => {
        // ── REFS: normalize any column naming convention from Drive ──
        if (d.refs && Array.isArray(d.refs) && d.refs.length > 0) {
          const normalizedRefs = d.refs
            .map((r: any, i: number) => {
              const name = String(
                r.name || r.REFERENCIAS || r.Referencia || r.referencia ||
                r.Nombre || r.nombre || r.Name || r.REF || r.ref || ''
              ).trim();
              const cost = Number(
                String(r.cost || r.PRECIOS || r.Precio || r.precio || r.costo || r.Costo || 0)
                  .replace(/[^0-9.]/g, '')
              ) || 0;
              const cat = String(
                r.cat || r.Categoria || r.categoria || r.CAT || 'Adulto'
              ).trim();
              const id = String(
                r.id || r.ID || r.codigo || r.Codigo || ('r' + (i + 1))
              ).trim();
              return name ? { id, name, cost, cat } : null;
            })
            .filter(Boolean) as Ref[];

          if (normalizedRefs.length > 0) {
            setRefs(normalizedRefs);
            localStorage.setItem('refs', JSON.stringify(normalizedRefs));
          }
          // If all names were empty, keep REFS_DEFAULT (don't overwrite)
        }

        if (d.colorMap) {
          setColorMap(d.colorMap);
          localStorage.setItem('colorMap', JSON.stringify(d.colorMap));
        }
        if (d.colores && Array.isArray(d.colores) && d.colores.length > 0) {
          setColoresDrive(d.colores);
          localStorage.setItem('coloresDrive', JSON.stringify(d.colores));
        }
        if (d.ventas && d.ventas.length) {
          setVentas(d.ventas);
          localStorage.setItem('ventas', JSON.stringify(d.ventas));
        }
        if (d.compras && d.compras.length) {
          setCompras(d.compras);
          localStorage.setItem('compras', JSON.stringify(d.compras));
        }
        if (d.inventario && d.inventario.length) {
          setInvDrive(d.inventario);
          localStorage.setItem('invDrive', JSON.stringify(d.inventario));
        }
      })
      .catch(() => {});
  }, [])

  // Derived
  const currentRef   = refs.find(r => r.id === selRef);
  const COLORES_ACTIVOS = coloresDrive.length > 0 ? coloresDrive : COLORES_DEFAULT;
  const coloresDisp  = currentRef ? (colorMap[currentRef.name] || COLORES_ACTIVOS) : COLORES_ACTIVOS;
  // Tallas: si la referencia es de niño → tallas niño; adulto → tallas adulto
  // Se usa esNino() para que funcione con cualquier variante del texto (Nino, niño, Niño, nino)
  const tallasDisp   = currentRef
    ? (esNino(currentRef.cat) ? TALLAS_NINO : TALLAS_ADULTO)
    : TODAS_TALLAS;
  const calc         = currentRef ? calcPrice(currentRef, selQty, selTipoImp, cmDTF, numPlanchadas, costoDTG, costoBordado, selMargenPct) : null;
  const inventario   = useMemo(() => calcInventario(ventas, compras, refs), [ventas, compras, refs]);

  // Compras: ref seleccionada y sus colores disponibles
  const cCurrentRef = refs.find(r => r.id === cRef);
  const cColoresDisp = cCurrentRef ? (colorMap[cCurrentRef.name] || COLORES_ACTIVOS) : COLORES_ACTIVOS;


  // Use Drive inventario when available, fall back to computed
  const displayInventario = useMemo(() => {
    if (invDrive && invDrive.length > 0) {
      return invDrive.map((i: any) => {
        // Resolve ref name: invDrive has 'referencia' field
        let refName = i.referencia || i.ref || '';
        if (!refName || /^rd+$/.test(refName)) {
          // Try to match by cross-referencing compras/ventas
          const fromCompras = compras.find(c => c.talla === i.talla && c.color === i.color && c.forma === i.forma);
          const fromVentas = ventas.find(v => v.talla === i.talla && v.color === i.color && v.forma === i.forma);
          const refId = fromCompras?.refId || fromVentas?.refId || '';
          if (refId) {
            const found = refs.find(r => r.id === refId);
            if (found) refName = found.name;
          }
        }
        return {
          ref: refName || '-',
          cat: i.cat || i.cat || '',
          talla: i.talla || '',
          color: i.color || '',
          forma: i.forma || '-',
          comprado: Number(i.comprado || 0),
          vendido: Number(i.vendido || 0),
          stock: Number(i.stock || 0),
          estado: i.estado || (Number(i.stock || 0) > 5 ? 'OK' : Number(i.stock || 0) > 2 ? 'Bajo' : 'Crítico'),
        };
      });
    }
    return inventario;
  }, [invDrive, inventario, refs, compras, ventas]);

  // ── Helpers de Filtro por Fecha ─────────────────────────
  const inDateRange = (fecha: string): boolean => {
    if (!fecha) return true;
    if (filtroModo === 'dia' && filtroDia) return fecha.startsWith(filtroDia);
    if (filtroModo === 'mes' && filtroMes) return fecha.startsWith(filtroMes);
    if (filtroModo === 'rango') {
      if (fechaInicio && fecha < fechaInicio) return false;
      if (fechaFin   && fecha > fechaFin)   return false;
    }
    return true;
  };
  const hasFiltroFecha = filtroModo === 'dia' ? !!filtroDia : filtroModo === 'mes' ? !!filtroMes : !!(fechaInicio || fechaFin);
  const ventasFiltradas  = ventas.filter(v => {
    const passDate = !hasFiltroFecha || inDateRange(v.fecha);
    const passEstado = !filterEstadoVentas || ((v.estadoPago || 'Pendiente') === filterEstadoVentas || (v.estadoPago?.toLowerCase() === filterEstadoVentas.toLowerCase()));
    const qv = searchVentas.toLowerCase().trim();
    const passSearch = !qv || (v.cliente||'').toLowerCase().includes(qv) || String(v.id||'').toLowerCase().includes(qv) || (v.ref||'').toLowerCase().includes(qv) || (v.documento||'').toLowerCase().includes(qv) || (v.telefono||'').toLowerCase().includes(qv);
    return passDate && passEstado && passSearch;
  });
  const ventasDashboard = ventas.filter(v => !hasFiltroFecha || inDateRange(v.fecha));
  const comprasFiltradas = hasFiltroFecha ? compras.filter(c => inDateRange(c.fecha)) : compras;
  const stockTotal = displayInventario.reduce((a, i) => a + Math.max(0, i.stock), 0);
  const inventarioValorizado = displayInventario.reduce((a, i) => a + Math.max(0, i.stock) * (compras.filter(c => c.ref === (i.ref || i.referencia)).slice(-1)[0]?.precio || 0), 0);
  const totalComprasGlobal = compras.reduce((a, c) => a + (c.total || 0), 0);

  const sincrResultados = async (v: Venta[], c: Compra[], inv: Item[]) => {
    const totalVentas   = v.reduce((a,x)=>a+x.totalVenta,0);
    const costoVentas   = v.reduce((a,x)=>a+x.costo,0);
    const gananciaVentas= v.reduce((a,x)=>a+x.ganancia,0);
    const totalCompras  = c.reduce((a,x)=>a+x.total,0);
    const enStock       = inv.filter(i=>i.stock>0).length;
    const enNegativo    = inv.filter(i=>i.stock<0).length;
    const pctMargen     = totalVentas>0 ? ((gananciaVentas/totalVentas)*100).toFixed(2) : '0';
    const pctROI        = costoVentas>0 ? ((gananciaVentas/costoVentas)*100).toFixed(2) : '0';
    await sendToGAS({
      action: 'sincronizarResultados',
      ventas:    { unidades: v.reduce((a,x)=>a+x.cantidad,0), ingresos: totalVentas, costo: costoVentas, ganancia: gananciaVentas },      estadoPago: row['Estado de Pago'] || row['estadoPago'] || '',

      compras:   { unidades: c.reduce((a,x)=>a+x.cantidad,0), invertido: totalCompras },
      inventario:{ enStock, enNegativo },
      margen:    { pct: pctMargen, roi: pctROI }
    });
  };

  const agregarItem = () => {
    if (!currentRef || !selColor || !selTalla) { showToast('Completa todos los campos del ítem'); return; }
    if (!calc) { showToast('No hay precio calculado'); return; }
    const item = {
      ref: currentRef.name, refId: currentRef.id, cat: currentRef.cat,
      color: selColor, talla: selTalla, forma: selForma,
      qty: selQty, precio: calc!.precio, costo: calc!.costo,
    };
    setCartItems(prev => [...prev, item]);
    setSelRef(''); setSelColor(''); setSelTalla(''); setSelQty(1);
    setSelTipoImp('DTF'); setCmDTF(100); setNumPlanchadas(3); setCostoDTG(0); setCostoBordado(0);
    setSelForma('');
    showToast('Ítem agregado ✓');
  };

  const generarCotizacionPDF = async () => {
    if (cartItems.length === 0) { showToast('Agrega al menos un ítem para generar el PDF'); return; }

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ml = 18, mr = 18;
    const contentW = pageW - ml - mr;
    const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const cotizId = 'COT-' + Date.now().toString().slice(-8);

    // Header background
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageW, 42, 'F');
    pdf.setFillColor(99, 102, 241);
    pdf.rect(0, 0, 5, 42, 'F');

    // Company name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FURIA ROCK', ml + 2, 17);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text('Camisetas & Diseño Personalizado', ml + 2, 24);

    // Document type (right)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(199, 210, 254);
    pdf.text('COTIZACIÓN', pageW - mr, 17, { align: 'right' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text('No. ' + cotizId, pageW - mr, 24, { align: 'right' });
    pdf.text('Fecha: ' + fecha, pageW - mr, 30, { align: 'right' });

    // Client section
    const clienteY = 52;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(ml, clienteY - 6, contentW, 34, 2, 2, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('INFORMACIÓN DEL CLIENTE', ml + 4, clienteY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10);
    pdf.text(clienteNombre || 'Cliente no especificado', ml + 4, clienteY + 8);
    const col2X = ml + contentW / 2;
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    let infoY = clienteY + 15;
    if (clienteTel) pdf.text('Tel: ' + clienteTel, ml + 4, infoY);
    if (clienteDoc) pdf.text('Doc: ' + clienteDoc, col2X, infoY);
    infoY += 6;
    if (clienteDireccion) pdf.text('Dir: ' + clienteDireccion, ml + 4, infoY);
    if (clienteSede) pdf.text('Sede: ' + clienteSede, col2X, infoY);

    // Products table
    const tableY = clienteY + 38;
    const tableData = cartItems.map((item, i) => [
      String(i + 1), item.ref, item.color, item.talla, item.forma || '-',
      String(item.qty), cop(item.qty > 0 ? item.precio / item.qty : 0), cop(item.precio),
    ]);
    const total = cartItems.reduce((s, i) => s + i.precio, 0);

    (pdf as any).autoTable({
      startY: tableY,
      head: [['#', 'REFERENCIA', 'COLOR', 'TALLA', 'FORMA', 'CANT', 'P. UNIT', 'SUBTOTAL']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'TOTAL GENERAL', cop(total)]],
      theme: 'plain',
      headStyles: { fillColor: [15, 23, 42], textColor: [199, 210, 254], fontSize: 7.5, fontStyle: 'bold', cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      footStyles: { fillColor: [238, 242, 255], textColor: [67, 56, 202], fontSize: 10, fontStyle: 'bold', cellPadding: { top: 5, bottom: 5, left: 3, right: 3 } },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59], cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 52 },
        2: { cellWidth: 22 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 24, halign: 'right' },
        7: { cellWidth: 26, halign: 'right' },
      },
      margin: { left: ml, right: mr },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
      didDrawPage: (data: any) => {
        const footY = pageH - 12;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(ml, footY - 4, pageW - mr, footY - 4);
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text('FURIA ROCK ÃÂ· Camisetas & Diseño Personalizado', ml, footY);
        pdf.text('Cotización sin valor fiscal. Precios en COP.', pageW / 2, footY, { align: 'center' });
        pdf.text('Pág. ' + data.pageNumber, pageW - mr, footY, { align: 'right' });
      },
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    if (finalY < pageH - 45) {
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONDICIONES:', ml, finalY);
      pdf.setFont('helvetica', 'normal');
      pdf.text('ÃÂ· Esta cotización tiene vigencia de 5 días hábiles.', ml, finalY + 5);
      pdf.text('ÃÂ· Los precios están sujetos a cambios sin previo aviso.', ml, finalY + 10);
      pdf.text('ÃÂ· Para confirmar el pedido se requiere abono del 50%.', ml, finalY + 15);
    }


    // ── Información de Pago ──────────────────────────────────────
    const bx = ml;
    const bw = pageW - ml - ml;
    const qrSize = 28;
    const bankH = 32;
    const bankYStart = Math.min(finalY + 26, pageH - bankH - 8);

    // Fondo del bloque
    pdf.setFillColor(12, 20, 38);
    pdf.roundedRect(bx, bankYStart, bw, bankH, 2.5, 2.5, 'F');
    // Barra lateral izquierda (indigo)
    pdf.setFillColor(99, 102, 241);
    pdf.roundedRect(bx, bankYStart, 3.5, bankH, 1.5, 1.5, 'F');

    // Encabezado
    const tx = bx + 10;
    pdf.setFontSize(6.5);
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.text('INFORMACION DE PAGO', tx, bankYStart + 6);

    // Titular
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Mariluz Lopez', tx, bankYStart + 13);

    // Banco + tipo de cuenta
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Bancolombia  -  Cuenta de Ahorros', tx, bankYStart + 19);

    // Numero de cuenta
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(99, 244, 200);
    pdf.text('13848930681', tx, bankYStart + 25);

    // Nequi
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(167, 139, 250);
    pdf.text('@mariluz3523', tx, bankYStart + 31);

    // QR de pago
    try {
      const qrResp = await fetch('/qr_pago.png');
      if (qrResp.ok) {
        const qrBlob = await qrResp.blob();
        const qrDataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(qrBlob);
        });
        const qrX = bx + bw - qrSize - 3;
        const qrY = bankYStart + 2;
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, 'F');
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }
    } catch (_e) { /* QR no disponible */ }

    const today2 = new Date().toISOString().split('T')[0];
    pdf.save('Cotizacion_FuriaRock_' + (clienteNombre || 'cliente').replace(/\s+/g, '_') + '_' + today2 + '.pdf');
    showToast('✅ PDF descargado correctamente');
  };

  
  const generarCuentaCobroPDF = async ({ clienteNom, clienteFon, clienteDoc2, clienteDir, clienteS, fecha, idVenta, totalGeneral, ccData }: any) => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ml = 18, mr = 18;
    const contentW = pageW - ml - mr;

    // Header
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageW, 42, 'F');
    pdf.setFillColor(16, 185, 129); // green-500
    pdf.rect(0, 0, 5, 42, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FURIA ROCK', ml + 2, 17);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text('Camisetas & Diseño Personalizado', ml + 2, 24);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(167, 243, 208); // green-200
    pdf.text('CUENTA DE COBRO', pageW - mr, 17, { align: 'right' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text('ID: ' + idVenta, pageW - mr, 24, { align: 'right' });
    pdf.text('Fecha: ' + fecha, pageW - mr, 30, { align: 'right' });

    // Client section
    const clienteY = 52;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(ml, clienteY - 6, contentW, 34, 2, 2, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('DATOS DEL CLIENTE', ml + 4, clienteY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10);
    pdf.text(clienteNom || 'Cliente no especificado', ml + 4, clienteY + 8);
    const col2X = ml + contentW / 2;
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    let infoY = clienteY + 15;
    if (clienteFon) pdf.text('Tel: ' + clienteFon, ml + 4, infoY);
    if (clienteDoc2) pdf.text('Doc: ' + clienteDoc2, col2X, infoY);
    infoY += 6;
    if (clienteDir) pdf.text('Dir: ' + clienteDir, ml + 4, infoY);
    if (clienteS) pdf.text('Sede: ' + clienteS, col2X, infoY);

    // Items table
    const tableY = clienteY + 38;
    const tableData = (ccData || []).map((row: any, i: number) => {
      const refName = row.Referencia || row.referencia || row.ref || '-';
      const colorV = row.Color || row.color || '-';
      const tallaV = row.Talla || row.talla || '-';
      const formaV = row.Forma || row.forma || '-';
      const cantV = row.Cantidad || row.cantidad || '-';
      const precioV = Number(String(row['Precio Unit.'] || row.precioUnit || 0).replace(/[^0-9.]/g, ''));
      const totalV = Number(String(row['Total Venta'] || row.totalVenta || 0).replace(/[^0-9.]/g, ''));
      return [String(i + 1), refName, colorV, tallaV, formaV, String(cantV), cop(precioV > 0 ? precioV : (cantV > 0 ? totalV / cantV : 0)), cop(totalV)];
    });

    (pdf as any).autoTable({
      startY: tableY,
      head: [['#', 'REFERENCIA', 'COLOR', 'TALLA', 'FORMA', 'CANT', 'P. UNIT', 'TOTAL']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'TOTAL GENERAL', cop(totalGeneral)]],
      theme: 'plain',
      headStyles: { fillColor: [15, 23, 42], textColor: [167, 243, 208], fontSize: 7.5, fontStyle: 'bold', cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      footStyles: { fillColor: [236, 253, 245], textColor: [6, 95, 70], fontSize: 10, fontStyle: 'bold', cellPadding: { top: 5, bottom: 5, left: 3, right: 3 } },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59], cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 52 },
        2: { cellWidth: 22 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 24, halign: 'right' },
        7: { cellWidth: 26, halign: 'right' },
      },
      margin: { left: ml, right: mr },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
      didDrawPage: (data: any) => {
        const footY = pageH - 12;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(ml, footY - 4, pageW - mr, footY - 4);
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text('FURIA ROCK ÃÂ· Camisetas & Diseño Personalizado', ml, footY);
        pdf.text('Cuenta de Cobro ÃÂ· ID: ' + idVenta, pageW / 2, footY, { align: 'center' });
        pdf.text('Pág. ' + data.pageNumber, pageW - mr, footY, { align: 'right' });
      },
    });


  // ── Información de Pago ──────────────────────────────────────
  const bx2 = ml;
  const bw2 = pageW - ml - mr;
  const qrSize2 = 28;
  const bankH2 = 32;
  const bankYStart2 = pageH - bankH2 - 10;

  // Fondo del bloque
  pdf.setFillColor(12, 20, 38);
  pdf.roundedRect(bx2, bankYStart2, bw2, bankH2, 2.5, 2.5, 'F');
  // Barra lateral izquierda (indigo)
  pdf.setFillColor(99, 102, 241);
  pdf.roundedRect(bx2, bankYStart2, 3.5, bankH2, 1.5, 1.5, 'F');

  // Encabezado
  const tx2 = bx2 + 10;
  pdf.setFontSize(6.5);
  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.text('INFORMACION DE PAGO', tx2, bankYStart2 + 6);

  // Titular
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Mariluz Lopez', tx2, bankYStart2 + 13);

  // Banco + tipo de cuenta
  pdf.setFontSize(7.5);
  pdf.setTextColor(203, 213, 225);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Bancolombia  -  Cuenta de Ahorros', tx2, bankYStart2 + 19);

  // Numero de cuenta
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(99, 244, 200);
  pdf.text('13848930681', tx2, bankYStart2 + 25);

  // Nequi
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(167, 139, 250);
  pdf.text('@mariluz3523', tx2, bankYStart2 + 31);

  // QR de pago
  try {
    const qrResp2 = await fetch('/qr_pago.png');
    if (qrResp2.ok) {
      const qrBlob2 = await qrResp2.blob();
      const qrDataUrl2 = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(qrBlob2);
      });
      const qrX2 = bx2 + bw2 - qrSize2 - 3;
      const qrY2 = bankYStart2 + 2;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(qrX2 - 1, qrY2 - 1, qrSize2 + 2, qrSize2 + 2, 1, 1, 'F');
      pdf.addImage(qrDataUrl2, 'PNG', qrX2, qrY2, qrSize2, qrSize2);
    }
  } catch (_e) { /* QR no disponible */ }

    pdf.save('CuentaCobro_FuriaRock_' + idVenta + '.pdf');
  };

  const registrarVenta = async () => {
    if (cartItems.length === 0) { showToast('Agrega al menos un ítem al pedido'); return; }
    setLoading(true); setGasErr('');
    const nuevasVentas = [...ventas];
    for (const item of cartItems) {
      const v: Venta = {
        id: uid(), fecha: today(), cliente: clienteNombre,
        ref: item.ref, refId: item.refId,
        talla: item.talla, color: item.color, cantidad: item.qty,
        cat: item.cat, precio: item.precio / item.qty,
        totalVenta: item.precio, costo: item.costo,
        ganancia: item.precio - item.costo,
        tipoImp: selTipoImp, diseno: clienteDiseno, sede: clienteSede,
        forma: item.forma,
        telefono: clienteTel, documento: clienteDoc,
        direccion: clienteDireccion, ordenInterna: clienteOrden,
        estadoPago: clienteEstadoPago
      };
      nuevasVentas.unshift(v);
      try {
        const res = await sendToGAS({ action:'guardarVenta', ...v });
        if (res.status !== 'ok') { setGasErr('Error Drive: ' + res.msg); }
      } catch(e) { setGasErr('Sin conexion Drive'); }
    }
    const nuevoInv = calcInventario(nuevasVentas, compras);
    try {
      await sendToGAS({ action:'sincronizarInventarioBatch', rows: nuevoInv });
      await sincrResultados(nuevasVentas, compras, nuevoInv);
    } catch {}
    setVentas(nuevasVentas);
    localStorage.setItem('ventas', JSON.stringify(nuevasVentas));
    setCartItems([]);
    setClienteNombre(''); setClienteTel(''); setClienteDoc('');
    setClienteDireccion(''); setClienteSede(''); setClienteDiseno(''); setClienteOrden(''); setClienteEstadoPago('Pendiente de pago');
    showToast('Pedido registrado ✓');
    setLoading(false);
  };

  const agregarAlCarritoCompra = () => {
    const r = refs.find(x => x.id === cRef);
    const esAccesorio = r?.cat === 'Accesorio';
    if (!r || (!esAccesorio && (!cColor || !cTalla)) || cQty < 1 || cPrecio <= 0) { showToast('Completa todos los campos'); return; }
    const item = {
      id: uid(), fecha: today(), refId: r.id, ref: r.name, cat: r.cat,
      color: cColor, talla: cTalla, cantidad: cQty,
      precio: cPrecio, total: cPrecio * cQty,
      proveedor: cProv, notas: cNotas, forma: cForma
    };
    setCartCompras(prev => [...prev, item]);
    setCRef(''); setCColor(''); setCTalla(''); setCQty(1); setCPrecio(0); setCNotas(''); setCForma('');
    showToast('Ítem agregado al carrito ✓');
  };

  const enviarFacturaCompra = async () => {
    if (cartCompras.length === 0) { showToast('Agrega al menos un ítem'); return; }
    setLoading(true);
    const nuevasCompras = [...cartCompras, ...compras];
    const nuevoInv      = calcInventario(ventas, nuevasCompras);
    try {
      await sendToGAS({ action:'guardarCompra', facturaId: facturaCompraId, items: cartCompras });
      await sendToGAS({ action:'sincronizarInventarioBatch', rows: nuevoInv });
      await sincrResultados(ventas, nuevasCompras, nuevoInv);
    } catch {}
    setCompras(nuevasCompras);
    localStorage.setItem('compras', JSON.stringify(nuevasCompras));
    setCartCompras([]);
    setFacturaCompraId('FC-' + Date.now());
    setCProv('');
    showToast('Factura de compra registrada (' + cartCompras.length + ' ítems) ✓');
    setLoading(false);
  };

  // Keep registrarCompra as alias for single-item (backwards compat)
  const registrarCompra = agregarAlCarritoCompra;

    // ── Cotizaciones ─────────────────────────────────────────────────
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);

  // ── Abonos
  const [abonos, setAbonos] = useState([]);
  const [abonoVentaId, setAbonoVentaId] = useState('');
  const [abonoData, setAbonoData] = useState({ a1:0, a2:0, a3:0, a4:0, a5:0, obs:'' });
  const [savingAbono, setSavingAbono] = useState(false);
  const [loadingCot, setLoadingCot] = useState(false);
  const [cotBusqueda, setCotBusqueda] = useState('');

  const guardarCotizacion = async () => {
    if (cartItems.length === 0) { showToast('Agrega al menos un item al carrito'); return; }
    setLoadingCot(true);
    try {
      const cotData = {
        fecha: new Date().toISOString().split('T')[0],
        cliente: clienteNombre || 'Sin nombre',
        telefono: clienteTel || '',
        documento: clienteDoc || '',
        total: cartItems.reduce((s, i) => s + i.precio, 0),
        observaciones: '',
        usuario: 'App',
        items: cartItems.map(i => ({
          refId: i.refId, refName: i.ref, nombre: i.ref,
          color: i.color, talla: i.talla, forma: i.forma,
          cantidad: i.qty, precio: i.precio, precioUnit: i.qty > 0 ? i.precio / i.qty : i.precio,
          categoria: i.cat, costo: i.costo || 0
        }))
      };
      const resp = await sendToGAS({ action: 'guardarCotizacion', cotizacion: cotData });
      if (resp.status === 'ok') {
        showToast('Cotizacion guardada: ' + resp.id);
        cargarCotizaciones();
    cargarAbonos();
      } else { showToast('Error: ' + (resp.msg || 'desconocido')); }
    } catch (e: any) { showToast('Error al guardar: ' + e.message); }
    setLoadingCot(false);
  };

  const cargarCotizaciones = async () => {
    try {
      const resp = await fetch(GAS_URL + '?action=getCotizaciones&t=' + Date.now());
      const d = await resp.json();
      if (d.cotizaciones) setCotizaciones(d.cotizaciones);
    } catch (_e) { /* ignore */ }
  };


  // Auto-load cotizaciones when tab switches to cotizaciones
  useEffect(() => {
    if (tab === 'cotizaciones') cargarCotizaciones();
  }, [tab]);
  const convertirEnVenta = async (cot: any, cotId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const cantArr = String(cot.cantidades || '1').split(' / ');
      const precioArr = String(cot.precios || '0').split(' / ');
      const items = String(cot.detalle || '').split(' / ').map((det: string, idx: number) => {
        const parts = det.split(' | ');
        return {
          refName: parts[0] || '', nombre: parts[0] || '', color: parts[1] || '',
          talla: parts[2] || '', forma: parts[3] || '',
          cantidad: Number(cantArr[idx] || 1),
          precio: Number(precioArr[idx] || 0),
          refId: '', categoria: '', costo: 0
        };
      });
      const resp = await sendToGAS({
        action: 'convertirCotizacion',
        cotizacionId: cotId,
        cotizacion: {
          fecha: cot.fecha || new Date().toISOString().split('T')[0],
          cliente: cot.cliente || '', telefono: cot.telefono || '',
          documento: cot.documento || '', total: cot.total || 0,
          items
        }
      });
      if (resp.status === 'ok') {
        showToast('Convertida en venta exitosamente');
        cargarCotizaciones();
      } else { showToast('Error: ' + (resp.msg || 'desconocido')); }
    } catch (e: any) { showToast('Error: ' + e.message); }
    setLoading(false);
  }


  // ── Abono Functions
  const cargarAbonos = async () => {
    try {
      const d = await sendToGAS({ action: 'obtenerAbonos' });
      if (d && d.abonos) setAbonos(d.abonos);
    } catch (_e) { /* ignore */ }
  };

  const guardarAbono = async (ventaId) => {
    setSavingAbono(true);
    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) { setSavingAbono(false); return; }
    const payload = {
      action: 'guardarAbono',
      ventaId,
      cliente: venta.cliente,
      totalVenta: ventas.filter(v => v.id === ventaId).reduce((s,v) => s + (v.totalVenta||0), 0),
      fecha: today(),
      abono1: abonoData.a1 || 0,
      abono2: abonoData.a2 || 0,
      abono3: abonoData.a3 || 0,
      abono4: abonoData.a4 || 0,
      abono5: abonoData.a5 || 0,
      observaciones: abonoData.obs || ''
    };
    try {
      const resp = await sendToGAS(payload);
      if (resp && resp.status === 'ok') {
        showToast('Abono guardado ✓');
        setAbonoVentaId('');
        setAbonoData({ a1:0, a2:0, a3:0, a4:0, a5:0, obs:'' });
        cargarAbonos();
      } else { showToast('Error: ' + ((resp && resp.msg) || 'desconocido')); }
    } catch (e) { showToast('Error al guardar: ' + e.message); }
    setSavingAbono(false);
  };

    const actualizarEstadoPago = async (ventaId: string, nuevoEstado: string) => {
    // Optimistic update - update UI immediately
    setVentas(prev => prev.map(v => v.id === ventaId ? { ...v, estadoPago: nuevoEstado } : v));
    try {
      const resp = await sendToGAS({ action: 'actualizarEstadoPago', ventaId, nuevoEstado });
      if (resp.status === 'ok') {
        showToast('Estado actualizado ✓');
      } else {
        showToast('Guardado localmente. Actualiza Drive manualmente si es necesario.');
      }
    } catch (e: any) {
      showToast('Sin conexión - estado guardado en pantalla');
    }
  };

  const descargarCotizacionPDF = async (cot: any) => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ml = 18, mr = 18;
    const contentW = pageW - ml - mr;









    // Header background
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageW, 42, 'F');
    pdf.setFillColor(99, 102, 241);
    pdf.rect(0, 0, 6, 42, 'F');

    // Company name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FURIA ROCK', ml, 15);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Camisetas & Diseño Personalizado', ml, 22);

    // Document type
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COTIZACIÓN', pageW - mr, 14, { align: 'right' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 200, 255);
    pdf.text('ID: ' + String(cot.id || ''), pageW - mr, 21, { align: 'right' });
    const fechaStr = cot.fecha ? (String(cot.fecha).includes('T') || String(cot.fecha).length > 15
      ? new Date(cot.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      : String(cot.fecha)) : new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    pdf.text('Fecha: ' + fechaStr, pageW - mr, 27, { align: 'right' });

    // Client section
    const clienteY = 52;
    pdf.setFillColor(22, 33, 62);
    pdf.roundedRect(ml, clienteY - 6, contentW, 32, 2, 2, 'F');
    pdf.setTextColor(147, 197, 253);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMACIÓN DEL CLIENTE', ml + 4, clienteY - 0.5);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(cot.cliente || 'Cliente no especificado'), ml + 4, clienteY + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const col2X = ml + contentW / 2;
    let infoY = clienteY + 14;
    if (cot.telefono) { pdf.text('Tel: ' + String(cot.telefono), ml + 4, infoY); }
    if (cot.documento) { pdf.text('Doc: ' + String(cot.documento), col2X, infoY); }
    infoY += 6;

    // Build table data from items structured data or parsed detalle string
    const FORMAS_VALID = ['Oversize', 'Regular Fit', 'oversize', 'regular fit'];
    const detalleStr = String(cot.detalle || '');    const cantStr    = String(cot.cantidades || '');

    const precStr    = String(cot.precios    || '');
    const cants = cantStr.split(/[|,]/).map((s: string) => s.trim()).filter(Boolean);
    const precs = precStr.split(/[|,]/).map((s: string) => s.trim()).filter(Boolean);
    const itemStrs = detalleStr.split('/').map((s: string) => s.trim()).filter(Boolean);
    const rowCount = Math.max(itemStrs.length || (detalleStr ? 1 : 0), cants.length, precs.length);
    const tableData: any[] = [];

    if (rowCount > 0 && cants.length > 0) {
      for (let i = 0; i < rowCount; i++) {
        const itemStr = itemStrs[i] || itemStrs[0] || detalleStr;
        const rawParts = itemStr.split('|').map((s: string) => s.trim()).filter(Boolean);
        let refV = '-', colorV = '-', tallaV = '-', formaV = '-';
        if (rawParts.length >= 4) {
          refV   = rawParts[0] || '-';
          colorV = rawParts[1] || '-';
          tallaV = rawParts[2] || '-';
          formaV = rawParts[3] || '-';
        } else if (rawParts.length === 3 && FORMAS_VALID.includes(rawParts[2])) {
          colorV = rawParts[0] || '-';
          tallaV = rawParts[1] || '-';
          formaV = rawParts[2] || '-';
        } else if (rawParts.length === 3) {
          refV   = rawParts[0] || '-';
          colorV = rawParts[1] || '-';
          tallaV = rawParts[2] || '-';
        } else if (rawParts.length === 2) {
          refV   = rawParts[0] || '-';
          colorV = rawParts[1] || '-';
        } else if (rawParts.length === 1) {
          refV = rawParts[0] || '-';
        } else {
          refV = itemStr || '-';
        }
        const cant     = Number(cants[i] || cants[0] || 1);
        const precUnit = Number(String(precs[i] || precs[0] || 0).replace(/[^0-9.]/g, ''));
        const subtotal = precUnit * cant;
        tableData.push([
          String(i + 1),
          refV, colorV, tallaV, formaV,
          String(cant),
          cop(precUnit),
          cop(subtotal)
        ]);
      }
    } else {
      const totalNum = Number(String(cot.total || 0).replace(/[^0-9.]/g, ''));
      tableData.push(['1', detalleStr || '-', '-', '-', '-', String(cants[0] || 1), cop(Number(precs[0] || 0)), cop(totalNum)]);
    }
    const totalFinal = Number(String(cot.total || 0).replace(/[^0-9.]/g, '')) || tableData.reduce((s: number, r: any) => s + Number(String(r[7]).replace(/[^0-9]/g, '')), 0);

    const tableY = clienteY + 30;
    (pdf as any).autoTable({
      startY: tableY,
      head: [['#', 'REFERENCIA', 'COLOR', 'TALLA', 'FORMA', 'CANT', 'P. UNIT', 'SUBTOTAL']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'TOTAL GENERAL', cop(totalFinal)]],
      theme: 'plain',
      headStyles: { fillColor: [15, 23, 42], textColor: [147, 197, 253], fontSize: 7.5, fontStyle: 'bold', cellPadding: { top: 3, bottom: 3, left: 2, right: 2 } },
      footStyles: { fillColor: [15, 23, 42], textColor: [52, 211, 153], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [255, 255, 255], fillColor: [22, 33, 62], cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 } },
      alternateRowStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 5: { cellWidth: 12, halign: 'center' }, 6: { cellWidth: 22, halign: 'right' }, 7: { cellWidth: 24, halign: 'right' } },
      margin: { left: ml, right: mr },
    });

    const finalY = (pdf as any).lastAutoTable.finalY || tableY + 40;
    const qrSize = 28;
    const bankH = 52;
    const bankYStart = Math.min(finalY + 10, pageH - bankH - 10);
    const bx = ml, bw = contentW;

    pdf.setFillColor(22, 33, 62);
    pdf.roundedRect(bx, bankYStart, bw, bankH, 2, 2, 'F');
    pdf.setFillColor(99, 102, 241);
    pdf.rect(bx, bankYStart, 4, bankH, 'F');

    pdf.setFontSize(7.5);
    pdf.setTextColor(147, 197, 253);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMACIÓN DE PAGO', bx + 8, bankYStart + 7);
    const tx = bx + 8;
    let ty = bankYStart + 14;
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Titular:', tx, ty); pdf.setFont('helvetica', 'bold'); pdf.text('Mariluz Lopez', tx + 14, ty); ty += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Banco:', tx, ty);   pdf.setFont('helvetica', 'bold'); pdf.text('Bancolombia', tx + 14, ty); ty += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Tipo:', tx, ty);    pdf.setFont('helvetica', 'bold'); pdf.text('Ahorros', tx + 11, ty); ty += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Cuenta:', tx, ty);  pdf.setFont('helvetica', 'bold'); pdf.text('13848930681', tx + 16, ty); ty += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Nequi:', tx, ty);   pdf.setFont('helvetica', 'bold'); pdf.text('@mariluz3523', tx + 13, ty);

    try {
      const qrResp = await fetch('/qr_pago.png');
      const qrBlob = await qrResp.blob();
      const qrDataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(qrBlob);
      });
      const qrX = bx + bw - qrSize - 6;
      const qrY = bankYStart + (bankH - qrSize) / 2;
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch { /* QR no disponible */ }

    const today = new Date().toISOString().split('T')[0];
    pdf.save('Cotizacion_FuriaRock_' + String(cot.id || today) + '.pdf');
    showToast('PDF de cotización descargado');
  };
;

  // Helper to resolve reference name from refs array
  const resolveRefName = (refId: string): string => {
    const found = refs.find(r => r.id === refId || r.name === refId);
    return found ? found.name : (refId || '-');
  };

  const buscarCuentaCobro = (id: string) => {
    if (!id.trim()) return;
    setCcStatus('loading');
    setCcData(null);
    setCcMsg('');

    // Search through the locally loaded ventas from Drive
    const searchId = id.trim().toLowerCase();
    
    // Find all ventas matching this ID (could be same venta with multiple items)
    const matching = ventas.filter(v => {
      const vid = String(v.id || '').toLowerCase().trim();
      const vorden = String(v.ordenInterna || '').toLowerCase().trim();
      return vid === searchId || vorden === searchId;
    });

    if (matching.length > 0) {
      // Convert to the format expected by the UI
      const filas = matching.map(v => ({
        ID: v.id,
        Fecha: v.fecha,
        Cliente: v.cliente,
        Telefono: v.telefono,
        Documento: v.documento,
        Direccion: v.direccion,
        Sede: v.sede,
        Referencia: v.ref || resolveRefName(v.refId),
        Color: v.color,
        Talla: v.talla,
        Forma: v.forma,
        Cantidad: v.cantidad,
        'Precio Unit.': v.precio,
        'Total Venta': v.totalVenta,
        OrdenInterna: v.ordenInterna,
        Estado: v.estado,
        Diseno: v.diseno,
      }));
      setCcData(filas);
      setCcStatus('found');
    } else if (ventas.length === 0) {
      setCcStatus('error');
      setCcMsg('Los datos de ventas aún están cargando. Espera un momento y vuelve a intentar.');
    } else {
      setCcStatus('not_found');
      setCcMsg('No se encontró una venta con este ID. Verifica el número.');
    }
  };

  const tabs: {id:Tab; label:string}[] = [
    {id:'cotizador',    label:'🧲 Cotizador'},
    {id:'ventas',       label:'💰 Ventas'},
    {id:'compras',      label:'📦 Compras'},
    {id:'inventario',   label:'📊 Inventario'},
    {id:'dashboard',    label:'📈 Dashboard'},
    {id:'cuenta',       label:'🧾 Cuenta de Cobro'},
    {id:'cotizaciones', label:'📋 Cotizaciones'},
    {id:'abonos',       label:'💰 Abonos'},
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {toast && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">{toast}</div>
      )}

      {/* ── Abono Modal ── */}
      {abonoVentaId && (() => {
        const v = ventas.find(x => x.id === abonoVentaId);
        const prevAbonado = abonos.reduce((t, a) => a.ventaId === abonoVentaId ? a.totalAbonado : t, 0);
        const totalVenta = ventas.filter(x => x.id === abonoVentaId).reduce((s,x) => s + (x.totalVenta||0), 0);
        const nuevoTotal = (abonoData.a1||0)+(abonoData.a2||0)+(abonoData.a3||0)+(abonoData.a4||0)+(abonoData.a5||0);
        const saldo = totalVenta - prevAbonado - nuevoTotal;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-600 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-1">💵 Registrar Abono</h3>
              <p className="text-xs text-gray-400 mb-1">Cliente: <span className="text-white">{v?.cliente}</span></p>
              <p className="text-xs text-gray-400 mb-3">Total: <span className="text-green-400 font-bold">{cop(totalVenta)}</span> | Abonado: <span className="text-yellow-400">{cop(prevAbonado)}</span></p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1,2,3,4,5].map(n => (
                  <div key={n}>
                    <label className="text-xs text-gray-400">Abono {n}</label>
                    <input type="number" min="0"
                      value={abonoData['a'+n] || ''}
                      onChange={e => setAbonoData({...abonoData, ['a'+n]: Number(e.target.value)})}
                      className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-green-400"
                    />
                  </div>
                ))}
                <div className="col-span-3">
                  <label className="text-xs text-gray-400">Observaciones</label>
                  <input type="text" value={abonoData.obs}
                    onChange={e => setAbonoData({...abonoData, obs: e.target.value})}
                    placeholder="Nota opcional..."
                    className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-green-400"
                  />
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-300">Total abonado: <span className="text-green-400 font-bold">{cop(prevAbonado + nuevoTotal)}</span></p>
                <p className="text-sm text-gray-300">Saldo pendiente: <span className={saldo <= 0 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>{cop(Math.max(saldo, 0))}</span></p>
                {saldo <= 0 && <p className="text-xs text-green-400">✅ Pago completo</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAbonoVentaId('')} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Cancelar</button>
                <button onClick={() => guardarAbono(abonoVentaId)} disabled={savingAbono || nuevoTotal === 0}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold">
                  {savingAbono ? 'Guardando...' : '💾 Guardar Abono'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold text-white">⚡ FURIA ROCK – Gestión de Costos</h1>
        <p className="text-xs text-gray-400 mt-0.5">Sincronizado con Google Drive</p>
      </div>
      <div className="bg-gray-800 border-b border-gray-700 px-4 flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab===t.id ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ═══ BARRA DE FILTRO POR FECHA GLOBAL ═══ */}
      <div className="bg-gray-800 border-b border-gray-600 px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">📅 Filtrar por fecha:</span>
          <div className="flex gap-1 rounded-lg overflow-hidden border border-gray-600">
            {(['rango','mes','dia'] as const).map(m => (
              <button key={m} onClick={() => { setFiltroModo(m); setFechaInicio(''); setFechaFin(''); setFiltroMes(''); setFiltroDia(''); }}
                className={`px-3 py-1 text-xs font-medium transition-colors ${filtroModo===m ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {m==='rango' ? 'Rango' : m==='mes' ? 'Mes' : 'Día'}
              </button>
            ))}
          </div>
          {filtroModo === 'rango' && (<>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400" />
            <span className="text-gray-500 text-xs">→</span>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400" />
          </>)}
          {filtroModo === 'mes' && (
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400" />
          )}
          {filtroModo === 'dia' && (
            <input type="date" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400" />
          )}
          {hasFiltroFecha && (
            <button onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroMes(''); setFiltroDia(''); }}
              className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors">✕ Limpiar</button>
          )}
          {hasFiltroFecha && (
            <span className="text-xs text-indigo-300 font-medium">
              {ventasFiltradas.length} ventas ÃÂ· {comprasFiltradas.length} compras
            </span>
          )}
        </div>
      </div>


      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* ═══ COTIZADOR ═══ */}
        {tab === 'cotizador' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle text="Producto" />
              <div className="space-y-3">
                <FG label="Referencia">
                  <Sel options={refs.map(r => r.name)} value={currentRef?.name ?? ''} onChange={e => {
                    const r = refs.find(x => x.name === e.target.value);
                    setSelRef(r?.id ?? ''); setSelColor(''); setSelTalla('');
                  }} />
                </FG>
        {refs.length === 0 && (
          <p className="text-yellow-400 text-xs mt-1">⚠️ Cargando referencias desde Drive...</p>
        )}
        {selRef && !currentRef && (
          <p className="text-red-400 text-xs mt-1">⚠️ La referencia no existe en la base de datos del Drive.</p>
        )}
                <FG label="Color">
                  <Sel options={coloresDisp} value={selColor} onChange={e => setSelColor(e.target.value)} />
                </FG>
                <div className="grid grid-cols-2 gap-3">
                  <FG label={`Talla${currentRef ? ' (' + (esNino(currentRef.cat) ? 'Niño' : 'Adulto') + ')' : ''}`}>
                    <Sel options={tallasDisp} value={selTalla} onChange={e => setSelTalla(e.target.value)} />
                  </FG>
                  <FG label="Forma de la camiseta">
                    <Sel options={FORMAS_CAMISETA} value={selForma} onChange={e => setSelForma(e.target.value)} />
                  </FG>
                </div>
                <FG label="Cantidad">
                  <Inp type="number" min={1} value={selQty} onChange={e => setSelQty(Number(e.target.value))} />
                </FG>
              </div>
            </Card>

            <Card>
              <CardTitle text="Costos de Produccion" />
              <div className="space-y-3">
                <FG label="Margen de ganancia" hint="53% estandar | 55% | 47% | 45% | 43% | 40%"><Sel options={["53%","55%","47%","45%","43%","40%"]} value={(selMargenPct*100).toFixed(0)+"%"} onChange={(e:any)=>setSelMargenPct(parseFloat(e.target.value)/100)} /></FG>
              <FG label="Tipo de impresion">
                  <Sel options={TIPOS_IMP} value={selTipoImp} onChange={e => { setSelTipoImp(e.target.value); setCostoDTG(0); setCostoBordado(0); }} />
                </FG>
                {selTipoImp === 'DTF' && (
                  <div className="grid grid-cols-2 gap-3">
                    <FG label="Área DTF (cm²)" hint="170 COP/cm²">
                      <Inp type="number" min={0} value={cmDTF} onChange={e => setCmDTF(Number(e.target.value))} />
                    </FG>
                    <FG label="Num. planchadas" hint="1.000 COP c/u">
                      <Inp type="number" min={0} value={numPlanchadas} onChange={e => setNumPlanchadas(Number(e.target.value))} />
                    </FG>
                  </div>
                )}
                {selTipoImp === 'DTG' && (
                  <FG label="Costo de impresion DTG (COP)" hint="Ingresa el valor total de impresion DTG">
                    <Inp type="number" min={0} value={costoDTG} onChange={e => setCostoDTG(Number(e.target.value))} />
                  </FG>
                )}
                {selTipoImp === 'Bordado' && (
                  <FG label="Costo de bordado (COP)" hint="Ingresa el precio del bordado">
                    <Inp type="number" min={0} value={costoBordado} onChange={e => setCostoBordado(Number(e.target.value))} />
                  </FG>
                )}
                <div className="mt-2 p-3 bg-gray-700 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between text-gray-400"><span>Base camisa:</span><span>{currentRef ? cop(currentRef.cost) : '-'}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Empaque:</span><span>{cop(COSTO_EMPAQUE)}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Impresion:</span><span>{currentRef ? cop(selTipoImp==='DTF' ? cmDTF*DTF_POR_CM2 + numPlanchadas*COSTO_PLANCHADA : selTipoImp==='Bordado' ? costoBordado : costoDTG) : '-'}</span></div>
                  <div className="flex justify-between font-semibold text-white border-t border-gray-600 pt-1"><span>Costo total ({selQty} und):</span><span>{calc ? cop(calc.costo) : '-'}</span></div>
                  <div className="flex justify-between font-semibold text-green-400"><span>Precio sugerido ({selQty} und):</span><span>{calc ? cop(calc.precio) : '-'}</span></div>
                  <div className="flex justify-between text-gray-400 text-xs"><span>Ganancia:</span><span>{calc ? cop(calc.ganancia) : '-'}</span></div>
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle text="Datos del Cliente" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FG label="Nombre del cliente"><Inp value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre completo" /></FG>
                <FG label="Teléfono / Contacto"><Inp value={clienteTel} onChange={e => setClienteTel(e.target.value)} placeholder="Ej: 3001234567" /></FG>
                <FG label="Documento"><Inp value={clienteDoc} onChange={e => setClienteDoc(e.target.value)} placeholder="CC / NIT" /></FG>
                <FG label="Dirección"><Inp value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} placeholder="Dirección de entrega" /></FG>
                <FG label="Sede / Punto de venta"><Sel options={SEDES} value={clienteSede} onChange={e => setClienteSede(e.target.value)} /></FG>
                <FG label="Diseño"><Inp value={clienteDiseno} onChange={e => setClienteDiseno(e.target.value)} placeholder="Nombre del diseño" /></FG>
                <FG label="Orden interna"><Inp value={clienteOrden} onChange={e => setClienteOrden(e.target.value)} placeholder="Ej: ORD-001" /></FG>
              <FG label="Estado de pago"><Sel options={['Pendiente de pago','Pagado']} value={clienteEstadoPago} onChange={e => setClienteEstadoPago(e.target.value)} /></FG>
              </div>
              {gasErr && <p className="text-red-400 text-xs mt-2">{gasErr}</p>}
              <div className="mt-4 space-y-3">
                {cartItems.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-1 pr-2">Ref</th>
                        <th className="text-left py-1 pr-2">Color</th>
                        <th className="text-left py-1 pr-2">Talla</th>
                        <th className="text-left py-1 pr-2">Forma</th>
                        <th className="text-right py-1 pr-2">Cant</th>
                        <th className="text-right py-1 pr-2">Precio</th>
                        <th className="text-right py-1">Acción</th>
                      </tr></thead>
                      <tbody>
                        {cartItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-700/50">
                            <td className="py-1 pr-2 text-gray-300 text-xs">{item.ref.split(' ').slice(0,3).join(' ')}</td>
                            <td className="py-1 pr-2 text-gray-300">{item.color}</td>
                            <td className="py-1 pr-2 text-gray-300">{item.talla}</td>
                            <td className="py-1 pr-2 text-gray-300">{item.forma || '-'}</td>
                            <td className="py-1 pr-2 text-right text-gray-300">{item.qty}</td>
                            <td className="py-1 pr-2 text-right text-green-400">{cop(item.precio)}</td>
                            <td className="py-1 text-right">
                              <button onClick={() => setCartItems(prev => prev.filter((_,i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-gray-600">
                          <td colSpan={5} className="py-1 text-gray-400 text-xs font-semibold">TOTAL GENERAL</td>
                          <td className="py-1 text-right text-green-400 font-semibold text-xs">{cop(cartItems.reduce((s,i) => s + i.precio, 0))}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Btn onClick={agregarItem} disabled={loading || !currentRef || !selColor || !selTalla} variant="secondary">
                    + Agregar ítem
                  </Btn>
                  <Btn onClick={generarCotizacionPDF} disabled={cartItems.length === 0} variant="secondary">
                    📄 Descargar PDF
                  </Btn>
                  <Btn onClick={guardarCotizacion} disabled={loadingCot || cartItems.length === 0} variant="secondary">
                    💾 Guardar Cotización
                  </Btn>
                  <Btn onClick={registrarVenta} disabled={loading || cartItems.length === 0}>
                    {loading ? 'Guardando…' : `✓ Registrar Pedido (${cartItems.length})`}
                  </Btn>
                </div>
              </div>
            </Card>
          </div>
        )}

{/* ═══ VENTAS ═══ */}
        {tab === 'ventas' && (
          <div className="space-y-4">
            {/* ── Tarjetas Resumen ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">VENTAS TOTALES</p>
                  <p className="text-2xl font-bold text-white">{ventasFiltradas.length}</p>
                </div>
                <span className="text-3xl opacity-60">🛒</span>
              </div>
              <div className="bg-gray-800 border border-yellow-600 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">PENDIENTE</p>
                  <p className="text-2xl font-bold text-yellow-400">{cop(ventasFiltradas.filter(v=>(v.estadoPago||'Pendiente de pago')!=='Pagado'&&(v.estadoPago||'Pendiente de pago')!=='Cancelado').reduce((s,v)=>s+(v.totalVenta||0),0))}</p>
                </div>
                <span className="text-3xl opacity-60">⏳</span>
              </div>
              <div className="bg-gray-800 border border-emerald-600 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">COBRADO</p>
                  <p className="text-2xl font-bold text-emerald-400">{cop(ventasFiltradas.filter(v=>(v.estadoPago||'Pendiente de pago')==='Pagado').reduce((s,v)=>s+(v.totalVenta||0),0))}</p>
                </div>
                <span className="text-3xl opacity-60">✅</span>
              </div>
            </div>

            <Card>
            <div className="flex items-center justify-between mb-3">
              <CardTitle text={`Historial de Ventas (${ventasFiltradas.length})`} />
              <Btn variant="secondary" onClick={() => exportCSV(ventas,'ventas')}>📊 CSV</Btn>
            </div>

            {/* ── Buscador y Filtro ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
                <input
                  type="text"
                  value={searchVentas}
                  onChange={e => setSearchVentas(e.target.value)}
                  placeholder="Buscar por cliente..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-all duration-200"
                />
              </div>
              <select
                value={filterEstadoVentas}
                onChange={e => setFilterEstadoVentas(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-400 transition-all duration-200"
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Abonado">Abonado</option>
                <option value="Pagado">Pagado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
                <Btn variant="primary" onClick={() => setTab('cotizador')}>+ Nueva Venta</Btn>
            </div>

            {ventasFiltradas.length === 0 ? <p className="text-gray-500 text-sm">No hay ventas registradas.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-3 text-indigo-300">ID Pedido</th>
                    <th className="text-left py-2 pr-3">Fecha</th>
                    <th className="text-left py-2 pr-3">Cliente</th>
                    <th className="text-left py-2 pr-3">Referencia</th>
                    <th className="text-left py-2 pr-3">Color</th>
                    <th className="text-left py-2 pr-3">Talla</th>
                    <th className="text-left py-2 pr-3">Forma</th>
                    <th className="text-right py-2 pr-3">Cant.</th>
                    <th className="text-right py-2 pr-3">Total</th>
                    <th className="text-right py-2">Ganancia</th>
                        <th className="text-right py-2">Margen %</th>
                    <th className="text-center py-2 pl-3">Estado</th>
                  </tr></thead>
                  <tbody>
                    {ventasFiltradas.filter(v => {
                      const q = searchVentas.toLowerCase();
                      const matchCliente = !q ||
                        (v.cliente || '').toLowerCase().includes(q) ||
                        (v.documento || '').toLowerCase().includes(q) ||
                        (v.telefono || '').toLowerCase().includes(q);
                      const matchEstado = !filterEstadoVentas || (v.estadoPago || 'Pendiente de pago') === filterEstadoVentas;
                      return matchCliente && matchEstado;
                    }).map(v => (
                      <tr key={v.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-2 pr-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs font-mono text-indigo-400">{v.id || '–'}</span>
                            <button
                              onClick={() => { setTab('cuenta'); setCcId(String(v.id)); setTimeout(() => buscarCuentaCobro(String(v.id)), 150); }}
                              className="text-xs px-2 py-0.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors whitespace-nowrap"
                            >🧾 Cobro</button>
                            <button
                              onClick={() => { setAbonoVentaId(v.id); setAbonoData({ a1:0, a2:0, a3:0, a4:0, a5:0, obs:'' }); }}
                              className="text-xs px-2 py-0.5 bg-green-700 hover:bg-green-600 text-white rounded transition-colors whitespace-nowrap mt-1"
                            >💵 Abonar</button>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-gray-300">{v.fecha}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.cliente || '–'}</td>
                        <td className="py-2 pr-3 text-gray-200">{v.ref || resolveRefName(v.refId)}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.color}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.talla}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.forma || '–'}</td>
                        <td className="py-2 pr-3 text-right text-gray-300">{v.cantidad}</td>
                        <td className="py-2 pr-3 text-right text-green-400 font-semibold text-xs">{cop(v.totalVenta)}</td>
                        <td className="py-2 text-right text-indigo-400">{cop(v.ganancia)}</td>
                        <td className="py-2 text-right text-purple-400 text-xs font-semibold">{v.totalVenta > 0 ? Math.round(v.ganancia / v.totalVenta * 100) + '%' : '-'}</td>
                        <td className="py-2 pl-3 text-center">
                          <select
                            value={v.estadoPago || 'Pendiente de pago'}
                            onChange={e => actualizarEstadoPago(v.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                              (v.estadoPago || 'Pendiente de pago') === 'Pagado'
                                ? 'bg-green-900/40 border-green-600 text-green-300'
                                : 'bg-yellow-900/40 border-yellow-600 text-yellow-300'
                            }`}
                          >
                            <option value="Pendiente de pago">⏳ Pendiente</option>
                            <option value="Pagado">✅ Pagado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </div>
        )}
                {/* ═══ COMPRAS ═══ */}
        {tab === 'compras' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle text="Registrar Compra" />
              <div className="space-y-3">
                <FG label="Referencia">
                  <Sel options={refs.map(r => r.name)} value={refs.find(r=>r.id===cRef)?.name ?? ''} onChange={e => {
                    const r = refs.find(x => x.name === e.target.value);
                    setCRef(r?.id ?? ''); setCColor(''); setCTalla('');; if (r?.cost) setCPrecio(r.cost);
                  }} />
                </FG>
        {refs.length === 0 && (
          <p className="text-yellow-400 text-xs mt-1">⚠️ Cargando referencias desde Drive...</p>
        )}
                {!(refs.find(x => x.id === cRef)?.cat === 'Accesorio') && (
                  <>
                  <div className="grid grid-cols-2 gap-3">
                    <FG label="Color"><Sel options={cColoresDisp} value={cColor} onChange={e => setCColor(e.target.value)} /></FG>
                    <FG label="Talla"><Sel options={TODAS_TALLAS} value={cTalla} onChange={e => setCTalla(e.target.value)} /></FG>
                  </div>
                  <FG label="Forma de la camiseta">
                    <Sel options={FORMAS_CAMISETA} value={cForma} onChange={e => setCForma(e.target.value)} />
                  </FG>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FG label="Cantidad"><Inp type="number" min={1} value={cQty} onChange={e => setCQty(Number(e.target.value))} /></FG>
                  <FG label="Precio unitario (COP)"><Inp type="number" min={0} value={cPrecio} onChange={e => setCPrecio(Number(e.target.value))} /></FG>
                </div>
                <FG label="Proveedor"><Inp value={cProv} onChange={e => setCProv(e.target.value)} placeholder="Nombre del proveedor" /></FG>
                <FG label="Notas"><Inp value={cNotas} onChange={e => setCNotas(e.target.value)} placeholder="Observaciones" /></FG>
                <Btn onClick={agregarAlCarritoCompra} disabled={loading}>+ Agregar al Carrito</Btn>
          {cartCompras.length > 0 && (
            <div className="mt-3 border border-gray-600 rounded-xl p-3">
              <p className="text-xs text-yellow-400 font-semibold mb-2">Carrito ({cartCompras.length} items)</p>
              <table className="w-full text-xs text-gray-300 mb-2">
                <thead><tr className="text-gray-500">
                  <th className="text-left py-1">Referencia</th>
                  <th className="text-left py-1">Color/Talla</th>
                  <th className="text-right py-1">Cant.</th>
                  <th className="text-right py-1">Precio</th>
                  <th className="py-1"></th>
                </tr></thead>
                <tbody>
                  {cartCompras.map((item: any, idx: number) => (
                    <tr key={idx} className="border-t border-gray-700">
                      <td className="py-1">{item.ref.split(' ').slice(0,3).join(' ')}</td>
                      <td className="py-1">{item.color}/{item.talla}</td>
                      <td className="py-1 text-right">{item.cantidad}</td>
                      <td className="py-1 text-right text-green-400">{cop(item.precio)}</td>
                      <td className="py-1 text-right">
                        <button onClick={() => setCartCompras((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))} className="text-red-400 text-xs px-1">X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Btn onClick={enviarFacturaCompra} disabled={loading}>
                {loading ? 'Enviando...' : 'Registrar Factura (' + cartCompras.length + ' items)'}
              </Btn>
            </div>
          )}
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <CardTitle text={`Historial de Compras (${comprasFiltradas.length})`} />
                <Btn variant="secondary" onClick={() => exportCSV(compras,'compras')}>⬇ CSV</Btn>
              </div>
              {comprasFiltradas.length === 0 ? <p className="text-gray-500 text-sm">No hay compras registradas.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-3">Fecha</th>
                      <th className="text-left py-2 pr-3">Referencia</th>
                      <th className="text-left py-2 pr-3">Forma</th>
                      <th className="text-right py-2 pr-3">Cant.</th>
                      <th className="text-right py-2">Total</th>
                    </tr></thead>
                    <tbody>
                      {comprasFiltradas.map(c => (
                        <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 pr-3 text-gray-300">{c.fecha}</td>
                          <td className="py-2 pr-3 text-gray-200">{c.ref || resolveRefName(c.refId)}</td>
                          <td className="py-2 pr-3 text-gray-300">{c.forma || '-'}</td>
                          <td className="py-2 pr-3 text-right text-gray-300">{c.cantidad}</td>
                          <td className="py-2 text-right text-blue-400">{cop(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══ INVENTARIO ═══ */}
        {tab === 'inventario' && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <CardTitle text="Inventario en Tiempo Real" />
              <Btn variant="secondary" onClick={() => exportCSV(inventario,'inventario')}>⬇ CSV</Btn>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label:'En stock', val: displayInventario.reduce((a,i)=>a+Math.max(i.stock,0),0), color:'text-white' },
                { label:'OK (>5)',   val: displayInventario.filter(i=>i.stock>5).length, color:'text-green-400' },
                { label:'Bajo (≤5)', val: displayInventario.filter(i=>i.stock>2&&i.stock<=5).length, color:'text-yellow-400' },
                { label:'Crítico (≤2)', val: displayInventario.filter(i=>i.stock<=2).length, color:'text-red-400' },
              ].map(k => (
                <div key={k.label} className="bg-gray-700 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 pr-3">Referencia</th>
                  <th className="text-left py-2 pr-3">Cat.</th>
                  <th className="text-left py-2 pr-3">Talla</th>
                  <th className="text-left py-2 pr-3">Color</th>
                  <th className="text-left py-2 pr-3">Forma</th>
                  <th className="text-right py-2 pr-3">Comprado</th>
                  <th className="text-right py-2 pr-3">Vendido</th>
                  <th className="text-right py-2 pr-3">Stock</th>
                  <th className="text-left py-2">Estado</th>
                </tr></thead>
                <tbody>
                  {displayInventario.map((i,idx) => (
                    <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-2 pr-3 font-medium text-gray-200">{i.ref}</td>
                      <td className="py-2 pr-3 text-gray-400">{i.cat}</td>
                      <td className="py-2 pr-3 text-gray-300">{i.talla}</td>
                      <td className="py-2 pr-3 text-gray-300">{i.color}</td>
                      <td className="py-2 pr-3 text-gray-300">{i.forma && i.forma !== '_' ? i.forma : '-'}</td>
                      <td className="py-2 pr-3 text-right text-blue-400">{i.comprado}</td>
                      <td className="py-2 pr-3 text-right text-orange-400">{i.vendido}</td>
                      <td className={`py-2 pr-3 text-right font-semibold ${i.stock<0?'text-red-400':i.stock>5?'text-green-400':'text-yellow-400'}`}>{i.stock}</td>
                      <td className="py-2"><Badge text={i.estado==='OK'?'✅ OK':i.estado==='Bajo'?'⚠️ Bajo':'🔴 Crítico'} color={i.estado==='OK'?'green':i.estado==='Bajo'?'yellow':'red'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {tab === 'dashboard' && (
          <div className="space-y-4">
            {/* ── Label de filtro activo ── */}
            {hasFiltroFecha && (
              <div className="bg-indigo-900/30 border border-indigo-700 rounded-xl px-4 py-2 text-sm text-indigo-300">
                📅 Mostrando datos filtrados: <strong>{ventasDashboard.length}</strong> ventas ÃÂ· <strong>{comprasFiltradas.length}</strong> compras
              </div>
            )}
            {/* ── KPIs Fila 1: Ventas e Inventario ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:'Total Ventas (COP)',     val: cop(ventasDashboard.reduce((a,v)=>a+v.totalVenta,0)),       color:'text-green-400',  icon:'💰' },
                { label:'Total Compras (COP)',    val: cop(comprasFiltradas.reduce((a,c)=>a+(c.total||0),0)),     color:'text-orange-400', icon:'🛒' },
                { label:'Ganancia General (COP)', val: cop(ventasDashboard.reduce((a,v)=>a+v.ganancia,0)),        color:'text-indigo-400', icon:'📈' },
                { label:'Inventario Total (uds)', val: stockTotal.toString(),                                     color:'text-yellow-400', icon:'📦' },
                { label:'Inventario Valorizado',   val: cop(inventarioValorizado),                               color:'text-cyan-400',   icon:'💸' },
              ].map(k => (
                <Card key={k.label} className="text-center">
                  <div className="text-2xl mb-1">{k.icon}</div>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.label}</p>
                </Card>
              ))}
            </div>
            {/* ── KPIs Fila 2: Detalles de Ventas ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label:'Unidades Vendidas',  val: ventasDashboard.reduce((a,v)=>a+v.cantidad,0).toString(),   color:'text-cyan-400',   icon:'👕' },
                { label:'Costo de Ventas',    val: cop(ventasDashboard.reduce((a,v)=>a+v.costo,0)),            color:'text-red-400',    icon:'💸' },
                { label:'Margen (%)',          val: (() => { const ing=ventasDashboard.reduce((a,v)=>a+v.totalVenta,0); const gan=ventasDashboard.reduce((a,v)=>a+v.ganancia,0); return ing>0 ? (gan/ing*100).toFixed(1)+'%' : '—'; })(), color:'text-purple-400', icon:'%' },
              ].map(k => (
                <Card key={k.label} className="text-center">
                  <div className="text-xl mb-1">{k.icon}</div>
                  <p className={`text-xl font-bold ${k.color}`}>{k.val}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.label}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardTitle text="Últimas 5 Ventas" />
                <div className="space-y-2">
                  {ventasDashboard.slice(0,5).map(v => (
                    <div key={v.id} className="flex justify-between items-center text-sm">
                      <div><span className="text-gray-200">{v.ref}</span><span className="text-gray-500 ml-2">{v.talla} / {v.color}</span></div>
                      <span className="text-green-400">{cop(v.totalVenta)}</span>
                    </div>
                  ))}
                  {ventasDashboard.length === 0 && <p className="text-gray-500 text-sm">Sin ventas aún</p>}
                </div>
              </Card>
              <Card>
                <CardTitle text="Stock Crítico" />
                <div className="space-y-2">
                  {displayInventario.filter(i=>i.stock<=2).map((i,idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-200">{i.ref} / {i.talla} / {i.color}</span>
                      <Badge text={String(i.stock)} color="red" />
                    </div>
                  ))}
                  {displayInventario.filter(i=>i.stock<=2).length === 0 && <p className="text-gray-500 text-sm">Sin items críticos ✅</p>}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ CUENTA DE COBRO ═══ */}
        {tab === 'cuenta' && (
          <div className="space-y-4">
            <Card>
              <CardTitle text="Buscar Venta por ID" />
              <div className="flex gap-3 items-end">
                <FG label="ID de la venta">
                  <Inp value={ccId} onChange={e => {
                    setCcId(e.target.value); setCcStatus('idle'); setCcData(null); setCcMsg('');
                    if (e.target.value.trim().length >= 1) buscarCuentaCobro(e.target.value.trim());
                  }} placeholder="Ingresa el ID de la venta (ej: 1779063838818)" className="w-80" />
                </FG>
                <Btn onClick={() => buscarCuentaCobro(ccId)} disabled={!ccId.trim() || ccStatus==='loading'}>
                  {ccStatus === 'loading' ? 'Buscando…' : '🔍 Buscar'}
                </Btn>
              </div>
              {ccStatus === 'loading' && <p className="text-indigo-400 text-sm mt-3 animate-pulse">Consultando en Google Drive…</p>}
              {ccStatus === 'not_found' && <div className="mt-3 p-3 bg-red-900/40 border border-red-700 rounded-lg"><p className="text-red-300 text-sm">⚠️ {ccMsg}</p></div>}
              {ccStatus === 'error' && <div className="mt-3 p-3 bg-yellow-900/40 border border-yellow-700 rounded-lg"><p className="text-yellow-300 text-sm">⚠️ {ccMsg}</p></div>}
            </Card>

            {ccStatus === 'found' && ccData && ccData.length > 0 && (() => {
              const fila0 = ccData[0];
              const clienteNom  = fila0['Cliente']   || fila0['cliente']   || '-';
              const clienteFon  = fila0['Telefono']  || fila0['telefono']  || '-';
              const clienteDoc2 = fila0['Documento'] || fila0['documento'] || '-';
              const clienteDir  = fila0['Direccion'] || fila0['direccion'] || '-';
              const clienteS    = fila0['Sede']      || fila0['sede']      || '-';
              const fecha       = fila0['Fecha']     || fila0['fecha']     || '-';
              const idVenta     = fila0['ID']        || fila0['id']        || ccId;
              const totalGeneral = ccData.reduce((acc: number, row: any) => {
                const tv = Number(String(row['Total Venta'] || row['totalVenta'] || row['TotalVenta'] || 0).replace(/[^0-9.-]/g,''));
                return acc + tv;
              }, 0);
              return (
                <div className="space-y-4">
                  <Card className="border border-indigo-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="text-lg font-bold text-white">🧾 Cuenta de Cobro</h2>
                        <p className="text-xs text-gray-400">ID: {idVenta} &nbsp;|&nbsp; Fecha: {fecha}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">{cop(totalGeneral)}</p>
                        <p className="text-xs text-gray-400">Total general</p>
                      </div>
              <button
                onClick={() => generarCuentaCobroPDF({ clienteNom, clienteFon, clienteDoc2, clienteDir, clienteS, fecha, idVenta, totalGeneral, ccData })}
                className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                📄 Descargar PDF
              </button>
                    </div>
                  </Card>
                  <Card>
                    <CardTitle text="A. Datos del Cliente" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[{label:'Cliente',val:clienteNom},{label:'Teléfono',val:clienteFon},{label:'Documento',val:clienteDoc2},{label:'Dirección',val:clienteDir},{label:'Sede',val:clienteS}].map(item => (
                        <div key={item.label}>
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className="text-sm text-white font-medium mt-0.5">{item.val}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <CardTitle text="B. Detalle de la Venta" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-gray-400 border-b border-gray-700">
                          <th className="text-left py-2 pr-3">#</th>
                          <th className="text-left py-2 pr-3">Referencia</th>
                          <th className="text-left py-2 pr-3">Color</th>
                          <th className="text-left py-2 pr-3">Talla</th>
                          <th className="text-left py-2 pr-3">Forma</th>
                          <th className="text-right py-2 pr-3">Cant.</th>
                          <th className="text-left py-2 pr-3">Orden interna</th>
                          <th className="text-right py-2">Total</th>
                        </tr></thead>
                        <tbody>
                          {ccData.map((row: any, idx: number) => {
                            const refName = row['Referencia']||row['referencia']||row['ref']||'-';
                            const colorV  = row['Color']||row['color']||'-';
                            const tallaV  = row['Talla']||row['talla']||'-';
                            const formaV  = row['Forma']||row['forma']||'-';
                            const cantV   = row['Cantidad']||row['cantidad']||0;
                            const ordenV  = row['OrdenInterna']||row['ordenInterna']||row['Orden interna']||'-';
                            const totalV  = Number(String(row['Total Venta']||row['totalVenta']||row['TotalVenta']||0).replace(/[^0-9.-]/g,''));
                            return (
                              <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                <td className="py-2 pr-3 text-gray-500">{idx+1}</td>
                                <td className="py-2 pr-3 text-gray-200 font-medium">{refName}</td>
                                <td className="py-2 pr-3 text-gray-300">{colorV}</td>
                                <td className="py-2 pr-3 text-gray-300">{tallaV}</td>
                                <td className="py-2 pr-3 text-gray-300">{formaV}</td>
                                <td className="py-2 pr-3 text-right text-gray-300">{cantV}</td>
                                <td className="py-2 pr-3 text-gray-400 text-xs">{ordenV}</td>
                                <td className="py-2 text-right text-green-400 font-semibold">{cop(totalV)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                  <Card className="border border-green-700">
                    <CardTitle text="C. Resumen" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">Líneas en el pedido: <span className="text-white">{ccData.length}</span></p>
                        <p className="text-sm text-gray-400">Unidades totales: <span className="text-white">{ccData.reduce((a:number,r:any) => a + Number(r['Cantidad']||r['cantidad']||0), 0)}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-400">{cop(totalGeneral)}</p>
                        <p className="text-xs text-gray-400 mt-1">TOTAL A COBRAR</p>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}
          </div>
        )}

      {/* ── COTIZACIONES ──────────────────────────────────────── */}
      {tab === 'cotizaciones' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">📋 REGISTRO DE COTIZACIONES</h2>
            <button onClick={cargarCotizaciones} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500">
              🔄 Actualizar
            </button>
          </div>

          {/* Buscador por ID */}
          <div className="flex items-center gap-2 mb-3">
            <label className="text-slate-400 text-sm whitespace-nowrap">Buscar por ID:</label>
            <input
              type="text"
              value={cotBusqueda}
              onChange={e => setCotBusqueda(e.target.value)}
              placeholder="Ej: COT-12345"
              className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 placeholder-slate-400 focus:outline-none focus:border-indigo-400"
            />
            {cotBusqueda && (
              <button onClick={() => setCotBusqueda('')} className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded-lg hover:bg-slate-500">
                ✕ Limpiar
              </button>
            )}
          </div>

          {cotizaciones.length === 0 ? (
            <div className="text-slate-400 text-center py-12">No hay cotizaciones registradas. Guarda una desde el Cotizador.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr className="text-left text-slate-400">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Referencias</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones
                    .filter((cot: any) => !cotBusqueda || String(cot.id || '').toLowerCase().includes(cotBusqueda.toLowerCase()))
                    .map((cot: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-700 hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-indigo-400 font-mono text-xs">{String(cot.id || '-')}</td>
                      <td className="px-3 py-2 text-slate-300">{cot.fecha ? (String(cot.fecha).includes('T') || String(cot.fecha).length > 15 ? new Date(cot.fecha).toLocaleDateString('es-CO') : String(cot.fecha)) : '-'}</td>
                      <td className="px-3 py-2 text-white font-medium">{String(cot.cliente || '-')}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs max-w-xs">{(String(cot.detalle || '') || '-').slice(0, 60)}</td>
                      <td className="px-3 py-2 text-emerald-400 font-bold text-right">
                        ${(Number(cot.total || 0)).toLocaleString('es-CO')}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={String(cot.estado) === 'Convertida en Venta'
                          ? 'px-2 py-0.5 rounded-full text-xs bg-emerald-900 text-emerald-300'
                          : 'px-2 py-0.5 rounded-full text-xs bg-indigo-900 text-indigo-300'}>
                          {String(cot.estado || 'Cotización')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          <button
                            onClick={() => descargarCotizacionPDF(cot)}
                            className="px-3 py-1 bg-indigo-700 text-white text-xs rounded-lg hover:bg-indigo-600"
                          >
                            📄 PDF
                          </button>
                          {String(cot.estado) !== 'Convertida en Venta' && (
                          <button
                            onClick={() => convertirEnVenta(cot, String(cot.id))}
                            disabled={loading}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500 disabled:opacity-50"
                          >
                            ✅ Convertir en Venta
                          </button>
                          )}
                          {String(cot.estado) === 'Convertida en Venta' && (
                          <button
                            onClick={() => { setTab('cuenta'); setCcId(String(cot.ventaId || cot.id)); setTimeout(() => buscarCuentaCobro(String(cot.ventaId || cot.id)), 150); }}
                            className="px-3 py-1 bg-teal-700 text-white text-xs rounded-lg hover:bg-teal-600"
                          >
                            🧾 Ver Cobro
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

        {/* ─── ABONOS ─── */}
        {tab === 'abonos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">💰 ABONOS Y PAGOS PARCIALES</h2>
              <button onClick={cargarAbonos} className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">🔄 Recargar</button>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">📝 Registrar Abono por ID de Venta</h3>
              <div className="flex gap-3 items-end flex-wrap mb-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">ID de Venta</label>
                  <input type="text" value={abonoVentaId} onChange={e => setAbonoVentaId(e.target.value)}
                    placeholder="Ej: 1779063838818"
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-green-400 w-52"
                  />
                </div>
                {[1,2,3,4,5].map(n => (
                  <div key={n}>
                    <label className="text-xs text-gray-400 block mb-1">Abono {n}</label>
                    <input type="number" min="0"
                      value={abonoData['a'+n] || ''}
                      onChange={e => setAbonoData({...abonoData, ['a'+n]: Number(e.target.value)})}
                      className="w-24 px-2 py-2 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-green-400"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Observaciones</label>
                  <input type="text" value={abonoData.obs} onChange={e => setAbonoData({...abonoData, obs: e.target.value})}
                    placeholder="Nota..." className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-green-400 w-40"
                  />
                </div>
                <button onClick={() => guardarAbono(abonoVentaId)} disabled={savingAbono || !abonoVentaId}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
                >{savingAbono ? 'Guardando...' : '💾 Guardar'}</button>
              </div>
              {abonoVentaId && (() => {
                const v = ventas.find(x => x.id === abonoVentaId);
                if (!v) return <p className="text-xs text-red-400">ID no encontrado</p>;
                const prevAbonado = abonos.reduce((t, a) => a.ventaId === abonoVentaId ? a.totalAbonado : t, 0);
                const nuevoTotal = (abonoData.a1||0)+(abonoData.a2||0)+(abonoData.a3||0)+(abonoData.a4||0)+(abonoData.a5||0);
                const saldo = v.totalVenta - prevAbonado - nuevoTotal;
                return (
                  <div className="bg-gray-700/50 rounded-lg p-3 text-sm">
                    <p className="text-gray-300">Cliente: <span className="text-white font-bold">{v.cliente}</span> | Total: <span className="text-green-400 font-bold">{cop(v.totalVenta)}</span></p>
                    <p className="text-gray-300">Ya abonado: <span className="text-yellow-400">{cop(prevAbonado)}</span> | Saldo: <span className={saldo<=0?'text-green-400 font-bold':'text-yellow-400 font-bold'}>{cop(Math.max(saldo,0))}</span> {saldo<=0&&'✅'}</p>
                  </div>
                );
              })()}
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">📋 Historial de Abonos</h3>
              {abonos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-2">No hay abonos registrados.</p>
                  <button onClick={cargarAbonos} className="text-xs text-indigo-400 hover:text-indigo-300">🔄 Cargar desde Drive</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-gray-400 border-b border-gray-700 text-xs uppercase">
                      <th className="text-left py-2 pr-3">ID Venta</th>
                      <th className="text-left py-2 pr-3">Fecha</th>
                      <th className="text-left py-2 pr-3">Cliente</th>
                      <th className="text-right py-2 pr-3">Total Venta</th>
                      <th className="text-right py-2 pr-3">Total Abonado</th>
                      <th className="text-right py-2 pr-3">Saldo</th>
                      <th className="text-center py-2">Estado</th>
                    </tr></thead>
                    <tbody>
                      {abonos.map((a, idx) => (
                        <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 pr-3 text-xs font-mono text-indigo-400">{a.ventaId}</td>
                          <td className="py-2 pr-3 text-gray-300">{a.fecha}</td>
                          <td className="py-2 pr-3 text-gray-200">{a.cliente}</td>
                          <td className="py-2 pr-3 text-right text-gray-200">{cop(a.totalVenta)}</td>
                          <td className="py-2 pr-3 text-right text-green-400 font-bold">{cop(a.totalAbonado)}</td>
                          <td className="py-2 pr-3 text-right font-bold" style={{color: a.saldoPendiente<=0?'#4ade80':'#fbbf24'}}>{cop(Math.max(a.saldoPendiente,0))}</td>
                          <td className="py-2 text-center"><span className={'text-xs px-2 py-0.5 rounded-full '+(a.estado==='PAGADO'?'bg-green-900 text-green-300':'bg-yellow-900 text-yellow-300')}>{a.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
