import { useState, useMemo, useEffect } from 'react';

// ═══ DATOS REALES DEL SPREADSHEET FURIA ROCK ══════════════════════════════
const REFS_DEFAULT: Ref[] = [
  { id:"r1",  name:"CAMISETA ALGODON PERUANO 178G",             cost:18000, cat:"Adulto" },
  { id:"r2",  name:"CAMISETA ALGODON PERUANO 320G",             cost:37000, cat:"Adulto" },
  { id:"r3",  name:"CAMISETA ALGODON PERUANO 270G",             cost:33000, cat:"Adulto" },
  { id:"r4",  name:"CAMISETA CATAR",                             cost:37000, cat:"Adulto" },
  { id:"r5",  name:"CAMISETA C4 ALGODON NACIONAL 200G",         cost:19000, cat:"Adulto" },
  { id:"r6",  name:"HOODIE PERUANO 400G",                        cost:82000, cat:"Adulto" },
  { id:"r7",  name:"CAMISETA NINO ALGODON PERUANO 200G",        cost:24000, cat:"Nino"   },
  { id:"r8",  name:"CAMISETA NINO NACIONAL 200G",               cost:14000, cat:"Nino"   },
  { id:"r9",  name:"CAMISETA ACID WASH NINO",                   cost:18000, cat:"Nino"   },
  { id:"r10", name:"BERMUDA NINO ALGODON PERCHADO",             cost:13500, cat:"Nino"   },
  { id:"r11", name:"SUDADERA NINOS ALGODON PERCHADO",           cost:19000, cat:"Nino"   },
  { id:"r12", name:"CONJUNTO NINO CAMISETA PERUANO + BERMUDA",  cost:37500, cat:"Nino"   },
  { id:"r13", name:"CONJUNTO NINO CAMISETA NACIONAL + BERMUDA", cost:27500, cat:"Nino"   },
  { id:"r14", name:"CONJUNTO NINO CAMISETA PERUANO + JOGGER",   cost:43000, cat:"Nino"   },
  { id:"r15", name:"CONJUNTO NINO CAMISETA NACIONAL + JOGGER",  cost:33000, cat:"Nino"   },
]

const COLORES_DEFAULT = ["NEGRO","BLANCO","VERDE PINO","VERDE NACIONAL","AZUL CIELO","ROJO","GRIS","AZUL MARINO","ROSADO","MOSTAZA"]
const TALLAS_ADULTO  = ["XS","S","M","L","XL","XXL"];
const TALLAS_NINO    = ["2","4","6","8","10","12","14","16"];
const TIPOS_IMP      = ["DTF","DTG"];
const SEDES          = ["Medellin","Bogota","Cali","Online","Otra"];

// COSTOS FIJOS DE PRODUCCION
const GANANCIA_NETA_FIJA = 30000;   // COP ganancia neta por articulo
const DTF_POR_CM2        = 170;     // COP por cm2 de area DTF
const COSTO_EMPAQUE      = 1300;    // COP empaque fijo por unidad
const COSTO_PLANCHADA    = 1000;    // COP por planchada (cantidad manual)

// ─── GOOGLE SHEETS INTEGRATION ─────────────────────────────────────────────
const GAS_URL = 'https://script.google.com/macros/s/AKfycby9m-yDkajrDZyINyGjsrWW_Efu48IbI9GtjOpU0aIsO_uZsMppobAnIx8hIRU1yYsd/exec';
function sendToGAS(accion: string, data: Record<string, unknown>) {
  fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ accion, ...data }),
  }).catch(() => {});
}
function calcInventario(v: any[], c: any[]) {
  const map: Record<string, any> = {};
  c.forEach((ci: any) => {
    const k = `${ci.refId}|${ci.talla}|${ci.color}`;
    if (!map[k]) map[k] = { refId:ci.refId, ref:ci.ref, talla:ci.talla, color:ci.color, cat:ci.cat, comprado:0, vendido:0 };
    map[k].comprado += ci.cantidad;
  });
  v.forEach((vi: any) => {
    const k = `${vi.refId}|${vi.talla}|${vi.color}`;
    if (!map[k]) map[k] = { refId:vi.refId, ref:vi.ref, talla:vi.talla, color:vi.color, cat:vi.cat, comprado:0, vendido:0 };
    map[k].vendido += vi.cantidad;
  });
  return Object.values(map).map((i: any) => {
    const stock = i.comprado - i.vendido;
    const estado = stock > 5 ? 'OK' : stock > 2 ? 'Bajo' : 'Critico';
    return { ...i, stock, estado };
  });
}

// ═══ TIPOS ════════════════════════════════════════════════════════════════
interface Ref  { id:string; name:string; cost:number; cat:string }
interface Item { id:string; ref:Ref; talla:string; color:string; qty:number; calc:Calc; diseno:string; tipoImp:string; sede:string; cliente:string; cmDTF:number; numPlanchadas:number; costoDTG:number }
interface Venta { id:string; fecha:string; cliente:string; ref:string; refId:string; talla:string; color:string; cantidad:number; cat:string; precio:number; totalVenta:number; costo:number; ganancia:number; tipoImp:string; diseno:string; sede:string }
interface Compra { id:string; fecha:string; refId:string; ref:string; cat:string; color:string; talla:string; cantidad:number; precio:number; total:number; proveedor:string; notas:string }
interface Calc { costoBase:number; costoImp:number; costoEmpaque:number; costoPlanchadas:number; costoTotal:number; precio:number; precioTotal:number; ganancia:number; margen:string; labelImp:string }
type Tab = 'cotizador'|'ventas'|'compras'|'inventario'|'dashboard';

// ═══ HELPERS ══════════════════════════════════════════════════════════════
const cop    = (v:number) => "$ "+Math.round(v||0).toLocaleString("es-CO");
const today  = () => new Date().toISOString().split("T")[0];
const uid    = () => Date.now()+"-"+Math.random().toString(36).slice(2,6);

// tipoImp: "DTF" usa cmDTF*170, "DTG" usa costoDTG manual, otro = 0
function calcPrice(ref:Ref, qty:number, tipoImp:string, cmDTF:number, numPlanchadas:number, costoDTG:number): Calc {
  const costoBase       = ref.cost;
  let   costoImp        = 0;
  let   labelImp        = "Sin impresion";
  if (tipoImp === 'DTF') {
    costoImp  = Math.round((cmDTF || 0) * DTF_POR_CM2);
    labelImp  = `DTF ${cmDTF}cm²`;
  } else if (tipoImp === 'DTG') {
    costoImp  = Math.round(costoDTG || 0);
    labelImp  = "DTG";
  }
  const costoEmpaque    = COSTO_EMPAQUE;
  const costoPlanchadas = Math.round((numPlanchadas || 0) * COSTO_PLANCHADA);
  const costoTotal      = costoBase + costoImp + costoEmpaque + costoPlanchadas;
  const sugerido        = costoTotal + GANANCIA_NETA_FIJA;
  const precio          = Math.ceil(sugerido / 500) * 500;
  const ganancia        = precio - costoTotal;
  const margen          = costoTotal > 0 ? ((ganancia / precio) * 100).toFixed(1) : "0.0";
  return { costoBase, costoImp, costoEmpaque, costoPlanchadas, costoTotal, precio, precioTotal: precio * (qty || 1), ganancia, margen, labelImp };
}

function loadLS<T>(key:string, def:T): T {
  try { return JSON.parse(localStorage.getItem(key)||"null") ?? def; } catch { return def; }
}

function exportCSV(filename:string, headers:string[], rows:(string|number)[][]) {
  const csv = [headers,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
// ═══ ESTILOS GLOBALES ═══════════════════════════════════════════════════
const G = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0d0d0f;color:#f0f0f0;min-height:100vh}
input,select{background:#1e2029;border:1px solid #2a2d3a;border-radius:8px;padding:9px 12px;color:#f0f0f0;font-size:13px;outline:none;width:100%;transition:border .15s}
input:focus,select:focus{border-color:#e63d3d}
select option{background:#1e2029}
button{cursor:pointer;border:none;border-radius:8px;font-size:13px;font-weight:600;padding:10px 18px;transition:all .15s;letter-spacing:.3px}
@media print{.no-print{display:none!important}}
`;

// ═══ COMPONENTES REUTILIZABLES ═══════════════════════════════════════════
const Card = ({children,style}:{children:any;style?:any}) => (
  <div style={{background:"#16181f",border:"1px solid #2a2d3a",borderRadius:12,padding:"1.25rem",marginBottom:"1rem",...style}}>
    {children}
  </div>
);
const CardTitle = ({children}:{children:any}) => (
  <div style={{fontSize:13,fontWeight:600,color:"#8888a0",textTransform:"uppercase",letterSpacing:".8px",marginBottom:"1rem"}}>
    {children}
  </div>
);
const Pill = ({children,color}:{children:any;color:"green"|"red"|"yellow"|"blue"}) => {
  const map = { green:{bg:"#14532d",fg:"#86efac"}, red:{bg:"#450a0a",fg:"#fca5a5"}, yellow:{bg:"#451a03",fg:"#fcd34d"}, blue:{bg:"#1e3a5f",fg:"#93c5fd"} };
  const c = map[color];
  return <span style={{background:c.bg,color:c.fg,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{children}</span>;
};
const Alert = ({msg,type}:{msg:string;type:"ok"|"err"|"warn"}) => {
  const c = type==="ok"?"#22c55e":type==="err"?"#ef4444":"#f59e0b";
  return msg ? <div style={{background:c+"22",border:`1px solid ${c}44`,borderRadius:8,padding:"10px 14px",fontSize:13,color:c,marginBottom:"1rem"}}>{msg}</div> : null;
};
const FG = ({label,children,hint}:{label:string;children:any;hint?:string}) => (
  <div style={{marginBottom:"1rem"}}>
    <label style={{display:"block",fontSize:12,color:"#8888a0",marginBottom:5,fontWeight:500}}>{label}</label>
    {children}
    {hint && <div style={{fontSize:11,color:"#666",marginTop:3}}>{hint}</div>}
  </div>
);
const Btn = ({children,onClick,variant,sm,style}:{children:any;onClick?:()=>void;variant?:"outline"|"danger";sm?:boolean;style?:any}) => {
  const base:any = { padding: sm?"6px 12px":"10px 18px", fontSize: sm?12:13, borderRadius:8, fontWeight:600, cursor:"pointer", border:"none", transition:"all .15s" };
  if (variant==="outline") { base.background="transparent"; base.border="1px solid #3a3d4a"; base.color="#c0c0d0"; }
  else if (variant==="danger") { base.background="#450a0a"; base.color="#fca5a5"; }
  else { base.background="#e63d3d"; base.color="#fff"; }
  return <button style={{...base,...style}} onClick={onClick}>{children}</button>;
};
// ═══ APP PRINCIPAL ════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState<Tab>('cotizador');
  const [alert, setAlert] = useState('');
  const [alertType, setAlertType] = useState<"ok"|"err"|"warn">('ok');
  const [quote, setQuote] = useState<Item[]>([]);
  const [ventas, setVentas] = useState<Venta[]>(() => loadLS('ventas', []));
  const [compras, setCompras] = useState<Compra[]>(() => loadLS('compras', []));

  // Estado para datos desde Drive
  const [REFS, setREFS] = useState<Ref[]>(REFS_DEFAULT);
  const [COLORES, setCOLORES] = useState<string[]>(COLORES_DEFAULT);
  const [coloresPorRef, setColoresPorRef] = useState<Record<string,string[]>>({});

  // Cargar refs y colores desde Drive al iniciar
  useEffect(() => {
    fetch(GAS_URL, { method:'GET' })
      .then(r => r.json())
      .then((data: any) => {
        if (data.refs && data.refs.length > 0) {
          const refsFromDrive: Ref[] = data.refs.map((r: any) => ({
            id:   r.id   || ('r' + Math.random().toString(36).slice(2,6)),
            name: r.name || '',
            cost: Number(r.cost) || 0,
            cat:  r.cat  || 'Adulto',
          }));
          setREFS(refsFromDrive);
        }
        if (data.colores) {
          const allColors = new Set<string>(COLORES_DEFAULT);
          const byRef: Record<string,string[]> = {};
          Object.entries(data.colores).forEach(([refName, colors]: [string, any]) => {
            if (Array.isArray(colors)) {
              colors.forEach((c: string) => allColors.add(c));
              byRef[refName] = colors;
            }
          });
          setCOLORES(Array.from(allColors));
          setColoresPorRef(byRef);
        }
      })
      .catch(() => {});
  }, []);

  // Estado del formulario cotizador
  const [selRef, setSelRef] = useState('');
  const [selTalla, setSelTalla] = useState('');
  const [selColor, setSelColor] = useState('');
  const [selQty, setSelQty] = useState(1);
  const [selCliente, setSelCliente] = useState('');
  const [selSede, setSelSede] = useState(SEDES[0]);
  const [selTipoImp, setSelTipoImp] = useState(TIPOS_IMP[0]);
  const [selDiseno, setSelDiseno] = useState('');
  const [cmDTF, setCmDTF] = useState(0);
  const [numPlanchadas, setNumPlanchadas] = useState(0);
  const [costoDTG, setCostoDTG] = useState(0);

  // Estado formulario compras
  const [cRef, setCRef] = useState('');
  const [cTalla, setCTalla] = useState('');
  const [cColor, setCColor] = useState('');
  const [cQty, setCQty] = useState(1);
  const [cPrecio, setCPrecio] = useState(0);
  const [cProveedor, setCProveedor] = useState('');
  const [cNotas, setCNotas] = useState('');

  const saveVentas  = (v: Venta[])  => { setVentas(v);  localStorage.setItem('ventas',  JSON.stringify(v)); };
  const saveCompras = (c: Compra[]) => { setCompras(c); localStorage.setItem('compras', JSON.stringify(c)); };

  const stockDe = (refId:string, talla:string, color:string) => {
    const inv = calcInventario(ventas, compras);
    const row = inv.find(r => r.refId===refId && r.talla===talla && r.color===color);
    return row ? row.stock : 0;
  };

  const showAlert = (msg:string, type:"ok"|"err"|"warn"="ok") => {
    setAlert(msg); setAlertType(type);
    setTimeout(() => setAlert(''), 4000);
  };

  // Cotizacion: calculo reactivo
  const refObj      = REFS.find(r => r.id === selRef) || null;
  const tallas      = refObj ? (refObj.cat === 'Nino' ? TALLAS_NINO : TALLAS_ADULTO) : TALLAS_ADULTO;
  const coloresDisp = refObj && coloresPorRef[refObj.name] ? coloresPorRef[refObj.name] : COLORES;
  const calc        = refObj ? calcPrice(refObj, selQty, selTipoImp, cmDTF, numPlanchadas, costoDTG) : null;

  const addToQuote = () => {
    if (!refObj || !selTalla || !selColor) { showAlert('Completa referencia, talla y color','err'); return; }
    const c = calcPrice(refObj, selQty, selTipoImp, cmDTF, numPlanchadas, costoDTG);
    const item: Item = {
      id: uid(), ref: refObj, talla: selTalla, color: selColor,
      qty: selQty, calc: c, diseno: selDiseno, tipoImp: selTipoImp,
      sede: selSede, cliente: selCliente, cmDTF, numPlanchadas, costoDTG
    };
    setQuote([...quote, item]);
    showAlert('Agregado a la cotizacion');
  };

  const sincronizarInventario = (v: Venta[], c: Compra[]) => {
    const rows = calcInventario(v, c);
    sendToGAS('sincronizarInventarioBatch', { rows });
  };

  const sincronizarResultados = (v: Venta[], c: Compra[]) => {
    const inv = calcInventario(v, c);
    const totalVentasPesos    = v.reduce((s, vi) => s + vi.totalVenta, 0);
    const costoVendido        = v.reduce((s, vi) => s + vi.costo * vi.cantidad, 0);
    const gananciaBruta       = totalVentasPesos - costoVendido;
    const totalComprasUnidades= c.reduce((s, ci) => s + ci.cantidad, 0);
    const totalComprasPesos   = c.reduce((s, ci) => s + ci.total, 0);
    const enStock             = inv.filter(i => i.stock > 0).length;
    const enNegativo          = inv.filter(i => i.stock < 0).length;
    const margen              = totalVentasPesos > 0 ? ((gananciaBruta / totalVentasPesos) * 100).toFixed(2) : '0.00';
    const roi                 = costoVendido > 0 ? ((gananciaBruta / costoVendido) * 100).toFixed(2) : '0.00';
    sendToGAS('sincronizarResultados', {
      ventas: { unidades: v.reduce((s,vi)=>s+vi.cantidad,0), ingresos: totalVentasPesos, costo: costoVendido, ganancia: gananciaBruta },
      compras: { unidades: totalComprasUnidades, invertido: totalComprasPesos },
      inventario: { enStock, enNegativo },
      margen: { pct: margen, roi },
    });
  };

  const registrarVenta = () => {
    if (!quote.length) { showAlert('La cotizacion esta vacia','err'); return; }
    const fecha = today();
    const nuevasVentas: Venta[] = [];
    quote.forEach(item => {
      const v: Venta = {
        id: uid(), fecha, cliente: item.cliente || selCliente,
        ref: item.ref.name, refId: item.ref.id, talla: item.talla,
        color: item.color, cantidad: item.qty, cat: item.ref.cat,
        precio: item.calc.precio, totalVenta: item.calc.precioTotal,
        costo: item.calc.costoTotal, ganancia: item.calc.ganancia,
        tipoImp: item.tipoImp, diseno: item.diseno, sede: item.sede,
      };
      nuevasVentas.push(v);
      sendToGAS('guardarVenta', { ...v });
    });
    const allVentas = [...ventas, ...nuevasVentas];
    saveVentas(allVentas);
    sincronizarInventario(allVentas, compras);
    sincronizarResultados(allVentas, compras);
    setQuote([]);
    showAlert(`Venta registrada: ${nuevasVentas.length} item(s)`);
  };

  const registrarCompra = () => {
    if (!cRef || !cTalla || !cColor || cQty < 1) { showAlert('Completa todos los campos de compra','err'); return; }
    const refC = REFS.find(r => r.id === cRef);
    if (!refC) return;
    const c: Compra = {
      id: uid(), fecha: today(), refId: cRef, ref: refC.name,
      cat: refC.cat, color: cColor, talla: cTalla, cantidad: cQty,
      precio: cPrecio, total: cPrecio * cQty, proveedor: cProveedor, notas: cNotas,
    };
    const allCompras = [...compras, c];
    saveCompras(allCompras);
    sendToGAS('guardarCompra', { ...c });
    sincronizarInventario(ventas, allCompras);
    sincronizarResultados(ventas, allCompras);
    showAlert('Compra registrada correctamente');
    setCRef(''); setCTalla(''); setCColor(''); setCQty(1); setCPrecio(0); setCProveedor(''); setCNotas('');
  };
  const inv = useMemo(() => calcInventario(ventas, compras), [ventas, compras]);
  const ultimasVentas = [...ventas].reverse().slice(0, 5);

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{G}</style>
      {/* NAVBAR */}
      <div style={{background:"#0d0d0f",borderBottom:"1px solid #1e2029",padding:"0 1.5rem",display:"flex",alignItems:"center",gap:4,position:"sticky",top:0,zIndex:100}} className="no-print">
        <div style={{marginRight:"auto",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"#e63d3d",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800}}>FR</div>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>FURIA ROCK</div>
            <div style={{fontSize:10,color:"#8888a0"}}>GESTION</div>
          </div>
        </div>
        {([
          ['cotizador','Cotizador'],
          ['ventas','Ventas'],
          ['compras','Compras'],
          ['inventario','Inventario'],
          ['dashboard','Dashboard'],
        ] as [Tab,string][]).map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background:tab===t?"#e63d3d22":"transparent",
            color:tab===t?"#e63d3d":"#8888a0",
            border:"none",padding:"14px 16px",cursor:"pointer",fontSize:13,fontWeight:600,
            borderBottom:tab===t?"2px solid #e63d3d":"2px solid transparent",transition:"all .15s"
          }}>{l}</button>
        ))}
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"1.5rem"}}>
        <Alert msg={alert} type={alertType} />

        {/* ═══ COTIZADOR ═══════════════════════════════════════════════════ */}
        {tab==='cotizador' && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
            <div>
              {/* Seleccion de producto */}
              <Card>
                <CardTitle>Cotizar producto</CardTitle>
                <FG label="Cliente">
                  <input value={selCliente} onChange={e=>setSelCliente(e.target.value)} placeholder="Nombre del cliente" />
                </FG>
                <FG label="Sede">
                  <select value={selSede} onChange={e=>setSelSede(e.target.value)}>
                    {SEDES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </FG>
                <FG label="Referencia">
                  <select value={selRef} onChange={e=>{setSelRef(e.target.value);setSelTalla('');setSelColor('');}}>
                    <option value="">-- Seleccionar --</option>
                    {REFS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </FG>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                  <FG label="Talla">
                    <select value={selTalla} onChange={e=>setSelTalla(e.target.value)}>
                      <option value="">--</option>
                      {tallas.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </FG>
                  <FG label="Color">
                    <select value={selColor} onChange={e=>setSelColor(e.target.value)}>
                      <option value="">--</option>
                      {coloresDisp.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </FG>
                </div>
                <FG label="Cantidad">
                  <input type="number" min={1} value={selQty} onChange={e=>setSelQty(Number(e.target.value)||1)} />
                </FG>
              </Card>

              {/* Costos de produccion */}
              <Card>
                <CardTitle>Costos de produccion</CardTitle>

                {/* Tipo de impresion: solo DTF y DTG */}
                <FG label="Tipo de impresion">
                  <select value={selTipoImp} onChange={e=>{ setSelTipoImp(e.target.value); setCmDTF(0); setNumPlanchadas(0); setCostoDTG(0); }}>
                    {TIPOS_IMP.map(t=><option key={t}>{t}</option>)}
                  </select>
                </FG>

                <FG label="Descripcion del diseno" hint="Nombre o referencia del arte">
                  <input value={selDiseno} onChange={e=>setSelDiseno(e.target.value)} placeholder="Ej: Logo Furia Rock frontal" />
                </FG>

                {/* Campos DTF: area en cm2 + planchadas */}
                {selTipoImp === 'DTF' && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                    <FG label="Area DTF (cm²)" hint={`${DTF_POR_CM2} COP/cm²`}>
                      <input type="number" min={0} value={cmDTF} onChange={e=>setCmDTF(Number(e.target.value)||0)} placeholder="0" />
                    </FG>
                    <FG label="Num. planchadas" hint={`${COSTO_PLANCHADA.toLocaleString()} COP c/u`}>
                      <input type="number" min={0} value={numPlanchadas} onChange={e=>setNumPlanchadas(Number(e.target.value)||0)} placeholder="0" />
                    </FG>
                  </div>
                )}

                {/* Campo DTG: precio manual de la impresion */}
                {selTipoImp === 'DTG' && (
                  <FG label="Costo de impresion DTG (COP)" hint="Ingresa el valor cobrado por la impresora DTG">
                    <input type="number" min={0} value={costoDTG} onChange={e=>setCostoDTG(Number(e.target.value)||0)} placeholder="Ej: 15000" />
                  </FG>
                )}

                {/* Desglose de costos */}
                {calc && (
                  <div style={{background:"#0d0d0f",borderRadius:8,padding:"1rem",marginTop:"0.5rem",fontSize:13}}>
                    <div style={{fontWeight:600,marginBottom:"0.75rem",color:"#8888a0",textTransform:"uppercase",fontSize:11,letterSpacing:".5px"}}>Desglose de costos por unidad</div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1e2029"}}>
                      <span style={{color:"#aaa"}}>Costo base prenda</span><span>{cop(calc.costoBase)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1e2029"}}>
                      <span style={{color:"#aaa"}}>{calc.labelImp}</span><span>{cop(calc.costoImp)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1e2029"}}>
                      <span style={{color:"#aaa"}}>Empaque</span><span>{cop(calc.costoEmpaque)}</span>
                    </div>
                    {selTipoImp === 'DTF' && (
                      <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #2a2d3a"}}>
                        <span style={{color:"#aaa"}}>Planchadas ({numPlanchadas})</span><span>{cop(calc.costoPlanchadas)}</span>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontWeight:700}}>
                      <span>Costo total</span><span style={{color:"#f59e0b"}}>{cop(calc.costoTotal)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
                      <span style={{color:"#22c55e"}}>Ganancia neta</span><span style={{color:"#22c55e"}}>{cop(calc.ganancia)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
                      <span style={{color:"#aaa"}}>Margen</span><span style={{color:"#93c5fd"}}>{calc.margen}%</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:"1px solid #2a2d3a",fontWeight:700,fontSize:15}}>
                      <span>Precio unit.</span><span style={{color:"#e63d3d"}}>{cop(calc.precio)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontWeight:700,fontSize:15}}>
                      <span>Total ({selQty} uds)</span><span style={{color:"#e63d3d"}}>{cop(calc.precioTotal)}</span>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:8,marginTop:"1rem"}}>
                  <Btn onClick={addToQuote} style={{flex:1}}>Agregar a cotizacion</Btn>
                </div>
              </Card>
            </div>

            {/* Panel cotizacion */}
            <div>
              <Card>
                <CardTitle>Cotizacion actual</CardTitle>
                {quote.length === 0 ? (
                  <div style={{textAlign:"center",color:"#555",padding:"2rem"}}>Sin items</div>
                ) : (
                  <>
                    {quote.map((item,i) => (
                      <div key={item.id} style={{background:"#0d0d0f",borderRadius:8,padding:"0.75rem",marginBottom:"0.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{item.ref.name}</div>
                          <div style={{fontSize:12,color:"#888"}}>{item.talla} | {item.color} | x{item.qty}</div>
                          <div style={{fontSize:11,color:"#666"}}>{item.tipoImp}{item.diseno ? ': ' + item.diseno : ''}</div>
                          {item.tipoImp === 'DTF' && (
                            <div style={{fontSize:11,color:"#555"}}>DTF: {item.cmDTF}cm² | Planchadas: {item.numPlanchadas}</div>
                          )}
                          {item.tipoImp === 'DTG' && (
                            <div style={{fontSize:11,color:"#555"}}>DTG: {cop(item.costoDTG)}</div>
                          )}
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{color:"#e63d3d",fontWeight:700}}>{cop(item.calc.precioTotal)}</div>
                          <div style={{fontSize:11,color:"#555"}}>{cop(item.calc.precio)}/u</div>
                          <button onClick={() => setQuote(quote.filter((_,j)=>j!==i))}
                            style={{fontSize:11,color:"#666",background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}>quitar</button>
                        </div>
                      </div>
                    ))}
                    <div style={{borderTop:"1px solid #2a2d3a",paddingTop:"1rem",marginTop:"0.5rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:16,marginBottom:"1rem"}}>
                        <span>TOTAL</span>
                        <span style={{color:"#e63d3d"}}>{cop(quote.reduce((s,i)=>s+i.calc.precioTotal,0))}</span>
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <Btn onClick={registrarVenta} style={{flex:1}}>Registrar venta</Btn>
                        <Btn variant="outline" onClick={() => window.print()}>Imprimir</Btn>
                        <Btn variant="outline" sm onClick={() => setQuote([])}>Limpiar</Btn>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              {/* Ultimas ventas */}
              <Card>
                <CardTitle>Ultimas ventas</CardTitle>
                {ultimasVentas.length===0 ? <div style={{textAlign:"center",color:"#555",padding:"1.5rem"}}>Sin ventas aun</div> :
                  ultimasVentas.map(v=>(
                    <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1e2029"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{v.cliente||"Cliente"}</div>
                        <div style={{fontSize:11,color:"#8888a0"}}>{v.fecha} · {v.ref.slice(0,25)}</div>
                      </div>
                      <div style={{fontWeight:700,color:"#22c55e"}}>{cop(v.totalVenta)}</div>
                    </div>
                  ))
                }
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:"1rem"}}>
                  <Btn sm variant="outline" onClick={()=>setTab('cotizador')}>Nueva cotizacion</Btn>
                  <Btn sm variant="outline" onClick={()=>setTab('compras')}>Registrar compra</Btn>
                  <Btn sm variant="outline" onClick={()=>exportCSV(`furia_ventas_${today()}.csv`,["Fecha","Cliente","Ref","Talla","Color","Cant","Total","Costo","Ganancia"],ventas.map(v=>[v.fecha,v.cliente,v.ref,v.talla,v.color,v.cantidad,v.totalVenta,v.costo*v.cantidad,v.ganancia*v.cantidad]))}>CSV Ventas</Btn>
                </div>
              </Card>
            </div>
          </div>
        )}
        {/* ═══ VENTAS ═══════════════════════════════════════════════════════ */}
        {tab==='ventas' && (
          <Card>
            <CardTitle>Historial de ventas ({ventas.length})</CardTitle>
            <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap"}}>
              <Btn sm variant="outline" onClick={()=>setTab('cotizador')}>Nueva cotizacion</Btn>
              <Btn sm variant="outline" onClick={()=>exportCSV(`furia_ventas_${today()}.csv`,["Fecha","Cliente","Ref","Talla","Color","Cant","Total","Costo","Ganancia"],ventas.map(v=>[v.fecha,v.cliente,v.ref,v.talla,v.color,v.cantidad,v.totalVenta,v.costo*v.cantidad,v.ganancia*v.cantidad]))}>Exportar CSV</Btn>
            </div>
            {ventas.length===0 ? <div style={{textAlign:"center",color:"#555",padding:"2rem"}}>Sin ventas registradas</div> : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #2a2d3a",color:"#8888a0"}}>
                      {["Fecha","Cliente","Referencia","Talla","Color","Cant","Total","Costo","Ganancia","Tipo Imp","Sede"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...ventas].reverse().map(v=>(
                      <tr key={v.id} style={{borderBottom:"1px solid #1a1d26"}}>
                        <td style={{padding:"8px 10px",color:"#8888a0"}}>{v.fecha}</td>
                        <td style={{padding:"8px 10px",fontWeight:600}}>{v.cliente||'-'}</td>
                        <td style={{padding:"8px 10px",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.ref}</td>
                        <td style={{padding:"8px 10px"}}>{v.talla}</td>
                        <td style={{padding:"8px 10px"}}>{v.color}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>{v.cantidad}</td>
                        <td style={{padding:"8px 10px",color:"#22c55e",fontWeight:700}}>{cop(v.totalVenta)}</td>
                        <td style={{padding:"8px 10px",color:"#f59e0b"}}>{cop(v.costo*v.cantidad)}</td>
                        <td style={{padding:"8px 10px",color:"#93c5fd"}}>{cop(v.ganancia*v.cantidad)}</td>
                        <td style={{padding:"8px 10px",color:"#8888a0"}}>{v.tipoImp||'-'}</td>
                        <td style={{padding:"8px 10px",color:"#8888a0"}}>{v.sede||'-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ═══ COMPRAS ══════════════════════════════════════════════════════ */}
        {tab==='compras' && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
            <Card>
              <CardTitle>Registrar compra</CardTitle>
              <FG label="Referencia">
                <select value={cRef} onChange={e=>{setCRef(e.target.value);setCTalla('');setCColor('');}}>
                  <option value="">-- Seleccionar --</option>
                  {REFS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </FG>
              {cRef && (() => {
                const rObj = REFS.find(r=>r.id===cRef);
                const ts = rObj ? (rObj.cat==='Nino' ? TALLAS_NINO : TALLAS_ADULTO) : TALLAS_ADULTO;
                const cs = rObj && coloresPorRef[rObj.name] ? coloresPorRef[rObj.name] : COLORES;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                    <FG label="Talla">
                      <select value={cTalla} onChange={e=>setCTalla(e.target.value)}>
                        <option value="">--</option>
                        {ts.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </FG>
                    <FG label="Color">
                      <select value={cColor} onChange={e=>setCColor(e.target.value)}>
                        <option value="">--</option>
                        {cs.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </FG>
                  </div>
                );
              })()}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                <FG label="Cantidad">
                  <input type="number" min={1} value={cQty} onChange={e=>setCQty(Number(e.target.value)||1)} />
                </FG>
                <FG label="Precio unitario (COP)">
                  <input type="number" min={0} value={cPrecio} onChange={e=>setCPrecio(Number(e.target.value)||0)} />
                </FG>
              </div>
              <FG label="Proveedor">
                <input value={cProveedor} onChange={e=>setCProveedor(e.target.value)} placeholder="Nombre del proveedor" />
              </FG>
              <FG label="Notas">
                <input value={cNotas} onChange={e=>setCNotas(e.target.value)} placeholder="Observaciones opcionales" />
              </FG>
              <Btn onClick={registrarCompra} style={{width:"100%"}}>Registrar compra</Btn>
              {cRef && cTalla && cColor && (
                <div style={{marginTop:"0.75rem",fontSize:12,color:"#8888a0"}}>
                  Stock actual: <strong style={{color: stockDe(cRef,cTalla,cColor) < 0 ? '#ef4444' : '#22c55e'}}>
                    {stockDe(cRef,cTalla,cColor)} uds
                  </strong>
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>Historial de compras ({compras.length})</CardTitle>
              <Btn sm variant="outline" onClick={()=>exportCSV(`furia_compras_${today()}.csv`,["Fecha","Ref","Talla","Color","Cant","PrecioU","Total","Proveedor"],compras.map(c=>[c.fecha,c.ref,c.talla,c.color,c.cantidad,c.precio,c.total,c.proveedor]))}>Exportar CSV</Btn>
              <div style={{marginTop:"1rem"}}>
                {compras.length===0 ? <div style={{textAlign:"center",color:"#555",padding:"2rem"}}>Sin compras registradas</div> :
                  [...compras].reverse().map(c=>(
                    <div key={c.id} style={{background:"#0d0d0f",borderRadius:8,padding:"0.75rem",marginBottom:"0.5rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{c.ref}</div>
                          <div style={{fontSize:12,color:"#8888a0"}}>{c.talla} | {c.color} | x{c.cantidad}</div>
                          <div style={{fontSize:11,color:"#666"}}>{c.fecha} · {c.proveedor||'Sin proveedor'}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{color:"#f59e0b",fontWeight:700}}>{cop(c.total)}</div>
                          <div style={{fontSize:11,color:"#555"}}>{cop(c.precio)}/u</div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </Card>
          </div>
        )}

        {/* ═══ INVENTARIO ═══════════════════════════════════════════════════ */}
        {tab==='inventario' && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
              {[
                {label:"En stock",     val:inv.filter(i=>i.stock>0).reduce((s,i)=>s+i.stock,0), color:"#f0f0f0"},
                {label:"OK (>5)",      val:inv.filter(i=>i.stock>5).length,  color:"#22c55e"},
                {label:"Bajo (<=5)",   val:inv.filter(i=>i.stock>2&&i.stock<=5).length, color:"#f59e0b"},
                {label:"Critico (<=2)",val:inv.filter(i=>i.stock<=2).length, color:"#ef4444"},
              ].map(({label,val,color})=>(
                <Card key={label} style={{textAlign:"center",marginBottom:0}}>
                  <div style={{fontSize:32,fontWeight:800,color}}>{val}</div>
                  <div style={{fontSize:12,color:"#8888a0",marginTop:4}}>{label}</div>
                </Card>
              ))}
            </div>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                <CardTitle>Inventario en tiempo real</CardTitle>
                <Btn sm variant="outline" onClick={()=>exportCSV(`furia_inventario_${today()}.csv`,["Ref","Cat","Talla","Color","Comprado","Vendido","Stock","Estado"],inv.map(i=>[i.ref,i.cat,i.talla,i.color,i.comprado,i.vendido,i.stock,i.estado]))}>CSV</Btn>
              </div>
              {inv.length===0 ? <div style={{textAlign:"center",color:"#555",padding:"2rem"}}>Sin movimientos registrados</div> : (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid #2a2d3a",color:"#8888a0"}}>
                        {["Referencia","Cat.","Talla","Color","Comprado","Vendido","Stock","Estado"].map(h=>(
                          <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:500}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inv.sort((a,b)=>a.stock-b.stock).map(i=>(
                        <tr key={`${i.refId}${i.talla}${i.color}`} style={{borderBottom:"1px solid #1a1d26"}}>
                          <td style={{padding:"8px 10px",fontWeight:600}}>{i.ref}</td>
                          <td style={{padding:"8px 10px",color:"#8888a0"}}>{i.cat}</td>
                          <td style={{padding:"8px 10px"}}>{i.talla}</td>
                          <td style={{padding:"8px 10px"}}>{i.color}</td>
                          <td style={{padding:"8px 10px",color:"#93c5fd"}}>{i.comprado}</td>
                          <td style={{padding:"8px 10px",color:"#f59e0b"}}>{i.vendido}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:i.stock<0?"#ef4444":i.stock<=2?"#f59e0b":"#22c55e"}}>{i.stock}</td>
                          <td style={{padding:"8px 10px"}}>
                            <Pill color={i.stock>5?"green":i.stock>2?"blue":i.stock>0?"yellow":"red"}>{i.estado}</Pill>
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

        {/* ═══ DASHBOARD ════════════════════════════════════════════════════ */}
        {tab==='dashboard' && (() => {
          const totalVentasPesos  = ventas.reduce((s,v)=>s+v.totalVenta,0);
          const costoVendido      = ventas.reduce((s,v)=>s+v.costo*v.cantidad,0);
          const gananciaBruta     = totalVentasPesos - costoVendido;
          const totalComprasPesos = compras.reduce((s,c)=>s+c.total,0);
          const margenPct         = totalVentasPesos>0 ? (gananciaBruta/totalVentasPesos*100).toFixed(1) : '0.0';
          const topRefs           = Object.entries(
            ventas.reduce((acc,v)=>{ acc[v.ref]=(acc[v.ref]||0)+v.cantidad; return acc; }, {} as Record<string,number>)
          ).sort((a,b)=>b[1]-a[1]).slice(0,5);

          return (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
                {[
                  {label:"Total ventas",   val:cop(totalVentasPesos),  color:"#22c55e"},
                  {label:"Total compras",  val:cop(totalComprasPesos), color:"#f59e0b"},
                  {label:"Ganancia bruta", val:cop(gananciaBruta),     color:gananciaBruta>=0?"#93c5fd":"#ef4444"},
                  {label:"Margen",         val:margenPct+"%",          color:"#e63d3d"},
                ].map(({label,val,color})=>(
                  <Card key={label} style={{textAlign:"center",marginBottom:0}}>
                    <div style={{fontSize:22,fontWeight:800,color}}>{val}</div>
                    <div style={{fontSize:12,color:"#8888a0",marginTop:4}}>{label}</div>
                  </Card>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
                <Card>
                  <CardTitle>Top 5 referencias vendidas</CardTitle>
                  {topRefs.length===0 ? <div style={{color:"#555",textAlign:"center",padding:"1rem"}}>Sin datos</div> :
                    topRefs.map(([name,qty],i)=>(
                      <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e2029"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{width:20,height:20,background:"#e63d3d",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{i+1}</span>
                          <span style={{fontSize:13}}>{name.slice(0,30)}</span>
                        </div>
                        <Pill color="blue">{qty} uds</Pill>
                      </div>
                    ))
                  }
                </Card>
                <Card>
                  <CardTitle>Acciones rapidas</CardTitle>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <Btn onClick={()=>setTab('cotizador')}>Nueva cotizacion</Btn>
                    <Btn variant="outline" onClick={()=>setTab('compras')}>Registrar compra</Btn>
                    <Btn variant="outline" sm onClick={()=>exportCSV(`furia_ventas_${today()}.csv`,["Fecha","Cliente","Ref","Talla","Color","Cant","Total","Costo","Ganancia"],ventas.map(v=>[v.fecha,v.cliente,v.ref,v.talla,v.color,v.cantidad,v.totalVenta,v.costo*v.cantidad,v.ganancia*v.cantidad]))}>CSV Ventas</Btn>
                    <Btn variant="outline" sm onClick={()=>{if(confirm("Borrar TODOS los datos? No se puede deshacer.")){saveVentas([]);saveCompras([]);}}} >Limpiar datos</Btn>
                  </div>
                </Card>
              </div>
            </div>
          );
        })()}

      </div>
    </>
  );
    }
