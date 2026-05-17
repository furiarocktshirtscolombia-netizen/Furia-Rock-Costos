import { useState, useMemo } from 'react';

// ─── DATOS REALES DEL SPREADSHEET FURIA ROCK ────────────────────────────────
const REFS = [
  { id:"r1",  name:"CAMISETA ALGODÓN PERUANO 178G",           cost:18000, cat:"Adulto" },
  { id:"r2",  name:"CAMISETA ALGODÓN PERUANO 320G",           cost:37000, cat:"Adulto" },
  { id:"r3",  name:"CAMISETA ALGODÓN PERUANO 270G",           cost:33000, cat:"Adulto" },
  { id:"r4",  name:"CAMISETA CATAR",                          cost:37000, cat:"Adulto" },
  { id:"r5",  name:"CAMISETA C4 ALGODÓN NACIONAL 200G",       cost:19000, cat:"Adulto" },
  { id:"r6",  name:"HOODIE PERUANO 400G",                     cost:82000, cat:"Adulto" },
  { id:"r7",  name:"CAMISETA NIÑO ALGODÓN PERUANO 200G",      cost:24000, cat:"Niño"   },
  { id:"r8",  name:"CAMISETA NIÑO NACIONAL 200G",             cost:14000, cat:"Niño"   },
  { id:"r9",  name:"CAMISETA ACID WASH NIÑO",                 cost:18000, cat:"Niño"   },
  { id:"r10", name:"BERMUDA NIÑO ALGODÓN PERCHADO",           cost:13500, cat:"Niño"   },
  { id:"r11", name:"SUDADERA NIÑOS ALGODÓN PERCHADO",         cost:19000, cat:"Niño"   },
  { id:"r12", name:"CONJUNTO NIÑO PERUANO + BERMUDA",         cost:37500, cat:"Niño"   },
  { id:"r13", name:"CONJUNTO NIÑO NACIONAL + BERMUDA",        cost:27500, cat:"Niño"   },
  { id:"r14", name:"CONJUNTO NIÑO PERUANO + JOGGER",          cost:43000, cat:"Niño"   },
  { id:"r15", name:"CONJUNTO NIÑO NACIONAL + JOGGER",         cost:33000, cat:"Niño"   },
];

const COLORES       = ["NEGRO","BLANCO","VERDE PINO","VERDE NACIONAL","AZUL CIELO","ROJO","GRIS","AZUL MARINO","ROSADO","MOSTAZA"];
const TALLAS_ADULTO = ["XS","S","M","L","XL","XXL"];
const TALLAS_NINO   = ["2","4","6","8","10","12","14","16"];
const TIPOS_IMP     = ["Ninguna","Serigrafía","DTF","Sublimación","Bordado"];
const SEDES         = ["Medellín","Bogotá","Cali","Online","Otra"];

// ─── TIPOS ──────────────────────────────────────────────────────────────────
interface Ref  { id:string; name:string; cost:number; cat:string }
interface Item { id:string; ref:Ref; talla:string; color:string; qty:number; calc:Calc; diseno:string; tipoImp:string; sede:string; cliente:string }
interface Venta{ id:string; fecha:string; cliente:string; ref:string; refId:string; talla:string; color:string; cantidad:number; cat:string; precio:number; totalVenta:number; costo:number; ganancia:number; tipoImp:string; diseno:string; sede:string }
interface Compra{ id:string; fecha:string; refId:string; ref:string; cat:string; color:string; talla:string; cantidad:number; precio:number; total:number; proveedor:string; notas:string }
interface Calc { costo:number; precio:number; precioTotal:number; ganancia:number; margen:string }
type Tab = 'cotizador'|'ventas'|'compras'|'inventario'|'dashboard';

// ─── HELPERS ────────────────────────────────────────────────────────────────
const cop  = (v:number) => "$ "+Math.round(v||0).toLocaleString("es-CO");
const today= () => new Date().toISOString().split("T")[0];
const uid  = () => Date.now()+"-"+Math.random().toString(36).slice(2,6);

function calcPrice(ref:Ref, qty:number, cmEstampado:number, empaque:number, costoImpExtra:number): Calc {
  const ganancia = ref.cat==="Niño" ? 9000 : 14000;
  const costo    = ref.cost + (cmEstampado||0)*150 + (costoImpExtra||0) + (empaque||0);
  const sugerido = costo + ganancia;
  const precio   = Math.ceil(sugerido/500)*500;
  return { costo, precio, precioTotal:precio*(qty||1), ganancia:precio-costo, margen:((precio-costo)/precio*100).toFixed(1) };
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

// ─── ESTILOS GLOBALES ────────────────────────────────────────────────────────
const G = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#0d0d0f;color:#f0f0f0;min-height:100vh}
  input,select{background:#1e2029;border:1px solid #2a2d3a;border-radius:8px;padding:9px 12px;color:#f0f0f0;font-size:13px;outline:none;width:100%;transition:border .15s}
  input:focus,select:focus{border-color:#e63d3d}
  select option{background:#1e2029}
  button{cursor:pointer;border:none;border-radius:8px;font-size:13px;font-weight:600;padding:10px 18px;transition:all .15s;letter-spacing:.3px}
  @media print{.no-print{display:none!important}}
`;

// ─── COMPONENTES REUTILIZABLES ───────────────────────────────────────────────
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

const Alert = ({msg,type,onClose}:{msg:string;type:"green"|"red"|"yellow";onClose:()=>void}) => {
  const map = { green:{bg:"#14532d",fg:"#86efac",bd:"#166534"}, red:{bg:"#450a0a",fg:"#fca5a5",bd:"#7f1d1d"}, yellow:{bg:"#451a03",fg:"#fcd34d",bd:"#92400e"} };
  const c = map[type];
  return (
    <div style={{background:c.bg,color:c.fg,border:`1px solid ${c.bd}`,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
      <span style={{flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:"transparent",color:c.fg,padding:"2px 8px",fontSize:12}}>✕</button>
    </div>
  );
};

const FG = ({label,children}:{label:string;children:any}) => (
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    <label style={{fontSize:12,color:"#8888a0",fontWeight:500}}>{label}</label>
    {children}
  </div>
);

const Btn = ({children,onClick,variant="red",sm=false,disabled=false}:{children:any;onClick?:()=>void;variant?:"red"|"outline"|"green";sm?:boolean;disabled?:boolean}) => {
  const styles:any = {
    red:     {background:"#e63d3d",color:"#fff"},
    outline: {background:"transparent",color:"#f0f0f0",border:"1px solid #2a2d3a"},
    green:   {background:"#166534",color:"#fff"},
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{...styles[variant],padding:sm?"6px 12px":"10px 18px",fontSize:sm?12:13,opacity:disabled?.4:1}}>
      {children}
    </button>
  );
};

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────
export default function App() {
  const [tab,   setTab]    = useState<Tab>("cotizador");
  const [ventas,setVentas] = useState<Venta[]>(()=>loadLS("fr_ventas",[]));
  const [compras,setCompras]= useState<Compra[]>(()=>loadLS("fr_compras",[]));
  const [quote,  setQuote] = useState<Item[]>([]);
  const [alert,  setAlert] = useState<{msg:string;type:"green"|"red"|"yellow"}|null>(null);

  // Cotizador form
  const [refId,     setRefId]     = useState("r1");
  const [color,     setColor]     = useState("NEGRO");
  const [talla,     setTalla]     = useState("M");
  const [qty,       setQty]       = useState(1);
  const [cliente,   setCliente]   = useState("");
  const [diseno,    setDiseno]    = useState("");
  const [tipoImp,   setTipoImp]   = useState("Ninguna");
  const [cmEst,     setCmEst]     = useState(0);
  const [costoImpEx,setCostoImpEx]= useState(0);
  const [empaque,   setEmpaque]   = useState(500);
  const [sede,      setSede]      = useState("Medellín");

  // Compras form
  const [cRefId,  setCRefId]  = useState("r1");
  const [cColor,  setCColor]  = useState("NEGRO");
  const [cTalla,  setCTalla]  = useState("M");
  const [cQty,    setCQty]    = useState(10);
  const [cPrecio, setCPrecio] = useState(18000);
  const [cProv,   setCProv]   = useState("");
  const [cFecha,  setCFecha]  = useState(today());
  const [cNotas,  setCNotas]  = useState("");

  const saveVentas  = (v:Venta[])  => { setVentas(v);  localStorage.setItem("fr_ventas",JSON.stringify(v));  };
  const saveCompras = (c:Compra[]) => { setCompras(c); localStorage.setItem("fr_compras",JSON.stringify(c)); };

  const ref      = REFS.find(r=>r.id===refId)||REFS[0];
  const tallas   = ref.cat==="Niño"?TALLAS_NINO:TALLAS_ADULTO;
  const calc     = useMemo(()=>calcPrice(ref,qty,cmEst,empaque,costoImpEx),[ref,qty,cmEst,empaque,costoImpEx]);

  const inventario = useMemo(()=>{
    const map:Record<string,any>={};
    compras.forEach(c=>{
      const k=`${c.refId}|${c.talla}|${c.color}`;
      if(!map[k]) map[k]={refId:c.refId,ref:c.ref,talla:c.talla,color:c.color,cat:c.cat,comprado:0,vendido:0};
      map[k].comprado+=c.cantidad;
    });
    ventas.forEach(v=>{
      const k=`${v.refId}|${v.talla}|${v.color}`;
      if(!map[k]) map[k]={refId:v.refId,ref:v.ref,talla:v.talla,color:v.color,cat:v.cat,comprado:0,vendido:0};
      map[k].vendido+=v.cantidad;
    });
    return Object.values(map).map(i=>({...i,stock:i.comprado-i.vendido}));
  },[ventas,compras]);

  const stockDe = (rId:string,t:string,c:string) => {
    const row = inventario.find(i=>i.refId===rId&&i.talla===t&&i.color===c);
    return row?row.stock:-1;
  };

  const showAlert = (msg:string,type:"green"|"red"|"yellow"="green") => setAlert({msg,type});

  // ── ACCIONES ──────────────────────────────────────────────────────────────
  const addToQuote = () => {
    const st = stockDe(refId,talla,color);
    if(st>=0&&qty>st){ showAlert(`⚠️ Stock insuficiente: ${st} unidades disponibles de ${ref.name} (${talla}/${color})`,"yellow"); return; }
    setQuote(q=>[...q,{id:uid(),ref,refId,talla,color,qty,calc,diseno,tipoImp,sede,cliente}]);
    showAlert(`✅ "${ref.name}" agregado a la cotización.`);
  };

  const registrarVenta = () => {
    if(!quote.length){ showAlert("Sin items en la cotización.","red"); return; }
    for(const item of quote){
      const st=stockDe(item.refId,item.talla,item.color);
      if(st>=0&&item.qty>st){ showAlert(`❌ Sin stock: ${item.ref.name} (${item.talla}/${item.color}) — disponible: ${st}`,"red"); return; }
    }
    const fecha=today();
    const nuevas:Venta[] = quote.map(item=>({
      id:uid(),fecha,cliente:cliente||"Cliente General",ref:item.ref.name,refId:item.refId,
      talla:item.talla,color:item.color,cantidad:item.qty,cat:item.ref.cat,
      precio:item.calc.precio,totalVenta:item.calc.precioTotal,
      costo:item.calc.costo,ganancia:item.calc.ganancia*(item.qty||1),
      tipoImp:item.tipoImp,diseno:item.diseno,sede:item.sede
    }));
    saveVentas([...ventas,...nuevas]);
    setQuote([]); setCliente("");
    setTab("ventas");
    showAlert(`✅ Venta registrada — ${quote.length} item(s). Inventario actualizado.`);
  };

  const registrarCompra = () => {
    if(!cQty||cQty<=0){ showAlert("Ingresa una cantidad válida.","red"); return; }
    const cRef = REFS.find(r=>r.id===cRefId)||REFS[0];
    const nueva:Compra = {id:uid(),fecha:cFecha,refId:cRefId,ref:cRef.name,cat:cRef.cat,color:cColor,talla:cTalla,cantidad:cQty,precio:cPrecio,total:cPrecio*cQty,proveedor:cProv,notas:cNotas};
    saveCompras([...compras,nueva]);
    setCQty(10); setCProv(""); setCNotas("");
    showAlert(`✅ Compra registrada: ${cQty} u. de "${cRef.name}" ingresadas al inventario.`);
  };

  // ── TABS ──────────────────────────────────────────────────────────────────
  const nav = [
    {id:"cotizador",label:"💰 Cotizador"},
    {id:"ventas",   label:"🛒 Ventas"},
    {id:"compras",  label:"📦 Compras"},
    {id:"inventario",label:"📊 Inventario"},
    {id:"dashboard",label:"📈 Dashboard"},
  ];

  const alertasCriticas = inventario.filter(i=>i.stock<=3&&i.stock>=0);

  const totalVentas = ventas.reduce((a,v)=>a+v.totalVenta,0);
  const totalGan    = ventas.reduce((a,v)=>a+v.ganancia,0);
  const totalInv    = compras.reduce((a,c)=>a+c.total,0);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{G}</style>

      {/* NAV */}
      <nav style={{background:"#16181f",borderBottom:"1px solid #2a2d3a",display:"flex",alignItems:"center",padding:"0 1rem",gap:0,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px 12px 0",borderRight:"1px solid #2a2d3a",marginRight:8}}>
          <div style={{width:32,height:32,background:"#e63d3d",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
          <div>
            <div style={{fontWeight:700,fontSize:15,letterSpacing:.5,color:"#fff"}}>FURIA ROCK</div>
            <div style={{fontSize:10,color:"#8888a0",letterSpacing:1}}>GESTIÓN</div>
          </div>
        </div>
        <div style={{display:"flex",gap:2,overflowX:"auto"}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>{setTab(n.id as Tab);setAlert(null)}}
              style={{padding:"14px 14px",fontSize:13,color:tab===n.id?"#e63d3d":"#8888a0",background:"none",border:"none",borderBottom:`2px solid ${tab===n.id?"#e63d3d":"transparent"}`,fontWeight:tab===n.id?600:400,whiteSpace:"nowrap",cursor:"pointer"}}>
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      <div style={{flex:1,padding:"1.25rem",maxWidth:1200,width:"100%",margin:"0 auto"}}>

        {alert && <Alert msg={alert.msg} type={alert.type} onClose={()=>setAlert(null)}/>}

        {alertasCriticas.length>0&&tab!=="inventario"&&(
          <div onClick={()=>setTab("inventario")} style={{background:"#451a03",color:"#fcd34d",border:"1px solid #92400e",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:12,cursor:"pointer"}}>
            ⚠️ {alertasCriticas.length} referencia(s) con stock crítico. Ver inventario →
          </div>
        )}

        {/* ── COTIZADOR ── */}
        {tab==="cotizador"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:"1rem",alignItems:"start"}}>
            <div>
              <Card>
                <CardTitle>⚡ Cotizador</CardTitle>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:12}}>
                  <FG label="Referencia"><div style={{gridColumn:"1/-1"}}>
                    <select value={refId} onChange={e=>{setRefId(e.target.value);setTalla(REFS.find(r=>r.id===e.target.value)?.cat==="Niño"?TALLAS_NINO[0]:TALLAS_ADULTO[2])}}>
                      {REFS.map(r=><option key={r.id} value={r.id}>{r.name} — {cop(r.cost)}</option>)}
                    </select>
                  </div></FG>
                  <FG label="Color"><select value={color} onChange={e=>setColor(e.target.value)}>{COLORES.map(c=><option key={c}>{c}</option>)}</select></FG>
                  <FG label="Talla"><select value={talla} onChange={e=>setTalla(e.target.value)}>{tallas.map(t=><option key={t}>{t}</option>)}</select></FG>
                  <FG label="Cantidad"><input type="number" min={1} value={qty} onChange={e=>setQty(+e.target.value)}/></FG>
                  <FG label="Cliente"><input type="text" placeholder="Nombre cliente" value={cliente} onChange={e=>setCliente(e.target.value)}/></FG>
                  <FG label="Diseño / Arte"><input type="text" placeholder="Ej: Logo pecho + espalda" value={diseno} onChange={e=>setDiseno(e.target.value)}/></FG>
                  <FG label="Tipo impresión"><select value={tipoImp} onChange={e=>setTipoImp(e.target.value)}>{TIPOS_IMP.map(t=><option key={t}>{t}</option>)}</select></FG>
                  <FG label="Cm² estampado"><input type="number" min={0} value={cmEst} onChange={e=>setCmEst(+e.target.value)}/></FG>
                  <FG label="Costo imp. extra $"><input type="number" min={0} value={costoImpEx} onChange={e=>setCostoImpEx(+e.target.value)}/></FG>
                  <FG label="Empaque $"><input type="number" min={0} value={empaque} onChange={e=>setEmpaque(+e.target.value)}/></FG>
                  <FG label="Sede"><select value={sede} onChange={e=>setSede(e.target.value)}>{SEDES.map(s=><option key={s}>{s}</option>)}</select></FG>
                </div>
                {(()=>{const st=stockDe(refId,talla,color);return st>=0&&<div style={{fontSize:12,color:st<=3?"#f59e0b":st===0?"#e63d3d":"#22c55e",marginBottom:10}}>📦 Stock disponible ({color} · {talla}): <strong>{st} unidades</strong></div>;})()}
                <Btn onClick={addToQuote}>➕ Agregar a cotización</Btn>
              </Card>

              {/* Items cotización */}
              {quote.length>0&&(
                <Card>
                  <CardTitle>📋 Items en cotización</CardTitle>
                  {quote.map((item,i)=>(
                    <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #2a2d3a"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{item.ref.name}</div>
                        <div style={{fontSize:12,color:"#8888a0"}}>{item.talla} · {item.color} · x{item.qty}</div>
                        {item.diseno&&<div style={{fontSize:11,color:"#8888a0"}}>Diseño: {item.diseno}</div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:14,fontWeight:700}}>{cop(item.calc.precioTotal)}</div>
                          <div style={{fontSize:11,color:"#8888a0"}}>{cop(item.calc.precio)} c/u</div>
                        </div>
                        <Btn sm onClick={()=>setQuote(q=>q.filter((_,j)=>j!==i))} variant="outline">✕</Btn>
                      </div>
                    </div>
                  ))}
                  <hr style={{border:"none",borderTop:"1px solid #2a2d3a",margin:"12px 0"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <span style={{color:"#8888a0",fontSize:13}}>TOTAL COTIZACIÓN</span>
                    <span style={{fontSize:24,fontWeight:700,color:"#e63d3d"}}>{cop(quote.reduce((a,i)=>a+i.calc.precioTotal,0))}</span>
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <Btn onClick={registrarVenta}>✅ Registrar Venta</Btn>
                    <Btn variant="outline" onClick={()=>window.print()}>🖨️ Imprimir</Btn>
                    <Btn variant="outline" sm onClick={()=>setQuote([])}>Limpiar</Btn>
                  </div>
                </Card>
              )}
            </div>

            {/* Panel precio */}
            <Card style={{position:"sticky",top:70}}>
              <CardTitle>💵 Precio calculado</CardTitle>
              {[
                ["Costo base",cop(ref.cost)],
                cmEst>0&&["Estampado ("+cmEst+"cm²)",cop(cmEst*150)],
                costoImpEx>0&&["Imp. extra",cop(costoImpEx)],
                ["Empaque",cop(empaque)],
                ["Costo total unit.",<strong>{cop(calc.costo)}</strong>],
              ].filter(Boolean).map((row:any,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #2a2d3a"}}>
                  <span style={{color:"#8888a0",fontSize:13}}>{row[0]}</span>
                  <span style={{fontSize:13}}>{row[1]}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #2a2d3a"}}>
                <span style={{color:"#8888a0",fontSize:13}}>Ganancia unit.</span>
                <span style={{color:"#22c55e",fontSize:13,fontWeight:600}}>{cop(calc.ganancia)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #2a2d3a"}}>
                <span style={{color:"#8888a0",fontSize:13}}>Margen</span>
                <span style={{color:"#22c55e",fontSize:13}}>{calc.margen}%</span>
              </div>
              <div style={{textAlign:"center",margin:"14px 0 8px"}}>
                <div style={{fontSize:12,color:"#8888a0",marginBottom:4}}>PRECIO UNITARIO</div>
                <div style={{fontSize:30,fontWeight:700,color:"#e63d3d"}}>{cop(calc.precio)}</div>
              </div>
              <div style={{background:"#1e2029",borderRadius:8,padding:"10px",textAlign:"center",marginBottom:10}}>
                <div style={{fontSize:12,color:"#8888a0"}}>TOTAL x{qty}</div>
                <div style={{fontSize:20,fontWeight:700}}>{cop(calc.precioTotal)}</div>
              </div>
              <div style={{background:"#14532d20",border:"1px solid #166534",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,color:"#86efac"}}>
                Ganancia total: {cop(calc.ganancia*(qty||1))}
              </div>
            </Card>
          </div>
        )}

        {/* ── VENTAS ── */}
        {tab==="ventas"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:"1rem"}}>
              {[
                ["Ventas",ventas.length,"#e63d3d"],
                ["Ingresos",cop(totalVentas),"#f0f0f0"],
                ["Ganancia",cop(totalGan),"#22c55e"],
                ["Unidades",ventas.reduce((a,v)=>a+v.cantidad,0),"#f0f0f0"],
              ].map(([l,v,c]:any)=>(
                <div key={l} style={{background:"#16181f",border:"1px solid #2a2d3a",borderRadius:12,padding:"1rem"}}>
                  <div style={{fontSize:22,fontWeight:700,color:c,marginBottom:2}}>{v}</div>
                  <div style={{fontSize:12,color:"#8888a0"}}>{l}</div>
                </div>
              ))}
            </div>
            <Card>
              <CardTitle style={{display:"flex",justifyContent:"space-between"}}>
                <span>🛒 Historial de ventas</span>
                <Btn sm variant="outline" onClick={()=>exportCSV(`furia_ventas_${today()}.csv`,["Fecha","Cliente","Referencia","Talla","Color","Cant.","P.Unit","Total","Ganancia","Sede"],ventas.map(v=>[v.fecha,v.cliente,v.ref,v.talla,v.color,v.cantidad,v.precio,v.totalVenta,v.ganancia,v.sede]))}>⬇️ CSV</Btn>
              </CardTitle>
              {ventas.length===0?<div style={{textAlign:"center",padding:"3rem",color:"#8888a0",fontSize:14}}>Sin ventas. Usa el cotizador para registrar.</div>:(
                <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #2a2d3a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"#1e2029"}}>
                      {["Fecha","Cliente","Referencia","Talla","Color","Cant.","P.Unit","Total","Ganancia","Sede",""].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#8888a0",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {[...ventas].reverse().map(v=>(
                        <tr key={v.id} style={{borderTop:"1px solid #2a2d3a"}}>
                          <td style={{padding:"10px 12px"}}>{v.fecha}</td>
                          <td style={{padding:"10px 12px"}}>{v.cliente||"—"}</td>
                          <td style={{padding:"10px 12px",maxWidth:170,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v.ref}</td>
                          <td style={{padding:"10px 12px"}}>{v.talla}</td>
                          <td style={{padding:"10px 12px"}}>{v.color}</td>
                          <td style={{padding:"10px 12px",fontWeight:700}}>{v.cantidad}</td>
                          <td style={{padding:"10px 12px"}}>{cop(v.precio)}</td>
                          <td style={{padding:"10px 12px",fontWeight:700}}>{cop(v.totalVenta)}</td>
                          <td style={{padding:"10px 12px",color:"#22c55e"}}>{cop(v.ganancia)}</td>
                          <td style={{padding:"10px 12px"}}>{v.sede||"—"}</td>
                          <td style={{padding:"10px 12px"}}><Btn sm variant="outline" onClick={()=>{if(confirm("¿Eliminar?"))saveVentas(ventas.filter(x=>x.id!==v.id))}}>🗑</Btn></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── COMPRAS ── */}
        {tab==="compras"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:"1rem"}}>
              {[["Compras",compras.length,"#f0f0f0"],["Invertido",cop(totalInv),"#e63d3d"],["Unidades",compras.reduce((a,c)=>a+c.cantidad,0),"#f0f0f0"]].map(([l,v,c]:any)=>(
                <div key={l} style={{background:"#16181f",border:"1px solid #2a2d3a",borderRadius:12,padding:"1rem"}}>
                  <div style={{fontSize:22,fontWeight:700,color:c,marginBottom:2}}>{v}</div>
                  <div style={{fontSize:12,color:"#8888a0"}}>{l}</div>
                </div>
              ))}
            </div>
            <Card>
              <CardTitle>📦 Registrar compra / ingreso de stock</CardTitle>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
                <FG label="Referencia"><div style={{gridColumn:"1/-1"}}>
                  <select value={cRefId} onChange={e=>{setCRefId(e.target.value);setCPrecio(REFS.find(r=>r.id===e.target.value)?.cost||0)}}>
                    {REFS.map(r=><option key={r.id} value={r.id}>{r.name} — {cop(r.cost)}</option>)}
                  </select>
                </div></FG>
                <FG label="Color"><select value={cColor} onChange={e=>setCColor(e.target.value)}>{COLORES.map(c=><option key={c}>{c}</option>)}</select></FG>
                <FG label="Talla">
                  <select value={cTalla} onChange={e=>setCTalla(e.target.value)}>
                    {[...TALLAS_ADULTO,...TALLAS_NINO].map(t=><option key={t}>{t}</option>)}
                  </select>
                </FG>
                <FG label="Cantidad"><input type="number" min={1} value={cQty} onChange={e=>setCQty(+e.target.value)}/></FG>
                <FG label="Precio unitario $"><input type="number" min={0} value={cPrecio} onChange={e=>setCPrecio(+e.target.value)}/></FG>
                <FG label="Proveedor"><input type="text" placeholder="Nombre proveedor" value={cProv} onChange={e=>setCProv(e.target.value)}/></FG>
                <FG label="Fecha"><input type="date" value={cFecha} onChange={e=>setCFecha(e.target.value)}/></FG>
                <FG label="Notas"><input type="text" placeholder="Opcional" value={cNotas} onChange={e=>setCNotas(e.target.value)}/></FG>
              </div>
              <div style={{background:"#1e2029",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#8888a0"}}>Total a registrar</span>
                <strong style={{color:"#e63d3d"}}>{cop(cPrecio*cQty)}</strong>
              </div>
              <Btn variant="green" onClick={registrarCompra}>✅ Registrar compra e ingresar stock</Btn>
            </Card>
            <Card>
              <CardTitle style={{display:"flex",justifyContent:"space-between"}}>
                <span>📋 Historial de compras</span>
                <Btn sm variant="outline" onClick={()=>exportCSV(`furia_compras_${today()}.csv`,["Fecha","Referencia","Talla","Color","Cant.","P.Unit","Total","Proveedor"],compras.map(c=>[c.fecha,c.ref,c.talla,c.color,c.cantidad,c.precio,c.total,c.proveedor]))}>⬇️ CSV</Btn>
              </CardTitle>
              {compras.length===0?<div style={{textAlign:"center",padding:"3rem",color:"#8888a0",fontSize:14}}>Sin compras registradas.</div>:(
                <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #2a2d3a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"#1e2029"}}>
                      {["Fecha","Referencia","Talla","Color","Cant.","P.Unit","Total","Proveedor",""].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#8888a0"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {[...compras].reverse().map(c=>(
                        <tr key={c.id} style={{borderTop:"1px solid #2a2d3a"}}>
                          <td style={{padding:"10px 12px"}}>{c.fecha}</td>
                          <td style={{padding:"10px 12px",maxWidth:160,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.ref}</td>
                          <td style={{padding:"10px 12px"}}>{c.talla}</td>
                          <td style={{padding:"10px 12px"}}>{c.color}</td>
                          <td style={{padding:"10px 12px",fontWeight:700}}>{c.cantidad}</td>
                          <td style={{padding:"10px 12px"}}>{cop(c.precio)}</td>
                          <td style={{padding:"10px 12px",fontWeight:700}}>{cop(c.total)}</td>
                          <td style={{padding:"10px 12px"}}>{c.proveedor||"—"}</td>
                          <td style={{padding:"10px 12px"}}><Btn sm variant="outline" onClick={()=>{if(confirm("¿Eliminar?"))saveCompras(compras.filter(x=>x.id!==c.id))}}>🗑</Btn></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── INVENTARIO ── */}
        {tab==="inventario"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:"1rem"}}>
              {[
                ["En stock",inventario.reduce((a,i)=>a+i.stock,0),"#f0f0f0"],
                ["OK (>5)",inventario.filter(i=>i.stock>5).length,"#22c55e"],
                ["Bajo (≤5)",inventario.filter(i=>i.stock>2&&i.stock<=5).length,"#f59e0b"],
                ["Crítico (≤2)",inventario.filter(i=>i.stock>=0&&i.stock<=2).length,"#e63d3d"],
              ].map(([l,v,c]:any)=>(
                <div key={l} style={{background:"#16181f",border:"1px solid #2a2d3a",borderRadius:12,padding:"1rem"}}>
                  <div style={{fontSize:22,fontWeight:700,color:c,marginBottom:2}}>{v}</div>
                  <div style={{fontSize:12,color:"#8888a0"}}>{l}</div>
                </div>
              ))}
            </div>
            <Card>
              <CardTitle style={{display:"flex",justifyContent:"space-between"}}>
                <span>📊 Inventario en tiempo real</span>
                <Btn sm variant="outline" onClick={()=>exportCSV(`furia_inventario_${today()}.csv`,["Referencia","Cat.","Talla","Color","Comprado","Vendido","Stock"],inventario.map(i=>[i.ref,i.cat,i.talla,i.color,i.comprado,i.vendido,i.stock]))}>⬇️ CSV</Btn>
              </CardTitle>
              {inventario.length===0?<div style={{textAlign:"center",padding:"3rem",color:"#8888a0",fontSize:14}}>Sin movimientos. Registra compras para ingresar stock.</div>:(
                <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #2a2d3a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"#1e2029"}}>
                      {["Referencia","Cat.","Talla","Color","Comprado","Vendido","Stock","Estado"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#8888a0"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {[...inventario].sort((a,b)=>a.stock-b.stock).map((i,idx)=>(
                        <tr key={idx} style={{borderTop:"1px solid #2a2d3a"}}>
                          <td style={{padding:"10px 12px",fontWeight:600,maxWidth:180,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.ref}</td>
                          <td style={{padding:"10px 12px"}}>{i.cat||"—"}</td>
                          <td style={{padding:"10px 12px"}}>{i.talla}</td>
                          <td style={{padding:"10px 12px"}}>{i.color}</td>
                          <td style={{padding:"10px 12px",color:"#3b82f6"}}>{i.comprado}</td>
                          <td style={{padding:"10px 12px",color:"#e63d3d"}}>{i.vendido}</td>
                          <td style={{padding:"10px 12px",fontWeight:700,fontSize:15}}>{i.stock}</td>
                          <td style={{padding:"10px 12px"}}>
                            {i.stock<=2?<Pill color="red">🔴 Crítico</Pill>:i.stock<=5?<Pill color="yellow">🟡 Bajo</Pill>:<Pill color="green">🟢 OK</Pill>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(()=>{
          const topMap:Record<string,any>={};
          ventas.forEach(v=>{if(!topMap[v.ref])topMap[v.ref]={ref:v.ref,qty:0,total:0};topMap[v.ref].qty+=v.cantidad;topMap[v.ref].total+=v.totalVenta});
          const top=Object.values(topMap).sort((a:any,b:any)=>b.total-a.total).slice(0,5);
          const ultimas=[...ventas].reverse().slice(0,5);
          return (
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:"1rem"}}>
                {[["Ingresos",cop(totalVentas),"#e63d3d"],["Ganancia",cop(totalGan),"#22c55e"],["Invertido",cop(totalInv),"#e63d3d"],["Margen",totalVentas>0?((totalGan/totalVentas)*100).toFixed(1)+"%":"0%","#f0f0f0"],["Ventas",ventas.length,"#f0f0f0"],["En bodega",inventario.reduce((a,i)=>a+i.stock,0),"#3b82f6"]].map(([l,v,c]:any)=>(
                  <div key={l} style={{background:"#16181f",border:"1px solid #2a2d3a",borderRadius:12,padding:"1rem"}}>
                    <div style={{fontSize:22,fontWeight:700,color:c,marginBottom:2}}>{v}</div>
                    <div style={{fontSize:12,color:"#8888a0"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                <Card>
                  <CardTitle>🏆 Top referencias</CardTitle>
                  {top.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:"#8888a0"}}>Sin ventas aún</div>:
                    top.map((t:any,i:number)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #2a2d3a"}}>
                        <div style={{fontSize:13}}><span style={{color:"#8888a0",marginRight:8}}>#{i+1}</span>{t.ref.slice(0,30)}{t.ref.length>30?"…":""}</div>
                        <div style={{textAlign:"right"}}><div style={{fontWeight:700}}>{cop(t.total)}</div><div style={{fontSize:11,color:"#8888a0"}}>{t.qty} u.</div></div>
                      </div>
                    ))
                  }
                </Card>
                <Card>
                  <CardTitle>⏱ Últimas ventas</CardTitle>
                  {ultimas.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:"#8888a0"}}>Sin ventas aún</div>:
                    ultimas.map(v=>(
                      <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #2a2d3a"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{v.cliente||"Cliente"}</div>
                          <div style={{fontSize:11,color:"#8888a0"}}>{v.fecha} · {v.ref.slice(0,25)}</div>
                        </div>
                        <div style={{fontWeight:700,color:"#22c55e"}}>{cop(v.totalVenta)}</div>
                      </div>
                    ))
                  }
                </Card>
              </div>
              <Card style={{marginTop:0}}>
                <CardTitle>⚡ Acciones rápidas</CardTitle>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                  <Btn onClick={()=>setTab("cotizador")}>💰 Nueva cotización</Btn>
                  <Btn variant="outline" onClick={()=>setTab("compras")}>📦 Registrar compra</Btn>
                  <Btn variant="outline" onClick={()=>{exportCSV(`furia_ventas_${today()}.csv`,["Fecha","Cliente","Ref","Talla","Color","Cant","Total","Ganancia"],ventas.map(v=>[v.fecha,v.cliente,v.ref,v.talla,v.color,v.cantidad,v.totalVenta,v.ganancia]));setTimeout(()=>exportCSV(`furia_compras_${today()}.csv`,["Fecha","Ref","Talla","Color","Cant","Total","Proveedor"],compras.map(c=>[c.fecha,c.ref,c.talla,c.color,c.cantidad,c.total,c.proveedor])),400)}}>⬇️ Exportar todo</Btn>
                  <Btn sm variant="outline" onClick={()=>{if(confirm("¿Borrar TODOS los datos? No se puede deshacer.")){saveVentas([]);saveCompras([]);setQuote([])}}} style={{marginLeft:"auto",color:"#8888a0"}}>🗑 Resetear</Btn>
                </div>
              </Card>
            </>
          );
        })()}
      </div>
    </>
  );
}
