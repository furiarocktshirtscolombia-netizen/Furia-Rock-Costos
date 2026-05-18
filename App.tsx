import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ══ DATOS REALES DEL SPREADSHEET FURIA ROCK ══════════════════════════
const REFS_DEFAULT: Ref[] = [
  { id:"r1",  name:"CAMISETA ALGODON PERUANO 178G",           cost:18000, cat:"Adulto" },
  { id:"r2",  name:"CAMISETA ALGODON PERUANO 320G",           cost:37000, cat:"Adulto" },
  { id:"r3",  name:"CAMISETA ALGODON PERUANO 270G",           cost:33000, cat:"Adulto" },
  { id:"r4",  name:"CAMISETA CATAR",                          cost:37000, cat:"Adulto" },
  { id:"r5",  name:"CAMISETA C4 ALGODON NACIONAL 200G",       cost:19000, cat:"Adulto" },
  { id:"r6",  name:"HOODIE PERUANO 400G",                     cost:82000, cat:"Adulto" },
  { id:"r7",  name:"CAMISETA NINO ALGODON PERUANO 200G",      cost:24000, cat:"Nino"   },
  { id:"r8",  name:"CAMISETA NINO NACIONAL 200G",             cost:14000, cat:"Nino"   },
  { id:"r9",  name:"CAMISETA ACID WASH NINO",                 cost:18000, cat:"Nino"   },
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
const TIPOS_IMP        = ["DTF","DTG"];
const SEDES            = ["Medellin","Bogota","Cali","Online","Otra"];
const FORMAS_CAMISETA  = ["Oversize","Regular Fit"];

// Helper: detectar si una referencia es de Niño (acepta "Nino","niño","nino","Niño",etc.)
const esNino = (cat: string) =>
  cat.toLowerCase().replace(/[^a-z]/g,'').includes('nin');

// COSTOS FIJOS DE PRODUCCION
const GANANCIA_NETA_FIJA = 30000;
const DTF_POR_CM2        = 170;
const COSTO_EMPAQUE      = 1300;
const COSTO_PLANCHADA    = 1000;

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
}
interface Compra {
  id:string; fecha:string; refId:string; ref:string; cat:string;
  color:string; talla:string; cantidad:number; precio:number; total:number;
  proveedor:string; notas:string; forma:string;
}
interface Calc { costo:number; precio:number }
type Tab = 'cotizador'|'ventas'|'compras'|'inventario'|'dashboard'|'cuenta'|'cotizaciones';

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
    return found ? found.name : (ref || refId || '—');
  };
  const map: Record<string, Item> = {};
  compras.forEach(c => {
    const k = `${c.refId}|${c.talla}|${c.color}|${c.forma || '_'}`;
    if (!map[k]) map[k] = { ref: resolveRef(c.ref, c.refId), refId: c.refId, cat: c.cat, talla: c.talla, color: c.color, forma: c.forma || '—', comprado: 0, vendido: 0, stock: 0, estado: '' };
    map[k].comprado += c.cantidad;
  });
  ventas.forEach(v => {
    const k = `${v.refId}|${v.talla}|${v.color}|${v.forma || '_'}`;
    if (!map[k]) map[k] = { ref: resolveRef(v.ref, v.refId), refId: v.refId, cat: v.cat, talla: v.talla, color: v.color, forma: v.forma || '—', comprado: 0, vendido: 0, stock: 0, estado: '' };
    map[k].vendido += v.cantidad;
  });
  Object.values(map).forEach(i => {
    i.stock = i.comprado - i.vendido;
    i.estado = i.stock > 5 ? 'OK' : i.stock > 2 ? 'Bajo' : 'Crítico';
    if (!i.ref || i.ref === '—' || /^r\d+$/.test(i.ref)) {
      const found = refsList.find(r => r.id === i.refId);
      if (found) i.ref = found.name;
    }
  });
  return Object.values(map);
};
const cop  = (n:number) => '$' + Math.round(n).toLocaleString('es-CO');
const today = () => new Date().toISOString().split('T')[0];
const uid   = () => Date.now().toString();

const calcPrice = (ref: Ref, qty: number, tipoImp: string, cmDTF: number, numPlanchadas: number, costoDTG: number): Calc => {
  const base       = ref.cost;
  const empaque    = COSTO_EMPAQUE;
  let impresion    = 0;
  if (tipoImp === 'DTF') impresion = cmDTF * DTF_POR_CM2 + numPlanchadas * COSTO_PLANCHADA;
  if (tipoImp === 'DTG') impresion = costoDTG;
  const costoUnit  = base + empaque + impresion;
  const precioUnit = Math.ceil((costoUnit + GANANCIA_NETA_FIJA) / 500) * 500;
  return { costo: costoUnit * qty, precio: precioUnit * qty };
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
    <option value="">— Selecciona —</option>
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
  const [ventas, setVentas]     = useState<Venta[]>([]);
  const [compras, setCompras]   = useState<Compra[]>([]);

  const [invDrive, setInvDrive] = useState<any[]>([]);  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');

  // Cotizador
  const [selRef,        setSelRef]        = useState('');
  const [selColor,      setSelColor]      = useState('');
  const [selTalla,      setSelTalla]      = useState('');
  const [selQty,        setSelQty]        = useState(1);
  const [selTipoImp,    setSelTipoImp]    = useState('DTF');
  const [selForma,      setSelForma]      = useState('');
  const [cmDTF,         setCmDTF]         = useState(100);
  const [numPlanchadas, setNumPlanchadas] = useState(3);
  const [costoDTG,      setCostoDTG]      = useState(0);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTel,    setClienteTel]    = useState('');
  const [clienteDoc,    setClienteDoc]    = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteSede,   setClienteSede]   = useState('');
  const [clienteDiseno, setClienteDiseno] = useState('');
  const [clienteOrden,  setClienteOrden]  = useState('');
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
  const coloresDisp  = currentRef ? (colorMap[currentRef.name] || COLORES_DEFAULT) : COLORES_DEFAULT;
  // Tallas: si la referencia es de niño → tallas niño; adulto → tallas adulto
  // Se usa esNino() para que funcione con cualquier variante del texto (Nino, niño, Niño, nino)
  const tallasDisp   = currentRef
    ? (esNino(currentRef.cat) ? TALLAS_NINO : TALLAS_ADULTO)
    : TODAS_TALLAS;
  const calc         = currentRef ? calcPrice(currentRef, selQty, selTipoImp, cmDTF, numPlanchadas, costoDTG) : null;
  const inventario   = useMemo(() => calcInventario(ventas, compras, refs), [ventas, compras, refs]);

  // Compras: ref seleccionada y sus colores disponibles
  const cCurrentRef = refs.find(r => r.id === cRef);
  const cColoresDisp = cCurrentRef ? (colorMap[cCurrentRef.name] || COLORES_DEFAULT) : COLORES_DEFAULT;


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
          ref: refName || '—',
          cat: i.categoria || i.cat || '',
          talla: i.talla || '',
          color: i.color || '',
          forma: i.forma || '—',
          comprado: Number(i.comprado || 0),
          vendido: Number(i.vendido || 0),
          stock: Number(i.stock || 0),
          estado: i.estado || (Number(i.stock || 0) > 5 ? 'OK' : Number(i.stock || 0) > 2 ? 'Bajo' : 'Crítico'),
        };
      });
    }
    return inventario;
  }, [invDrive, inventario, refs, compras, ventas]);
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
      accion: 'sincronizarResultados',
      ventas:    { unidades: v.reduce((a,x)=>a+x.cantidad,0), ingresos: totalVentas, costo: costoVentas, ganancia: gananciaVentas },
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
    setSelTipoImp('DTF'); setCmDTF(100); setNumPlanchadas(3); setCostoDTG(0);
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
      String(i + 1), item.ref, item.color, item.talla, item.forma || '—',
      String(item.qty), cop(item.precio), cop(item.precio * item.qty),
    ]);
    const total = cartItems.reduce((s, i) => s + i.precio * i.qty, 0);

    (pdf as any).autoTable({
      startY: tableY,
      head: [['#', 'REFERENCIA', 'COLOR', 'TALLA', 'FORMA', 'CANT', 'P. UNIT', 'SUBTOTAL']],
      body: tableData,
      foot: [['', '', '', '', '', '', 'TOTAL PEDIDO', cop(total)]],
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
        pdf.text('FURIA ROCK · Camisetas & Diseño Personalizado', ml, footY);
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
      pdf.text('· Esta cotización tiene vigencia de 5 días hábiles.', ml, finalY + 5);
      pdf.text('· Los precios están sujetos a cambios sin previo aviso.', ml, finalY + 10);
      pdf.text('· Para confirmar el pedido se requiere abono del 50%.', ml, finalY + 15);
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
      const refName = row.Referencia || row.referencia || row.ref || '—';
      const colorV = row.Color || row.color || '—';
      const tallaV = row.Talla || row.talla || '—';
      const formaV = row.Forma || row.forma || '—';
      const cantV = row.Cantidad || row.cantidad || '—';
      const precioV = Number(String(row['Precio Unit.'] || row.precioUnit || 0).replace(/[^0-9.]/g, ''));
      const totalV = Number(String(row['Total Venta'] || row.totalVenta || 0).replace(/[^0-9.]/g, ''));
      return [String(i + 1), refName, colorV, tallaV, formaV, String(cantV), cop(precioV), cop(totalV)];
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
        pdf.text('FURIA ROCK · Camisetas & Diseño Personalizado', ml, footY);
        pdf.text('Cuenta de Cobro · ID: ' + idVenta, pageW / 2, footY, { align: 'center' });
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
        direccion: clienteDireccion, ordenInterna: clienteOrden
      };
      nuevasVentas.unshift(v);
      try {
        const res = await sendToGAS({ accion:'guardarVenta', ...v });
        if (res.status !== 'ok') { setGasErr('Error Drive: ' + res.msg); }
      } catch(e) { setGasErr('Sin conexion Drive'); }
    }
    const nuevoInv = calcInventario(nuevasVentas, compras);
    try {
      await sendToGAS({ accion:'sincronizarInventarioBatch', rows: nuevoInv });
      await sincrResultados(nuevasVentas, compras, nuevoInv);
    } catch {}
    setVentas(nuevasVentas);
    localStorage.setItem('ventas', JSON.stringify(nuevasVentas));
    setCartItems([]);
    setClienteNombre(''); setClienteTel(''); setClienteDoc('');
    setClienteDireccion(''); setClienteSede(''); setClienteDiseno(''); setClienteOrden('');
    showToast('Pedido registrado ✓');
    setLoading(false);
  };

  const registrarCompra = async () => {
    const r = refs.find(x => x.id === cRef);
    if (!r || !cColor || !cTalla || cQty < 1) { showToast('Completa todos los campos'); return; }
    setLoading(true);
    const c: Compra = {
      id: uid(), fecha: today(), refId: r.id, ref: r.name, cat: r.cat,
      color: cColor, talla: cTalla, cantidad: cQty,
      precio: cPrecio, total: cPrecio * cQty,
      proveedor: cProv, notas: cNotas, forma: cForma
    };
    const nuevasCompras = [c, ...compras];
    const nuevoInv      = calcInventario(ventas, nuevasCompras);
    try {
      await sendToGAS({ accion:'guardarCompra', ...c });
      await sendToGAS({ accion:'sincronizarInventarioBatch', rows: nuevoInv });
      await sincrResultados(ventas, nuevasCompras, nuevoInv);
    } catch {}
    setCompras(nuevasCompras);
    localStorage.setItem('compras', JSON.stringify(nuevasCompras));
    setCRef(''); setCColor(''); setCTalla(''); setCQty(1); setCPrecio(0); setCProv(''); setCNotas(''); setCForma('');
    showToast('Compra registrada ✓');
    setLoading(false);
  };

    // ── Cotizaciones ─────────────────────────────────────────────────
  const [cotizaciones, setCotizaciones] = React.useState<any[]>([]);
  const [loadingCot, setLoadingCot] = React.useState(false);

  const guardarCotizacion = async () => {
    if (cartItems.length === 0) { showToast('Agrega al menos un item al carrito'); return; }
    setLoadingCot(true);
    try {
      const cotData = {
        fecha: new Date().toISOString().split('T')[0],
        cliente: clienteNombre || 'Sin nombre',
        telefono: clienteTelefono || '',
        documento: clienteDocumento || '',
        total: cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0),
        observaciones: '',
        usuario: 'App',
        items: cartItems.map(i => ({
          refId: i.refId, refName: i.refName, nombre: i.refName,
          color: i.color, talla: i.talla, forma: i.forma,
          cantidad: i.cantidad, precio: i.precio, precioUnit: i.precio,
          categoria: i.categoria, costo: i.costo || 0
        }))
      };
      const resp = await sendToGAS({ action: 'guardarCotizacion', cotizacion: cotData });
      if (resp.status === 'ok') {
        showToast('Cotizacion guardada: ' + resp.id);
        cargarCotizaciones();
      } else { showToast('Error: ' + (resp.msg || 'desconocido')); }
    } catch (e: any) { showToast('Error al guardar: ' + e.message); }
    setLoadingCot(false);
  };

  const cargarCotizaciones = async () => {
    try {
      const GAS_URL = 'https://script.google.com/macros/s/AKfycby9m-yDkajrDZylNyGjsrWW_EkqSCcRFX3Y63p4mmO8XK6-c2vw24VT8TRH5VnWF5CA/exec';
      const resp = await fetch(GAS_URL + '?action=getCotizaciones&t=' + Date.now());
      const d = await resp.json();
      if (d.cotizaciones) setCotizaciones(d.cotizaciones);
    } catch (_e) { /* ignore */ }
  };

  const convertirEnVenta = async (cot: any, cotId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const cantArr = String(cot['Cantidades'] || '1').split(' / ');
      const precioArr = String(cot['Precio Unitario'] || '0').split(' / ');
      const items = String(cot['Referencias (detalle)'] || '').split(' / ').map((det: string, idx: number) => {
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
          fecha: cot['Fecha'] || new Date().toISOString().split('T')[0],
          cliente: cot['Cliente'] || '', telefono: cot['Telefono'] || '',
          documento: cot['Documento'] || '', total: cot['Total'] || 0,
          items
        }
      });
      if (resp.status === 'ok') {
        showToast('Convertida en venta exitosamente');
        cargarCotizaciones();
      } else { showToast('Error: ' + (resp.msg || 'desconocido')); }
    } catch (e: any) { showToast('Error: ' + e.message); }
    setLoading(false);
  };

  // Helper to resolve reference name from refs array
  const resolveRefName = (refId: string): string => {
    const found = refs.find(r => r.id === refId || r.name === refId);
    return found ? found.name : (refId || '—');
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
    {id:'cotizador', label:'🧮 Cotizador'},
    {id:'ventas',    label:'💰 Ventas'},
    {id:'compras',   label:'📦 Compras'},
    {id:'inventario',label:'📊 Inventario'},
    {id:'dashboard', label:'📈 Dashboard'},
    {id:'cuenta',    label:'🧾 Cuenta de Cobro'},
    {id:'cotizaciones', label:'📋 Cotizaciones'},
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {toast && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">{toast}</div>
      )}
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
                <FG label="Tipo de impresion">
                  <Sel options={TIPOS_IMP} value={selTipoImp} onChange={e => { setSelTipoImp(e.target.value); setCostoDTG(0); }} />
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
                <div className="mt-2 p-3 bg-gray-700 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between text-gray-400"><span>Base camisa:</span><span>{currentRef ? cop(currentRef.cost) : '—'}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Empaque:</span><span>{cop(COSTO_EMPAQUE)}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Impresion:</span><span>{currentRef ? cop(selTipoImp==='DTF' ? cmDTF*DTF_POR_CM2 + numPlanchadas*COSTO_PLANCHADA : costoDTG) : '—'}</span></div>
                  <div className="flex justify-between font-semibold text-white border-t border-gray-600 pt-1"><span>Costo total ({selQty} und):</span><span>{calc ? cop(calc.costo) : '—'}</span></div>
                  <div className="flex justify-between font-semibold text-green-400"><span>Precio sugerido ({selQty} und):</span><span>{calc ? cop(calc.precio) : '—'}</span></div>
                  <div className="flex justify-between text-gray-400 text-xs"><span>Ganancia neta:</span><span>{calc ? cop(GANANCIA_NETA_FIJA * selQty) : '—'}</span></div>
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
                          <td colSpan={5} className="py-1 text-gray-400 text-xs font-semibold">TOTAL PEDIDO</td>
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
          <Card>
            <div className="flex items-center justify-between mb-3">
              <CardTitle text={`Historial de Ventas (${ventas.length})`} />
              <Btn variant="secondary" onClick={() => exportCSV(ventas,'ventas')}>⬇ CSV</Btn>
            </div>
            {ventas.length === 0 ? <p className="text-gray-500 text-sm">No hay ventas registradas.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-3">Fecha</th>
                    <th className="text-left py-2 pr-3">Cliente</th>
                    <th className="text-left py-2 pr-3">Referencia</th>
                    <th className="text-left py-2 pr-3">Color</th>
                    <th className="text-left py-2 pr-3">Talla</th>
                    <th className="text-left py-2 pr-3">Forma</th>
                    <th className="text-right py-2 pr-3">Cant.</th>
                    <th className="text-right py-2 pr-3">Total</th>
                    <th className="text-right py-2">Ganancia</th>
                  </tr></thead>
                  <tbody>
                    {ventas.map(v => (
                      <tr key={v.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-2 pr-3 text-gray-300">{v.fecha}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.cliente || '—'}</td>
                        <td className="py-2 pr-3 text-gray-200">{v.ref || resolveRefName(v.refId)}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.color}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.talla}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.forma || '—'}</td>
                        <td className="py-2 pr-3 text-right text-gray-300">{v.cantidad}</td>
                        <td className="py-2 pr-3 text-right text-green-400">{cop(v.totalVenta)}</td>
                        <td className="py-2 text-right text-indigo-400">{cop(v.ganancia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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
                <div className="grid grid-cols-2 gap-3">
                  <FG label="Color"><Sel options={cColoresDisp} value={cColor} onChange={e => setCColor(e.target.value)} /></FG>
                  <FG label="Talla"><Sel options={TODAS_TALLAS} value={cTalla} onChange={e => setCTalla(e.target.value)} /></FG>
                </div>
                <FG label="Forma de la camiseta">
                  <Sel options={FORMAS_CAMISETA} value={cForma} onChange={e => setCForma(e.target.value)} />
                </FG>
                <div className="grid grid-cols-2 gap-3">
                  <FG label="Cantidad"><Inp type="number" min={1} value={cQty} onChange={e => setCQty(Number(e.target.value))} /></FG>
                  <FG label="Precio unitario (COP)"><Inp type="number" min={0} value={cPrecio} onChange={e => setCPrecio(Number(e.target.value))} /></FG>
                </div>
                <FG label="Proveedor"><Inp value={cProv} onChange={e => setCProv(e.target.value)} placeholder="Nombre del proveedor" /></FG>
                <FG label="Notas"><Inp value={cNotas} onChange={e => setCNotas(e.target.value)} placeholder="Observaciones" /></FG>
                <Btn onClick={registrarCompra} disabled={loading}>{loading ? 'Guardando…' : '+ Registrar Compra'}</Btn>
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <CardTitle text={`Historial de Compras (${compras.length})`} />
                <Btn variant="secondary" onClick={() => exportCSV(compras,'compras')}>⬇ CSV</Btn>
              </div>
              {compras.length === 0 ? <p className="text-gray-500 text-sm">No hay compras registradas.</p> : (
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
                      {compras.map(c => (
                        <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 pr-3 text-gray-300">{c.fecha}</td>
                          <td className="py-2 pr-3 text-gray-200">{c.ref || resolveRefName(c.refId)}</td>
                          <td className="py-2 pr-3 text-gray-300">{c.forma || '—'}</td>
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
                      <td className="py-2 pr-3 text-gray-300">{i.forma && i.forma !== '_' ? i.forma : '—'}</td>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:'Total Ingresos',    val: cop(ventas.reduce((a,v)=>a+v.totalVenta,0)), color:'text-green-400' },
                { label:'Total Costo',       val: cop(ventas.reduce((a,v)=>a+v.costo,0)),      color:'text-red-400'   },
                { label:'Ganancia Bruta',    val: cop(ventas.reduce((a,v)=>a+v.ganancia,0)),   color:'text-indigo-400'},
                { label:'Unidades Vendidas', val: ventas.reduce((a,v)=>a+v.cantidad,0).toString(), color:'text-yellow-400'},
              ].map(k => (
                <Card key={k.label} className="text-center">
                  <p className={`text-3xl font-bold ${k.color}`}>{k.val}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.label}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardTitle text="Últimas 5 Ventas" />
                <div className="space-y-2">
                  {ventas.slice(0,5).map(v => (
                    <div key={v.id} className="flex justify-between items-center text-sm">
                      <div><span className="text-gray-200">{v.ref}</span><span className="text-gray-500 ml-2">{v.talla} / {v.color}</span></div>
                      <span className="text-green-400">{cop(v.totalVenta)}</span>
                    </div>
                  ))}
                  {ventas.length === 0 && <p className="text-gray-500 text-sm">Sin ventas aún</p>}
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
                    if (e.target.value.trim().length > 5) buscarCuentaCobro(e.target.value.trim());
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
              const clienteNom  = fila0['Cliente']   || fila0['cliente']   || '—';
              const clienteFon  = fila0['Telefono']  || fila0['telefono']  || '—';
              const clienteDoc2 = fila0['Documento'] || fila0['documento'] || '—';
              const clienteDir  = fila0['Direccion'] || fila0['direccion'] || '—';
              const clienteS    = fila0['Sede']      || fila0['sede']      || '—';
              const fecha       = fila0['Fecha']     || fila0['fecha']     || '—';
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
                            const refName = row['Referencia']||row['referencia']||row['ref']||'—';
                            const colorV  = row['Color']||row['color']||'—';
                            const tallaV  = row['Talla']||row['talla']||'—';
                            const formaV  = row['Forma']||row['forma']||'—';
                            const cantV   = row['Cantidad']||row['cantidad']||0;
                            const ordenV  = row['OrdenInterna']||row['ordenInterna']||row['Orden interna']||'—';
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">📋 REGISTRO DE COTIZACIONES</h2>
            <button onClick={cargarCotizaciones} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500">
              🔄 Actualizar
            </button>
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
                  {cotizaciones.map((cot: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-700 hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-indigo-400 font-mono text-xs">{String(cot['ID'] || '-')}</td>
                      <td className="px-3 py-2 text-slate-300">{String(cot['Fecha'] || '-')}</td>
                      <td className="px-3 py-2 text-white font-medium">{String(cot['Cliente'] || '-')}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs max-w-xs">{String(cot['Referencias (detalle)'] || '-').slice(0, 60)}</td>
                      <td className="px-3 py-2 text-emerald-400 font-bold text-right">
                        {'$' + (Number(cot['Total']) || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={String(cot['Estado']) === 'Convertida en Venta'
                          ? 'px-2 py-0.5 rounded-full text-xs bg-emerald-900 text-emerald-300'
                          : 'px-2 py-0.5 rounded-full text-xs bg-indigo-900 text-indigo-300'}>
                          {String(cot['Estado'] || 'Cotización')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {String(cot['Estado']) !== 'Convertida en Venta' && (
                          <button
                            onClick={() => convertirEnVenta(cot, String(cot['ID']))}
                            disabled={loading}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500 disabled:opacity-50"
                          >
                            ✅ Convertir en Venta
                          </button>
                        )}
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
    </div>
  );
}
