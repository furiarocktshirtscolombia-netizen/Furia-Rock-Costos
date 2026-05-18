import { useState, useMemo, useEffect } from 'react';

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

const COLORES_DEFAULT = ["NEGRO","BLANCO","VERDE PINO","VERDE NACIONAL","AZUL CIELO","ROJO","GRIS","AZUL MARINO","ROSADO","MOSTAZA"]
const TALLAS_ADULTO   = ["XS","S","M","L","XL","XXL"];
const TALLAS_NINO     = ["2","4","6","8","10","12","14","16"];
const TIPOS_IMP       = ["DTF","DTG"];
const SEDES           = ["Medellin","Bogota","Cali","Online","Otra"];

// COSTOS FIJOS DE PRODUCCION
const GANANCIA_NETA_FIJA = 30000;   // COP ganancia neta por articulo
const DTF_POR_CM2        = 170;     // COP por cm2 de area DTF
const COSTO_EMPAQUE      = 1300;    // COP empaque fijo por unidad
const COSTO_PLANCHADA    = 1000;    // COP por planchada (cantidad manual)

const GAS_URL = 'https://script.google.com/macros/s/AKfycby9m-yDkajrDZyINyGjsrWW_Efu48IbI9GtjOpU0aIsO_uZsMppobAnIx8hIRU1yYsd/exec';

// ─── Types ────────────────────────────────────────────────────────────
interface Ref  { id:string; name:string; cost:number; cat:string }
interface Item { ref:string; refId:string; cat:string; talla:string; color:string; comprado:number; vendido:number; stock:number; estado:string }
interface Venta {
  id:string; fecha:string; cliente:string; ref:string; refId:string;
  talla:string; color:string; cantidad:number; cat:string;
  precio:number; totalVenta:number; costo:number; ganancia:number;
  tipoImp:string; diseno:string; sede:string;
  telefono:string; documento:string; direccion:string; ordenInterna:string;
}
interface Compra {
  id:string; fecha:string; refId:string; ref:string; cat:string;
  color:string; talla:string; cantidad:number; precio:number; total:number;
  proveedor:string; notas:string;
}
interface Calc { costo:number; precio:number }
type Tab = 'cotizador'|'ventas'|'compras'|'inventario'|'dashboard'|'cuenta';

// ─── Helpers ──────────────────────────────────────────────────────────
const sendToGAS = async (body: object) => {
  const r = await fetch(GAS_URL, {
    method:'POST', redirect:'follow',
    body: JSON.stringify(body)
  });
  return r.json();
};

const calcInventario = (ventas: Venta[], compras: Compra[]) => {
  const map: Record<string,Item> = {};
  compras.forEach(c => {
    const k = c.refId+'|'+c.talla+'|'+c.color;
    if (!map[k]) map[k] = { ref:c.ref, refId:c.refId, cat:c.cat, talla:c.talla, color:c.color, comprado:0, vendido:0, stock:0, estado:'' };
    map[k].comprado += c.cantidad;
  });
  ventas.forEach(v => {
    const k = v.refId+'|'+v.talla+'|'+v.color;
    if (!map[k]) map[k] = { ref:v.ref, refId:v.refId, cat:v.cat, talla:v.talla, color:v.color, comprado:0, vendido:0, stock:0, estado:'' };
    map[k].vendido += v.cantidad;
  });
  Object.values(map).forEach(i => {
    i.stock = i.comprado - i.vendido;
    i.estado = i.stock > 5 ? 'OK' : i.stock > 2 ? 'Bajo' : 'Critico';
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
  // State
  const [tab, setTab]           = useState<Tab>('cotizador');
  const [refs, setRefs]         = useState<Ref[]>(() => loadLS('refs', REFS_DEFAULT));
  const [colorMap, setColorMap] = useState<Record<string,string[]>>(() => loadLS('colorMap', {}));
  const [ventas, setVentas]     = useState<Venta[]>(() => loadLS('ventas', []));
  const [compras, setCompras]   = useState<Compra[]>(() => loadLS('compras', []));
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');

  // Cotizador
  const [selRef,      setSelRef]      = useState('');
  const [selColor,    setSelColor]    = useState('');
  const [selTalla,    setSelTalla]    = useState('');
  const [selQty,      setSelQty]      = useState(1);
  const [selTipoImp,  setSelTipoImp]  = useState('DTF');
  const [cmDTF,       setCmDTF]       = useState(100);
  const [numPlanchadas, setNumPlanchadas] = useState(3);
  const [costoDTG,    setCostoDTG]    = useState(0);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTel,    setClienteTel]    = useState('');
  const [clienteDoc,    setClienteDoc]    = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteSede,   setClienteSede]   = useState('');
  const [clienteDiseno, setClienteDiseno] = useState('');
  const [clienteOrden,  setClienteOrden]  = useState('');
  const [gasErr,  setGasErr]  = useState('');

  // Compras
  const [cRef,    setCRef]    = useState('');
  const [cColor,  setCColor]  = useState('');
  const [cTalla,  setCTalla]  = useState('');
  const [cQty,    setCQty]    = useState(1);
  const [cPrecio, setCPrecio] = useState(0);
  const [cProv,   setCProv]   = useState('');
  const [cNotas,  setCNotas]  = useState('');

  // Cuenta de Cobro
  const [ccId,      setCcId]      = useState('');
  const [ccData,    setCcData]    = useState<any>(null);
  const [ccStatus,  setCcStatus]  = useState<'idle'|'loading'|'found'|'not_found'|'error'>('idle');
  const [ccMsg,     setCcMsg]     = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Load from Drive on mount
  useEffect(() => {
    fetch(GAS_URL)
      .then(r => r.json())
      .then(d => {
        if (d.refs  && d.refs.length)    { setRefs(d.refs);      localStorage.setItem('refs',     JSON.stringify(d.refs)); }
        if (d.colorMap)                  { setColorMap(d.colorMap); localStorage.setItem('colorMap', JSON.stringify(d.colorMap)); }
        if (d.inventario && d.inventario.length) localStorage.setItem('invDrive', JSON.stringify(d.inventario));
      })
      .catch(() => {});
  }, []);

  // Derived
  const currentRef   = refs.find(r => r.id === selRef);
  const coloresDisp  = currentRef ? (colorMap[currentRef.name] || COLORES_DEFAULT) : COLORES_DEFAULT;
  const tallasDisp   = currentRef?.cat === 'Nino' ? TALLAS_NINO : TALLAS_ADULTO;
  const calc         = currentRef ? calcPrice(currentRef, selQty, selTipoImp, cmDTF, numPlanchadas, costoDTG) : null;
  const inventario   = useMemo(() => calcInventario(ventas, compras), [ventas, compras]);

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

  // ── Registrar Venta ────────────────────────────────────────────────
  const registrarVenta = async () => {
    if (!currentRef || !selColor || !selTalla) { showToast('Completa todos los campos'); return; }
    setLoading(true); setGasErr('');
    const v: Venta = {
      id: uid(), fecha: today(), cliente: clienteNombre,
      ref: currentRef.name, refId: currentRef.id,
      talla: selTalla, color: selColor, cantidad: selQty,
      cat: currentRef.cat, precio: calc!.precio / selQty,
      totalVenta: calc!.precio, costo: calc!.costo,
      ganancia: calc!.precio - calc!.costo,
      tipoImp: selTipoImp, diseno: clienteDiseno, sede: clienteSede,
      telefono: clienteTel, documento: clienteDoc,
      direccion: clienteDireccion, ordenInterna: clienteOrden
    };
    const nuevasVentas  = [v, ...ventas];
    const nuevoInv      = calcInventario(nuevasVentas, compras);
    try {
      const res = await sendToGAS({ accion:'guardarVenta', ...v });
      if (res.status !== 'ok') { setGasErr('Error Drive: ' + res.msg); }
      await sendToGAS({ accion:'sincronizarInventarioBatch', rows: nuevoInv });
      await sincrResultados(nuevasVentas, compras, nuevoInv);
    } catch(e) { setGasErr('Sin conexion Drive'); }
    setVentas(nuevasVentas);
    localStorage.setItem('ventas', JSON.stringify(nuevasVentas));
    setSelRef(''); setSelColor(''); setSelTalla(''); setSelQty(1);
    setSelTipoImp('DTF'); setCmDTF(100); setNumPlanchadas(3); setCostoDTG(0);
    setClienteNombre(''); setClienteTel(''); setClienteDoc('');
    setClienteDireccion(''); setClienteSede(''); setClienteDiseno(''); setClienteOrden('');
    showToast('Venta registrada ✓');
    setLoading(false);
  };

  // ── Registrar Compra ───────────────────────────────────────────────
  const registrarCompra = async () => {
    const r = refs.find(x => x.id === cRef);
    if (!r || !cColor || !cTalla || cQty < 1) { showToast('Completa todos los campos'); return; }
    setLoading(true);
    const c: Compra = {
      id: uid(), fecha: today(), refId: r.id, ref: r.name, cat: r.cat,
      color: cColor, talla: cTalla, cantidad: cQty,
      precio: cPrecio, total: cPrecio * cQty,
      proveedor: cProv, notas: cNotas
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
    setCRef(''); setCColor(''); setCTalla(''); setCQty(1); setCPrecio(0); setCProv(''); setCNotas('');
    showToast('Compra registrada ✓');
    setLoading(false);
  };

  // ── Buscar Cuenta de Cobro ─────────────────────────────────────────
  const buscarCuentaCobro = async (id: string) => {
    if (!id.trim()) return;
    setCcStatus('loading');
    setCcData(null);
    setCcMsg('');
    try {
      const res = await fetch(GAS_URL + '?ventaId=' + encodeURIComponent(id.trim()));
      const data = await res.json();
      if (data.status === 'ok' && data.filas && data.filas.length > 0) {
        setCcData(data.filas);
        setCcStatus('found');
      } else if (data.status === 'not_found') {
        setCcStatus('not_found');
        setCcMsg('Esta venta no existe. Verifica el ID.');
      } else {
        setCcStatus('error');
        setCcMsg('Error al consultar: ' + (data.msg || data.error || 'desconocido'));
      }
    } catch(e) {
      setCcStatus('error');
      setCcMsg('Error de conexion. Verifica la red.');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  const tabs: {id:Tab; label:string}[] = [
    {id:'cotizador', label:'🧮 Cotizador'},
    {id:'ventas',    label:'💰 Ventas'},
    {id:'compras',   label:'📦 Compras'},
    {id:'inventario',label:'📊 Inventario'},
    {id:'dashboard', label:'📈 Dashboard'},
    {id:'cuenta',    label:'🧾 Cuenta de Cobro'},
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {toast && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold text-white">⚡ FURIA ROCK – Gestión de Costos</h1>
        <p className="text-xs text-gray-400 mt-0.5">Sincronizado con Google Drive</p>
      </div>
      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab===t.id ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* ═══ COTIZADOR ═══ */}
        {tab === 'cotizador' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Producto */}
            <Card>
              <CardTitle text="Producto" />
              <div className="space-y-3">
                <FG label="Referencia">
                  <Sel options={refs.map(r => r.name)} value={currentRef?.name ?? ''} onChange={e => {
                    const r = refs.find(x => x.name === e.target.value);
                    setSelRef(r?.id ?? '');
                    setSelColor(''); setSelTalla('');
                  }} />
                </FG>
                <FG label="Color">
                  <Sel options={coloresDisp} value={selColor} onChange={e => setSelColor(e.target.value)} />
                </FG>
                <FG label="Talla">
                  <Sel options={tallasDisp} value={selTalla} onChange={e => setSelTalla(e.target.value)} />
                </FG>
                <FG label="Cantidad">
                  <Inp type="number" min={1} value={selQty} onChange={e => setSelQty(Number(e.target.value))} />
                </FG>
              </div>
            </Card>

            {/* Costos de produccion */}
            <Card>
              <CardTitle text="Costos de Produccion" />
              <div className="space-y-3">
                <FG label="Tipo de impresion">
                  <Sel options={TIPOS_IMP} value={selTipoImp} onChange={e => {
                    setSelTipoImp(e.target.value);
                    setCostoDTG(0);
                  }} />
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
                  <div className="flex justify-between text-gray-400">
                    <span>Base camisa:</span>
                    <span>{currentRef ? cop(currentRef.cost) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Empaque:</span>
                    <span>{cop(COSTO_EMPAQUE)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Impresion:</span>
                    <span>{currentRef ? cop(selTipoImp==='DTF' ? cmDTF*DTF_POR_CM2 + numPlanchadas*COSTO_PLANCHADA : costoDTG) : '—'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-white border-t border-gray-600 pt-1">
                    <span>Costo total ({selQty} und):</span>
                    <span>{calc ? cop(calc.costo) : '—'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-400">
                    <span>Precio sugerido ({selQty} und):</span>
                    <span>{calc ? cop(calc.precio) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-xs">
                    <span>Ganancia neta:</span>
                    <span>{calc ? cop(GANANCIA_NETA_FIJA * selQty) : '—'}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Datos del cliente */}
            <Card className="lg:col-span-2">
              <CardTitle text="Datos del Cliente" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FG label="Nombre del cliente">
                  <Inp value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre completo" />
                </FG>
                <FG label="Teléfono / Contacto">
                  <Inp value={clienteTel} onChange={e => setClienteTel(e.target.value)} placeholder="Ej: 3001234567" />
                </FG>
                <FG label="Documento">
                  <Inp value={clienteDoc} onChange={e => setClienteDoc(e.target.value)} placeholder="CC / NIT" />
                </FG>
                <FG label="Dirección">
                  <Inp value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} placeholder="Dirección de entrega" />
                </FG>
                <FG label="Sede / Punto de venta">
                  <Sel options={SEDES} value={clienteSede} onChange={e => setClienteSede(e.target.value)} />
                </FG>
                <FG label="Diseño">
                  <Inp value={clienteDiseno} onChange={e => setClienteDiseno(e.target.value)} placeholder="Nombre del diseño" />
                </FG>
                <FG label="Orden interna (referencia interna)">
                  <Inp value={clienteOrden} onChange={e => setClienteOrden(e.target.value)} placeholder="Ej: ORD-001" />
                </FG>
              </div>
              {gasErr && <p className="text-red-400 text-xs mt-2">{gasErr}</p>}
              <div className="mt-4">
                <Btn onClick={registrarVenta} disabled={loading || !currentRef || !selColor || !selTalla}>
                  {loading ? 'Guardando…' : '✓ Registrar Venta'}
                </Btn>
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
            {ventas.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay ventas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-3">Fecha</th>
                      <th className="text-left py-2 pr-3">Cliente</th>
                      <th className="text-left py-2 pr-3">Referencia</th>
                      <th className="text-left py-2 pr-3">Color</th>
                      <th className="text-left py-2 pr-3">Talla</th>
                      <th className="text-right py-2 pr-3">Cant.</th>
                      <th className="text-right py-2 pr-3">Total</th>
                      <th className="text-right py-2">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map(v => (
                      <tr key={v.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-2 pr-3 text-gray-300">{v.fecha}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.cliente || '—'}</td>
                        <td className="py-2 pr-3 text-gray-200">{v.ref}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.color}</td>
                        <td className="py-2 pr-3 text-gray-300">{v.talla}</td>
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
                    setCRef(r?.id ?? ''); setCColor(''); setCTalla('');
                  }} />
                </FG>
                <div className="grid grid-cols-2 gap-3">
                  <FG label="Color">
                    <Sel options={COLORES_DEFAULT} value={cColor} onChange={e => setCColor(e.target.value)} />
                  </FG>
                  <FG label="Talla">
                    <Sel options={refs.find(r=>r.id===cRef)?.cat==='Nino'?TALLAS_NINO:TALLAS_ADULTO} value={cTalla} onChange={e => setCTalla(e.target.value)} />
                  </FG>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FG label="Cantidad">
                    <Inp type="number" min={1} value={cQty} onChange={e => setCQty(Number(e.target.value))} />
                  </FG>
                  <FG label="Precio unitario (COP)">
                    <Inp type="number" min={0} value={cPrecio} onChange={e => setCPrecio(Number(e.target.value))} />
                  </FG>
                </div>
                <FG label="Proveedor">
                  <Inp value={cProv} onChange={e => setCProv(e.target.value)} placeholder="Nombre del proveedor" />
                </FG>
                <FG label="Notas">
                  <Inp value={cNotas} onChange={e => setCNotas(e.target.value)} placeholder="Observaciones" />
                </FG>
                <Btn onClick={registrarCompra} disabled={loading}>
                  {loading ? 'Guardando…' : '+ Registrar Compra'}
                </Btn>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <CardTitle text={`Historial de Compras (${compras.length})`} />
                <Btn variant="secondary" onClick={() => exportCSV(compras,'compras')}>⬇ CSV</Btn>
              </div>
              {compras.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay compras registradas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2 pr-3">Fecha</th>
                        <th className="text-left py-2 pr-3">Referencia</th>
                        <th className="text-right py-2 pr-3">Cant.</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.map(c => (
                        <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 pr-3 text-gray-300">{c.fecha}</td>
                          <td className="py-2 pr-3 text-gray-200">{c.ref}</td>
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
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label:'En stock', val: inventario.reduce((a,i)=>a+Math.max(i.stock,0),0), color:'text-white' },
                { label:'OK (>5)',   val: inventario.filter(i=>i.stock>5).length, color:'text-green-400' },
                { label:'Bajo (≤5)',  val: inventario.filter(i=>i.stock>2&&i.stock<=5).length, color:'text-yellow-400' },
                { label:'Crítico (≤2)', val: inventario.filter(i=>i.stock<=2).length, color:'text-red-400' },
              ].map(k => (
                <div key={k.label} className="bg-gray-700 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 pr-3">Referencia</th>
                    <th className="text-left py-2 pr-3">Cat.</th>
                    <th className="text-left py-2 pr-3">Talla</th>
                    <th className="text-left py-2 pr-3">Color</th>
                    <th className="text-right py-2 pr-3">Comprado</th>
                    <th className="text-right py-2 pr-3">Vendido</th>
                    <th className="text-right py-2 pr-3">Stock</th>
                    <th className="text-left py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.map((i,idx) => (
                    <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-2 pr-3 font-medium text-gray-200">{i.ref}</td>
                      <td className="py-2 pr-3 text-gray-400">{i.cat}</td>
                      <td className="py-2 pr-3 text-gray-300">{i.talla}</td>
                      <td className="py-2 pr-3 text-gray-300">{i.color}</td>
                      <td className="py-2 pr-3 text-right text-blue-400">{i.comprado}</td>
                      <td className="py-2 pr-3 text-right text-orange-400">{i.vendido}</td>
                      <td className={`py-2 pr-3 text-right font-semibold ${i.stock<0?'text-red-400':i.stock>5?'text-green-400':'text-yellow-400'}`}>{i.stock}</td>
                      <td className="py-2">
                        <Badge
                          text={i.estado==='OK'?'✅ OK':i.estado==='Bajo'?'⚠️ Bajo':'🔴 Crítico'}
                          color={i.estado==='OK'?'green':i.estado==='Bajo'?'yellow':'red'}
                        />
                      </td>
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
                { label:'Total Ingresos',   val: cop(ventas.reduce((a,v)=>a+v.totalVenta,0)), color:'text-green-400' },
                { label:'Total Costo',      val: cop(ventas.reduce((a,v)=>a+v.costo,0)),      color:'text-red-400'   },
                { label:'Ganancia Bruta',   val: cop(ventas.reduce((a,v)=>a+v.ganancia,0)),   color:'text-indigo-400'},
                { label:'Unidades Vendidas',val: ventas.reduce((a,v)=>a+v.cantidad,0).toString(), color:'text-yellow-400'},
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
                      <div>
                        <span className="text-gray-200">{v.ref}</span>
                        <span className="text-gray-500 ml-2">{v.talla} / {v.color}</span>
                      </div>
                      <span className="text-green-400">{cop(v.totalVenta)}</span>
                    </div>
                  ))}
                  {ventas.length === 0 && <p className="text-gray-500 text-sm">Sin ventas aún</p>}
                </div>
              </Card>
              <Card>
                <CardTitle text="Stock Crítico" />
                <div className="space-y-2">
                  {inventario.filter(i=>i.stock<=2).map((i,idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-200">{i.ref} / {i.talla} / {i.color}</span>
                      <Badge text={String(i.stock)} color="red" />
                    </div>
                  ))}
                  {inventario.filter(i=>i.stock<=2).length === 0 && <p className="text-gray-500 text-sm">Sin items críticos ✅</p>}
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
                  <Inp
                    value={ccId}
                    onChange={e => {
                      setCcId(e.target.value);
                      setCcStatus('idle');
                      setCcData(null);
                      setCcMsg('');
                      if (e.target.value.trim().length > 5) {
                        buscarCuentaCobro(e.target.value.trim());
                      }
                    }}
                    placeholder="Ingresa el ID de la venta (ej: 1779063838818)"
                    className="w-80"
                  />
                </FG>
                <Btn onClick={() => buscarCuentaCobro(ccId)} disabled={!ccId.trim() || ccStatus==='loading'}>
                  {ccStatus === 'loading' ? 'Buscando…' : '🔍 Buscar'}
                </Btn>
              </div>

              {ccStatus === 'loading' && (
                <p className="text-indigo-400 text-sm mt-3 animate-pulse">Consultando en Google Drive…</p>
              )}
              {ccStatus === 'not_found' && (
                <div className="mt-3 p-3 bg-red-900/40 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">⚠️ {ccMsg}</p>
                </div>
              )}
              {ccStatus === 'error' && (
                <div className="mt-3 p-3 bg-yellow-900/40 border border-yellow-700 rounded-lg">
                  <p className="text-yellow-300 text-sm">⚠️ {ccMsg}</p>
                </div>
              )}
            </Card>

            {ccStatus === 'found' && ccData && ccData.length > 0 && (() => {
              const fila0 = ccData[0];
              const clienteNom  = fila0['Cliente']      || fila0['cliente']      || '—';
              const clienteFon  = fila0['Telefono']     || fila0['telefono']     || '—';
              const clienteDoc2 = fila0['Documento']    || fila0['documento']    || '—';
              const clienteDir  = fila0['Direccion']    || fila0['direccion']    || '—';
              const clienteS    = fila0['Sede']         || fila0['sede']         || '—';
              const fecha       = fila0['Fecha']        || fila0['fecha']        || '—';
              const idVenta     = fila0['ID']           || fila0['id']           || ccId;

              const totalGeneral = ccData.reduce((acc: number, row: any) => {
                const tv = Number(String(row['Total Venta'] || row['totalVenta'] || row['TotalVenta'] || 0).toString().replace(/[^0-9.-]/g,''));
                return acc + tv;
              }, 0);

              return (
                <div className="space-y-4">
                  {/* Header cuenta de cobro */}
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
                    </div>
                  </Card>

                  {/* A. Datos del cliente */}
                  <Card>
                    <CardTitle text="A. Datos del Cliente" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { label:'Cliente',    val: clienteNom  },
                        { label:'Teléfono',   val: clienteFon  },
                        { label:'Documento',  val: clienteDoc2 },
                        { label:'Dirección',  val: clienteDir  },
                        { label:'Sede',       val: clienteS    },
                      ].map(item => (
                        <div key={item.label}>
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className="text-sm text-white font-medium mt-0.5">{item.val}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* B. Detalle de la venta */}
                  <Card>
                    <CardTitle text="B. Detalle de la Venta" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-2 pr-3">#</th>
                            <th className="text-left py-2 pr-3">Referencia</th>
                            <th className="text-left py-2 pr-3">Color</th>
                            <th className="text-left py-2 pr-3">Talla</th>
                            <th className="text-right py-2 pr-3">Cant.</th>
                            <th className="text-left py-2 pr-3">Orden interna</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ccData.map((row: any, idx: number) => {
                            const refName = row['Referencia'] || row['referencia'] || row['ref'] || '—';
                            const colorV  = row['Color']      || row['color']      || '—';
                            const tallaV  = row['Talla']      || row['talla']      || '—';
                            const cantV   = row['Cantidad']   || row['cantidad']   || 0;
                            const ordenV  = row['OrdenInterna']|| row['ordenInterna']|| row['Orden interna'] || '—';
                            const totalV  = Number(String(row['Total Venta'] || row['totalVenta'] || row['TotalVenta'] || 0).toString().replace(/[^0-9.-]/g,''));
                            return (
                              <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                <td className="py-2 pr-3 text-gray-500">{idx+1}</td>
                                <td className="py-2 pr-3 text-gray-200 font-medium">{refName}</td>
                                <td className="py-2 pr-3 text-gray-300">{colorV}</td>
                                <td className="py-2 pr-3 text-gray-300">{tallaV}</td>
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

                  {/* C. Resumen */}
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

      </div>
    </div>
  );
}
