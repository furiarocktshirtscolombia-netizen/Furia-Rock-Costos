import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { QuoteInputs, QuoteResults, ProductReference, QuoteItem } from './types';
import { 
  PRODUCT_REFERENCES_INITIAL, 
  TALLAS_NINO, 
  TALLAS_ADULTO, 
  COLORES_CAMISETA,
  COLORES_BERMUDA,
  COSTO_CM2, 
  COSTO_PLANCHADO,
  COSTO_EMPAQUE,
  GANANCIA_NINO,
  GANANCIA_ADULTO
} from './constants';
import { 
  FileUp,
  Download,
  MessageSquare,
  User,
  Plus,
  Trash2,
  ShoppingCart,
  LayoutGrid,
  Target,
  Zap,
  Info
} from 'lucide-react';

const LOGO_FURIA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23FF4FD8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/%3E%3C/svg%3E";
const LOGO_COCO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2334FF4A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M8 14s1.5 2 4 2 4-2 4-2'/%3E%3Cline x1='9' y1='9' x2='9.01' y2='9'/%3E%3Cline x1='15' y1='9' x2='15.01' y2='9'/%3E%3C/svg%3E";

const App: React.FC = () => {
  const [productRefs, setProductRefs] = useState<ProductReference[]>(PRODUCT_REFERENCES_INITIAL);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [inputs, setInputs] = useState<QuoteInputs>({
    clientName: "",
    quantity: 1,
    referencia: PRODUCT_REFERENCES_INITIAL[0].id,
    categoria: 'Niño',
    talla: TALLAS_NINO[3],
    colorCamiseta: COLORES_CAMISETA[1], // Negro
    colorBermuda: COLORES_BERMUDA[1], // Negro
    cmEstampado: 0,
    cmCorazon: 0,
    qtyPlanchado: 1,
    costoEmpaque: COSTO_EMPAQUE
  });
  const [observaciones, setObservaciones] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

      if (!rows.length) return;

      const norm = (s: any) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      const findKey = (obj: any, posibles: string[]) => {
        const keys = Object.keys(obj);
        for (const p of posibles) {
          const hit = keys.find(k => norm(k) === norm(p));
          if (hit) return hit;
        }
        return null;
      };

      const refKey = findKey(rows[0], ["referencia", "ref", "nombre"]);
      const precioKey = findKey(rows[0], ["precio_unitario", "precio", "costo"]);

      if (refKey && precioKey) {
        const newRefs: ProductReference[] = rows.map((row, idx) => ({
          id: String(row[refKey] || `id-${idx}`),
          name: String(row[refKey]),
          baseCost: Number(String(row[precioKey]).replace(/[^\d.]/g, "")) || 0
        })).filter(p => p.name);
        setProductRefs(newRefs);
        setInputs(prev => ({ ...prev, referencia: newRefs[0].id }));
      }
    } catch (err) { alert('Error al procesar el Excel.'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    setInputs(prev => ({
      ...prev,
      talla: prev.categoria === 'Niño' ? TALLAS_NINO[0] : TALLAS_ADULTO[0]
    }));
  }, [inputs.categoria]);

  const currentProduct = useMemo(() => 
    productRefs.find(p => p.id === inputs.referencia) || productRefs[0], 
  [inputs.referencia, productRefs]);

  const checkIsConjunto = (refName: string) => {
    const ref = (refName || "").toLowerCase();
    return ref.includes("conjunto") || ref.includes("jogger") || ref.includes("bermuda") || ref.includes("joker") || ref.includes("set") || ref.includes("+");
  };

  const isConjunto = useMemo(() => checkIsConjunto(currentProduct?.name), [currentProduct]);

  // Bermuda color selector logic: Only show for Kids category AND if it's a set
  const showBermudaSelector = useMemo(() => {
    return (inputs.categoria === 'Niño') && isConjunto;
  }, [inputs.categoria, isConjunto]);

  useEffect(() => {
    if (!showBermudaSelector) {
      setInputs(prev => ({ ...prev, colorBermuda: "No aplica" }));
    } else if (inputs.colorBermuda === "No aplica") {
      setInputs(prev => ({ ...prev, colorBermuda: COLORES_BERMUDA[1] }));
    }
  }, [showBermudaSelector]);

  const currentResults = useMemo((): QuoteResults => {
    const base = currentProduct.baseCost;
    const estampadoPrincipal = (Number(inputs.cmEstampado) || 0) * COSTO_CM2;
    const estampadoCorazon = (Number(inputs.cmCorazon) || 0) * COSTO_CM2;
    const costoPlanchado = (Number(inputs.qtyPlanchado) || 0) * COSTO_PLANCHADO;
    const empaque = Number(inputs.costoEmpaque) || 0;
    
    const costoTotalUnidad = base + estampadoPrincipal + estampadoCorazon + costoPlanchado + empaque;
    
    const ganancia = inputs.categoria === 'Niño' ? GANANCIA_NINO : GANANCIA_ADULTO;
    const precioUnidad = Math.round(costoTotalUnidad + ganancia);
    
    return {
      costoBase: base,
      costoEstampado: estampadoPrincipal,
      costoCorazon: estampadoCorazon,
      costoPlanchado: costoPlanchado,
      costoEmpaque: empaque,
      costoTotal: costoTotalUnidad,
      precioUnidad,
      precioTotal: precioUnidad * inputs.quantity,
      ganancia,
      margen: (ganancia / precioUnidad) * 100
    };
  }, [inputs, currentProduct]);

  const addToQuote = () => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product: currentProduct,
      categoria: inputs.categoria,
      talla: inputs.talla,
      colorCamiseta: inputs.colorCamiseta,
      colorBermuda: showBermudaSelector ? inputs.colorBermuda : "No aplica",
      cmEstampado: inputs.cmEstampado,
      cmCorazon: inputs.cmCorazon,
      qtyPlanchado: inputs.qtyPlanchado,
      costoEmpaque: inputs.costoEmpaque,
      quantity: inputs.quantity,
      results: { ...currentResults }
    };
    setQuoteItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => setQuoteItems(prev => prev.filter(it => it.id !== id));

  // OPTIMIZED PDF EXPORT (Landscape)
  const downloadPDF_jsPDF = () => {
    const itemsToExport: QuoteItem[] = quoteItems.length > 0 ? quoteItems : [{
      id: 'preview',
      product: currentProduct,
      categoria: inputs.categoria,
      talla: inputs.talla,
      colorCamiseta: inputs.colorCamiseta,
      colorBermuda: showBermudaSelector ? inputs.colorBermuda : "No aplica",
      cmEstampado: inputs.cmEstampado,
      cmCorazon: inputs.cmCorazon,
      qtyPlanchado: inputs.qtyPlanchado,
      costoEmpaque: inputs.costoEmpaque,
      quantity: inputs.quantity,
      results: currentResults
    } as QuoteItem];

    // @ts-ignore
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert("Error: Librería jsPDF no detectada.");
      return;
    }

    const doc = new jsPDF("l", "mm", "a4"); // "l" for Landscape
    const clienteNombre = inputs.clientName || "CLIENTE VALIOSO";
    const fechaStr = new Date().toLocaleDateString("es-CO");
    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 79, 216); 
    doc.text("FURIA ROCK KIDS", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("PREMIUM KIDS FASHION • EXPERTOS EN DTG & DTF", 14, 26);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`CLIENTE: ${clienteNombre.toUpperCase()}`, 14, 38);
    doc.text(`FECHA: ${fechaStr}`, pageWidth - 14, 38, { align: 'right' });

    // BUILD TABLE
    const head = [["REFERENCIA", "DETALLES / COLORES", "CANT.", "V. UNITARIO", "V. TOTAL"]];
    const body = itemsToExport.map(it => {
      // Optimized detail string as requested
      const detail = 
        `Talla: ${it.talla || "-"}\n` +
        (it.colorCamiseta ? `Camiseta: ${it.colorCamiseta}\n` : "") +
        (it.colorBermuda && it.colorBermuda !== "No aplica" ? `Bermuda/Jogger: ${it.colorBermuda}` : "");

      return [
        it.product.name.toUpperCase(),
        detail.trim(),
        String(it.quantity),
        formatCOP(it.results.precioUnidad),
        formatCOP(it.results.precioTotal)
      ];
    });

    // OPTIMIZED AUTOTABLE (Landscape Distribution)
    // A4 Landscape width is ~297mm. Available space with 14mm margins is 269mm.
    // Sum: 90 + 100 + 15 + 32 + 32 = 269mm
    // @ts-ignore
    doc.autoTable({
      startY: 45,
      head,
      body,
      theme: 'grid',
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 4,
        valign: "middle"
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center"
      },
      columnStyles: {
        0: { cellWidth: 90, halign: "left" },   // REFERENCIA
        1: { cellWidth: 100, halign: "left" },  // DETALLES / COLORES
        2: { cellWidth: 15, halign: "center" }, // CANTIDAD
        3: { cellWidth: 32, halign: "right" },  // UNITARIO
        4: { cellWidth: 32, halign: "right", fontStyle: "bold" }   // TOTAL
      },
      margin: { left: 14, right: 14 }
    });

    // TOTALS & NOTES
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 150;
    const totalGeneral = itemsToExport.reduce<number>((acc, it) => acc + it.results.precioTotal, 0);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL: ${formatCOP(totalGeneral)} COP`, pageWidth - 14, finalY + 12, { align: "right" });

    if (observaciones) {
      doc.setFontSize(11);
      doc.text("Observaciones:", 14, finalY + 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(observaciones, pageWidth - 28);
      doc.text(lines, 14, finalY + 28);
    }

    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("Furia Rock Kids - Pasión por el diseño infantil con alma rockera.", pageWidth / 2, 200, { align: "center" });

    doc.save(`Cotizacion_FuriaRock_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="app-header py-6 px-12 mb-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src={LOGO_FURIA} className="logo-img" alt="Furia" />
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase splatter-pink">FURIA ROCK</h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Expertos en DTG & DTF</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8 text-right">
            <div>
              <h1 className="text-xl font-black tracking-widest uppercase splatter-green">COCO YEMA</h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Premium Kids Fashion</p>
            </div>
            <img src={LOGO_COCO} className="logo-img" alt="Coco" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* PANEL IZQUIERDO: CONFIGURACIÓN */}
        <div className="lg:col-span-5 space-y-8">
          <section className="card p-8">
            <div className="flex items-center gap-4 mb-6">
              <User size={18} className="text-aqua" />
              <h2 className="text-lg font-black uppercase tracking-widest">1. Datos del Cliente</h2>
            </div>
            <input 
              type="text" 
              value={inputs.clientName} 
              onChange={(e) => setInputs({...inputs, clientName: e.target.value})} 
              className="w-full px-5 py-4 text-white font-bold transition-all" 
              placeholder="Nombre del cliente..." 
            />
          </section>

          <section className="card p-8">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-700/50 pb-4">
              <LayoutGrid size={18} className="text-neon-green" />
              <h2 className="text-lg font-black uppercase tracking-widest">2. Selección de Producto</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Referencia</label>
                  <select 
                    value={inputs.referencia} 
                    onChange={(e) => setInputs({...inputs, referencia: e.target.value})} 
                    className="w-full"
                  >
                    {productRefs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Costo Base</label>
                  <div className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3.5 text-aqua font-black">
                    $ {currentProduct.baseCost.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                  <select 
                    value={inputs.categoria} 
                    onChange={(e) => setInputs({...inputs, categoria: e.target.value as any})} 
                    className="w-full"
                  >
                    <option value="Niño">Niño</option>
                    <option value="Adulto">Adulto</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Talla</label>
                  <select value={inputs.talla} onChange={(e) => setInputs({...inputs, talla: e.target.value})} className="w-full">
                    {(inputs.categoria === 'Niño' ? TALLAS_NINO : TALLAS_ADULTO).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Color Camiseta / Superior</label>
                  <select value={inputs.colorCamiseta} onChange={(e) => setInputs({...inputs, colorCamiseta: e.target.value})} className="w-full">
                    <option value="No aplica">No aplica</option>
                    {COLORES_CAMISETA.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                {showBermudaSelector && (
                  <div className="space-y-2" id="wrapColorInferior">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Color Bermuda / Jogger</label>
                    <select 
                      value={inputs.colorBermuda} 
                      onChange={(e) => setInputs({...inputs, colorBermuda: e.target.value})} 
                      className="w-full"
                    >
                      <option value="No aplica">No aplica</option>
                      {COLORES_BERMUDA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">Cm² Estampado <Info size={10} /></label>
                  <input type="number" min="0" value={inputs.cmEstampado} onChange={(e) => setInputs({...inputs, cmEstampado: Number(e.target.value)})} className="w-full px-4 py-3.5 text-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">Punto Corazón <Info size={10} /></label>
                  <input type="number" min="0" value={inputs.cmCorazon} onChange={(e) => setInputs({...inputs, cmCorazon: Number(e.target.value)})} className="w-full px-4 py-3.5 text-white font-bold border-2 border-aqua/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Planchados</label>
                  <input type="number" min="0" value={inputs.qtyPlanchado} onChange={(e) => setInputs({...inputs, qtyPlanchado: Number(e.target.value)})} className="w-full px-4 py-3.5 text-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Empaque</label>
                  <input type="number" min="0" value={inputs.costoEmpaque} onChange={(e) => setInputs({...inputs, costoEmpaque: Number(e.target.value)})} className="w-full px-4 py-3.5 text-white font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad Ítems</label>
                <input type="number" min="1" value={inputs.quantity} onChange={(e) => setInputs({...inputs, quantity: Math.max(1, Number(e.target.value))})} className="w-full bg-slate-900/40 border-2 border-dashed border-slate-700 rounded-xl px-5 py-4 text-white font-black text-center text-2xl outline-none focus:border-neon-green transition-colors" />
              </div>

              <button onClick={addToQuote} className="btn-primary w-full py-5 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl mt-4">
                <Plus size={18} /> AGREGAR AL PEDIDO
              </button>
            </div>
          </section>

          <div className="text-center">
             <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-aqua transition-colors flex items-center gap-2 justify-center mx-auto">
                <FileUp size={14} /> Importar Excel de Precios
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
          </div>
        </div>

        {/* PANEL DERECHO: RESULTADOS Y PEDIDO */}
        <div className="lg:col-span-7 space-y-10">
           {/* Resumen Hero Section */}
           <section className="card p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                 <Zap size={140} strokeWidth={3} className="text-white" />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                 <div className="flex-1">
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[9px] mb-4">Venta Sugerida (Unidad)</p>
                    <h3 className="text-7xl font-black text-white tracking-tighter drop-shadow-lg mb-6">
                       {formatCOP(currentResults.precioUnidad)}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                       <div className="bg-neon-green/10 text-neon-green px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-neon-green/20">TOTAL LOTE: {formatCOP(currentResults.precioTotal)}</div>
                    </div>
                 </div>
                 
                 <div className="w-full md:w-64 bg-slate-950/30 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-inner">
                    <h4 className="text-slate-500 font-black text-[9px] uppercase tracking-widest mb-6">Rentabilidad</h4>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[10px] uppercase font-bold">Ganancia Real</span>
                          <span className="text-white font-black text-sm">{formatCOP(currentResults.ganancia)}</span>
                       </div>
                       <div className="h-px bg-slate-800 w-full"></div>
                       <div className="flex justify-between items-end">
                          <span className="text-slate-400 text-[10px] uppercase font-bold pb-1">Margen</span>
                          <span className="text-lime font-black text-4xl tracking-tighter">{currentResults.margen.toFixed(1)}%</span>
                       </div>
                    </div>
                 </div>
              </div>
           </section>

           {/* Pedido Actual List */}
           <section className="card p-10">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
                 <div className="flex items-center gap-4">
                    <div className="bg-aqua/10 p-3 rounded-xl"><ShoppingCart size={20} className="text-aqua" /></div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Pedido Actual</h2>
                 </div>
                 <button 
                  onClick={downloadPDF_jsPDF} 
                  disabled={quoteItems.length === 0 && !inputs.clientName} 
                  className="bg-white hover:bg-neon-green text-black font-black px-8 py-4 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-20"
                 >
                    <Download size={16} /> EXPORTAR PDF PARA CLIENTE
                 </button>
              </div>

              {quoteItems.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                   <p className="text-slate-600 font-bold uppercase tracking-widest text-[11px]">No hay productos en el pedido.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {quoteItems.map(item => (
                    <div key={item.id} className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-[1.8rem] flex flex-col sm:flex-row justify-between items-center gap-6 hover:border-aqua/40 transition-all group">
                       <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center text-white/50 font-black text-lg rotate-3 group-hover:rotate-0 transition-transform">x{item.quantity}</div>
                          <div>
                             <h4 className="text-white font-black uppercase text-base tracking-tight">{item.product.name}</h4>
                             <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-aqua/10 text-aqua px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">TALLA {item.talla}</span>
                                <span className="bg-hot-pink/10 text-hot-pink px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">SUP: {item.colorCamiseta}</span>
                                {item.colorBermuda && item.colorBermuda !== "No aplica" && <span className="bg-lime/10 text-lime px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">INF: {item.colorBermuda}</span>}
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-8">
                          <div className="text-right">
                             <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Subtotal Item</p>
                             <p className="text-white font-black text-2xl tracking-tighter">{formatCOP(item.results.precioTotal)}</p>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="p-4 bg-slate-900/60 hover:bg-red-500/20 text-slate-600 hover:text-red-500 rounded-2xl transition-all border border-slate-700">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  ))}

                  <div className="mt-12 pt-10 border-t border-slate-800 flex justify-between items-end">
                     <div>
                        <p className="text-hot-pink font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-2 mb-2">
                           <Target size={14} /> VALOR TOTAL COTIZADO
                        </p>
                        <p className="text-6xl font-black text-white tracking-tighter">
                          {formatCOP(quoteItems.reduce<number>((acc: number, item: QuoteItem) => acc + item.results.precioTotal, 0))}
                        </p>
                     </div>
                  </div>
                </div>
              )}
           </section>

           {/* OBSERVACIONES SECTION */}
           <section className="card p-10 bg-slate-900/20">
              <div className="space-y-4">
                 <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                   <MessageSquare size={14} className="text-neon-green" /> Notas para el PDF
                 </label>
                 <textarea 
                  value={observaciones} 
                  onChange={(e) => setObservaciones(e.target.value)} 
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-[1.8rem] px-8 py-6 text-white text-sm font-medium min-h-[120px] resize-none focus:ring-2 focus:ring-hot-pink outline-none transition-all" 
                  placeholder="Ej: Lavar a mano, no planchar directamente sobre el estampado. Entrega en 10 días hábiles..." 
                 />
              </div>
           </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-3xl border-t border-white/5 py-5 px-12 z-[60]">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-black uppercase tracking-[0.5em] text-slate-600">
            <div className="flex gap-12">
               <span className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-hot-pink shadow-[0_0_10px_#FF4FD8]"></div> DTG & DTF PRO</span>
               <span className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-neon-green shadow-[0_0_10px_#34FF4A]"></div> CALIDAD PREMIUM</span>
            </div>
            <div className="text-aqua italic tracking-[0.8em] flex items-center gap-4">
               FURIA ROCK <div className="w-1 h-1 bg-slate-800 rounded-full"></div> COCO YEMA
            </div>
         </div>
      </footer>
    </div>
  );
};

export default App;