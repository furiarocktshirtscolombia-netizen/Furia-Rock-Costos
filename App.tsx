import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { QuoteInputs, QuoteResults, ProductReference, QuoteItem, Sale, Purchase } from './types';
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
  GANANCIA_ADULTO,
  METODOS_PAGO
} from './constants';
import Navigation from './src/components/Navigation';
import Ventas from './src/components/Ventas';
import Compras from './src/components/Compras';
import Dashboard from './src/components/Dashboard';
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
  Info,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

const LOGO_FURIA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/%3E%3C/svg%3E";
const LOGO_COCO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M8 14s1.5 2 4 2 4-2 4-2'/%3E%3Cline x1='9' y1='9' x2='9.01' y2='9'/%3E%3Cline x1='15' y1='9' x2='15.01' y2='9'/%3E%3C/svg%3E";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cotizador');
  const [productRefs, setProductRefs] = useState<ProductReference[]>(PRODUCT_REFERENCES_INITIAL);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('furia_sales');
    return saved ? JSON.parse(saved) : [];
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('furia_purchases');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputs, setInputs] = useState<QuoteInputs>({
    clientName: "",
    quantity: 1,
    referencia: PRODUCT_REFERENCES_INITIAL[0].id,
    categoria: 'Niño',
    talla: TALLAS_NINO[3],
    colorCamiseta: COLORES_CAMISETA[2], // Negro por defecto
    colorInferior: "No aplica",
    cmEstampado: 0,
    cmCorazon: 0,
    qtyPlanchado: 1,
    costoEmpaque: COSTO_EMPAQUE
  });
  const [observaciones, setObservaciones] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('furia_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('furia_purchases', JSON.stringify(purchases));
  }, [purchases]);

  const handleRegisterSale = () => {
    if (quoteItems.length === 0) return alert("No hay items para vender.");
    
    const newSales: Sale[] = quoteItems.map(item => ({
      id: Date.now() + Math.random(),
      fecha: new Date().toISOString().split('T')[0],
      cliente: inputs.clientName || "Cliente General",
      referencia: item.product.name,
      categoria: item.categoria,
      talla: item.talla,
      colorCamiseta: item.colorCamiseta,
      colorInferior: item.colorInferior,
      cantidad: item.quantity,
      precioVentaUnitario: item.results.precioUnidad,
      costoUnitario: item.results.costoTotal,
      totalVenta: item.results.precioTotal,
      costoTotal: item.results.costoTotal * item.quantity,
      ganancia: item.results.ganancia * item.quantity,
      metodoPago: "Pendiente",
      estado: 'Pendiente',
      observaciones: observaciones
    }));

    setSales(prev => [...prev, ...newSales]);
    setQuoteItems([]);
    setInputs(prev => ({ ...prev, clientName: "" }));
    setObservaciones("");
    setActiveTab('ventas');
    alert("¡Venta registrada con éxito!");
  };

  const handleAddSale = (sale: Sale) => {
    setSales(prev => [...prev, sale]);
  };

  const handleDeleteSale = (id: string) => {
    if (confirm("¿Eliminar esta venta?")) {
      setSales(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleUpdateSaleStatus = (id: string, status: Sale['estado']) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, estado: status } : s));
  };

  const handleAddPurchase = (purchase: Purchase) => {
    setPurchases(prev => [...prev, purchase]);
  };

  const handleDeletePurchase = (id: string) => {
    if (confirm("¿Eliminar este registro de compra?")) {
      setPurchases(prev => prev.filter(p => p.id !== id));
    }
  };

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

  const esConjunto = (refName: string) => {
    const r = (refName || "").toLowerCase();
    return r.includes("conjunto") || r.includes("jogger") || r.includes("bermuda") || r.includes("joker") || r.includes("set") || r.includes("+");
  };

  const isConjuntoItem = useMemo(() => esConjunto(currentProduct?.name), [currentProduct]);

  // Mostrar selector de bermuda solo en Niño + Conjunto
  const showBermudaSelector = useMemo(() => {
    return (inputs.categoria === 'Niño') && isConjuntoItem;
  }, [inputs.categoria, isConjuntoItem]);

  useEffect(() => {
    if (!showBermudaSelector) {
      setInputs(prev => ({ ...prev, colorInferior: "No aplica" }));
    } else if (inputs.colorInferior === "No aplica") {
      setInputs(prev => ({ ...prev, colorInferior: COLORES_BERMUDA[2] })); // Negro como fallback visible
    }
  }, [showBermudaSelector]);

  const currentResults = useMemo((): QuoteResults => {
    const base = currentProduct.baseCost;
    const estampadoPrincipal = (Number(inputs.cmEstampado) || 0) * COSTO_CM2;
    const estampadoCorazon = (Number(inputs.cmCorazon) || 0) * COSTO_CM2;
    const costoPlanchado = (Number(inputs.qtyPlanchado) || 0) * COSTO_PLANCHADO;
    const empaque = Number(inputs.costoEmpaque) || 0;
    
    const costoTotalUnidad = base + estampadoPrincipal + estampadoCorazon + costoPlanchado + empaque;
    
    // Regla de ganancia: Niño Conjunto = 35k, Resto = 30k
    const ganancia = (inputs.categoria === 'Niño' && isConjuntoItem) ? GANANCIA_NINO : GANANCIA_ADULTO;
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
  }, [inputs, currentProduct, isConjuntoItem]);

  const addToQuote = () => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product: currentProduct,
      categoria: inputs.categoria,
      talla: inputs.talla,
      colorCamiseta: inputs.colorCamiseta,
      colorInferior: showBermudaSelector ? inputs.colorInferior : "No aplica",
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

  // EXPORTACIÓN PDF HORIZONTAL OPTIMIZADA
  const downloadPDF_jsPDF = () => {
    const itemsToExport: QuoteItem[] = quoteItems.length > 0 ? quoteItems : [{
      id: 'preview',
      product: currentProduct,
      categoria: inputs.categoria,
      talla: inputs.talla,
      colorCamiseta: inputs.colorCamiseta,
      colorInferior: showBermudaSelector ? inputs.colorInferior : "No aplica",
      cmEstampado: inputs.cmEstampado,
      cmCorazon: inputs.cmCorazon,
      qtyPlanchado: inputs.qtyPlanchado,
      costoEmpaque: inputs.costoEmpaque,
      quantity: inputs.quantity,
      results: currentResults
    } as QuoteItem];

    // @ts-ignore
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return alert("Error: jsPDF no detectado.");

    const doc = new jsPDF("l", "mm", "a4"); 
    const clienteNombre = inputs.clientName || "CLIENTE";
    const fechaStr = new Date().toLocaleDateString("es-CO");
    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 79, 216); 
    doc.text("FURIA ROCK KIDS", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("ESTILO REBELDE • CALIDAD PREMIUM • DTG & DTF", 14, 26);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`CLIENTE: ${clienteNombre.toUpperCase()}`, 14, 38);
    doc.text(`FECHA: ${fechaStr}`, pageWidth - 14, 38, { align: 'right' });

    // BODY
    const head = [["REFERENCIA", "DETALLES / COLORES", "CANT.", "V. UNITARIO", "V. TOTAL"]];
    const body = itemsToExport.map(it => [
      it.product.name.toUpperCase(),
      `Talla: ${it.talla || "-"}\n` +
      (it.colorCamiseta !== "No aplica" ? `Superior: ${it.colorCamiseta}\n` : "") +
      (it.colorInferior !== "No aplica" ? `Bermuda/Jogger: ${it.colorInferior}` : ""),
      String(it.quantity),
      formatCOP(it.results.precioUnidad),
      formatCOP(it.results.precioTotal)
    ]);

    // AUTOTABLE (Landscape Distribution: ~269mm total util)
    // @ts-ignore
    doc.autoTable({
      startY: 45,
      head,
      body,
      theme: 'grid',
      styles: { font: "helvetica", fontSize: 10, cellPadding: 4, valign: "middle" },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 90, halign: "left" },   // REF
        1: { cellWidth: 100, halign: "left" },  // DETALLES
        2: { cellWidth: 15, halign: "center" }, // CANT
        3: { cellWidth: 32, halign: "right" },  // UNIT
        4: { cellWidth: 32, halign: "right", fontStyle: "bold" } // TOTAL
      },
      margin: { left: 14, right: 14 }
    });

    // TOTALS
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 150;
    const totalGeneral = itemsToExport.reduce<number>((acc, it) => acc + it.results.precioTotal, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`TOTAL COTIZADO: ${formatCOP(totalGeneral)} COP`, pageWidth - 14, finalY + 12, { align: "right" });

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
    doc.save(`Cotizacion_FuriaRock_${clienteNombre.replace(/\s+/g, '_')}.pdf`);
  };

  const renderCotizador = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-5 space-y-8">
        <section className="panel p-8">
          <div className="flex items-center gap-4 mb-6">
            <User size={18} className="text-gray-400" />
            <h2 className="text-lg font-bold uppercase tracking-widest">1. Datos del Cliente</h2>
          </div>
          <input 
            type="text" 
            value={inputs.clientName} 
            onChange={(e) => setInputs({...inputs, clientName: e.target.value})} 
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none transition-all" 
            placeholder="Nombre del cliente..." 
          />
        </section>

        <section className="panel p-8">
          <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-4">
            <LayoutGrid size={18} className="text-gray-400" />
            <h2 className="text-lg font-bold uppercase tracking-widest">2. Selección Técnica</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Referencia</label>
                <select 
                  value={inputs.referencia} 
                  onChange={(e) => setInputs({...inputs, referencia: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none"
                  id="selReferencia"
                >
                  {productRefs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Costo Base</label>
                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold">
                  $ {currentProduct.baseCost.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Categoría</label>
                <select 
                  value={inputs.categoria} 
                  onChange={(e) => setInputs({...inputs, categoria: e.target.value as any})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none"
                  id="selCategoria"
                >
                  <option value="Niño">Niño</option>
                  <option value="Adulto">Adulto</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Talla</label>
                <select 
                  value={inputs.talla} 
                  onChange={(e) => setInputs({...inputs, talla: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none"
                >
                  {(inputs.categoria === 'Niño' ? TALLAS_NINO : TALLAS_ADULTO).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Color Camiseta</label>
                <select 
                  value={inputs.colorCamiseta} 
                  onChange={(e) => setInputs({...inputs, colorCamiseta: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none"
                >
                  {COLORES_CAMISETA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              {showBermudaSelector && (
                <div className="space-y-2" id="wrapColorInferior">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Color Bermuda/Jogger</label>
                  <select 
                    value={inputs.colorInferior} 
                    onChange={(e) => setInputs({...inputs, colorInferior: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none"
                  >
                    {COLORES_BERMUDA.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1">Cm² Estampado <Info size={10} /></label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.cmEstampado} 
                  onChange={(e) => setInputs({...inputs, cmEstampado: Number(e.target.value)})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1">Punto Corazón <Info size={10} /></label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.cmCorazon} 
                  onChange={(e) => setInputs({...inputs, cmCorazon: Number(e.target.value)})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Planchados</label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.qtyPlanchado} 
                  onChange={(e) => setInputs({...inputs, qtyPlanchado: Number(e.target.value)})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Empaque</label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.costoEmpaque} 
                  onChange={(e) => setInputs({...inputs, costoEmpaque: Number(e.target.value)})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Cantidad Lote</label>
              <input 
                type="number" 
                min="1" 
                value={inputs.quantity} 
                onChange={(e) => setInputs({...inputs, quantity: Math.max(1, Number(e.target.value))})} 
                className="w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl px-5 py-4 text-gray-900 font-bold text-center text-2xl outline-none focus:border-black transition-colors" 
              />
            </div>

            <button onClick={addToQuote} className="w-full bg-black text-white py-5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98]">
              <Plus size={18} /> AGREGAR PRENDA AL PEDIDO
            </button>
            <button 
              onClick={() => setInputs({
                clientName: inputs.clientName,
                quantity: 1,
                referencia: productRefs[0].id,
                categoria: 'Niño',
                talla: TALLAS_NINO[3],
                colorCamiseta: COLORES_CAMISETA[2],
                colorInferior: "No aplica",
                cmEstampado: 0,
                cmCorazon: 0,
                qtyPlanchado: 1,
                costoEmpaque: COSTO_EMPAQUE
              })} 
              className="w-full text-[10px] text-gray-400 hover:text-gray-900 uppercase font-bold tracking-widest mt-4 transition-colors"
            >
              Resetear Formulario
            </button>
          </div>
        </section>

        <div className="text-center space-y-2">
           <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-gray-900 transition-colors flex items-center gap-2 justify-center mx-auto">
              <FileUp size={14} /> Importar Excel de Precios
           </button>
           <p className="text-[8px] text-gray-400 uppercase tracking-tighter">El Excel debe tener columnas: "Referencia" y "Precio_Unitario"</p>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
        </div>
      </div>

      <div className="lg:col-span-7 space-y-8">
         <section className="panel p-12 relative overflow-hidden group bg-black text-white border-none shadow-2xl">
            <div className="absolute -top-24 -right-24 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
               <Zap size={300} strokeWidth={1} className="text-white" />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
               <div className="flex-1 text-center lg:text-left">
                  <p className="text-gray-500 font-bold uppercase tracking-[0.5em] text-[10px] mb-6">Venta Sugerida (Unidad)</p>
                  <h3 className="text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                     {formatCOP(currentResults.precioUnidad)}
                  </h3>
                  <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                     <div className="bg-white/10 text-white px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest border border-white/10 backdrop-blur-md">TOTAL LOTE: {formatCOP(currentResults.precioTotal)}</div>
                  </div>
               </div>
               <div className="w-full lg:w-80 bg-white/5 backdrop-blur-2xl p-10 rounded-[40px] border border-white/10 shadow-inner">
                  <h4 className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-8 text-center">Rentabilidad</h4>
                  <div className="space-y-8">
                     <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Ganancia Real</span>
                        <span className="text-white font-bold text-lg">{formatCOP(currentResults.ganancia)}</span>
                     </div>
                     <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full"></div>
                     <div className="flex justify-between items-end">
                        <span className="text-gray-500 text-[10px] uppercase font-bold pb-2 tracking-widest">Margen</span>
                        <span className="text-white font-black text-5xl tracking-tighter">{currentResults.margen.toFixed(1)}%</span>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         <section className="panel p-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
               <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-3 rounded-xl"><ShoppingCart size={20} className="text-gray-900" /></div>
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Pedido Actual</h2>
               </div>
               <div className="flex flex-wrap gap-3 justify-center">
                <button 
                  onClick={() => { if(confirm("¿Limpiar toda la cotización?")) setQuoteItems([]); }} 
                  className="bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all active:scale-95"
                >
                  <Trash2 size={16} /> LIMPIAR
                </button>
                <button 
                  onClick={downloadPDF_jsPDF} 
                  disabled={quoteItems.length === 0 && !inputs.clientName} 
                  className="bg-black hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-20"
                >
                  <Download size={16} /> PDF
                </button>
                <button 
                  onClick={handleRegisterSale} 
                  disabled={quoteItems.length === 0} 
                  className="bg-black hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-20"
                >
                  <CheckCircle2 size={16} /> CONVERTIR EN VENTA
                </button>
               </div>
            </div>

            {quoteItems.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                 <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">No hay productos en la cotización.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {quoteItems.map(item => (
                  <div key={item.id} className="bg-gray-50 border border-gray-100 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 hover:border-gray-300 transition-all group">
                     <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 font-bold text-lg rotate-3 group-hover:rotate-0 transition-transform">x{item.quantity}</div>
                        <div className="flex-1">
                           <h4 className="text-gray-900 font-bold uppercase text-base tracking-tight">{item.product.name}</h4>
                           <div className="flex flex-wrap gap-2 mt-2">
                              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">TALLA {item.talla}</span>
                              {item.colorCamiseta !== "No aplica" && <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">SUP: {item.colorCamiseta}</span>}
                              {item.colorInferior && item.colorInferior !== "No aplica" && <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">INF: {item.colorInferior}</span>}
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Subtotal Item</p>
                           <p className="text-gray-900 font-bold text-2xl tracking-tighter">{formatCOP(item.results.precioTotal)}</p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-4 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-2xl transition-all border border-gray-200">
                           <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
                ))}
                <div className="mt-12 pt-10 border-t border-gray-100 flex justify-between items-end">
                   <div>
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.4em] flex items-center gap-2 mb-2">
                         <Target size={14} /> VALOR TOTAL COTIZADO
                      </p>
                      <p className="text-6xl font-bold text-gray-900 tracking-tighter">
                        {formatCOP(quoteItems.reduce<number>((acc: number, item: QuoteItem) => acc + item.results.precioTotal, 0))}
                      </p>
                   </div>
                </div>
              </div>
            )}
         </section>

         <section className="panel p-10 bg-gray-50">
            <div className="space-y-4">
               <label className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                 <MessageSquare size={14} className="text-gray-400" /> Notas Personalizadas para el PDF
               </label>
               <textarea 
                value={observaciones} 
                onChange={(e) => setObservaciones(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-3xl px-8 py-6 text-gray-900 text-sm font-medium min-h-[120px] resize-none focus:ring-2 focus:ring-black outline-none transition-all" 
                placeholder="Ej: Lavar a mano, no planchar directamente sobre el estampado. Entrega en 10 días hábiles..." 
               />
            </div>
         </section>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32">
      <header className="app-header py-4 px-12 mb-10 shadow-2xl sticky top-0 z-[100] bg-black/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
              <img src={LOGO_FURIA} className="h-10 w-auto" alt="Furia" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">FURIA ROCK</h1>
              <p className="text-[8px] text-gray-500 font-bold tracking-[0.2em] uppercase">Expertos en DTG & DTF</p>
            </div>
          </div>
          
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex items-center gap-6 text-right hidden lg:flex">
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">COCO YEMA</h1>
              <p className="text-[8px] text-gray-500 font-bold tracking-[0.2em] uppercase">Premium Kids Fashion</p>
            </div>
            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
              <img src={LOGO_COCO} className="h-10 w-auto" alt="Coco" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Info Strip */}
        <section className="panel p-0 overflow-hidden bg-black text-white flex flex-col md:flex-row items-stretch justify-between shadow-2xl border-none">
          <div className="flex-1 flex items-center gap-6 p-8 bg-gradient-to-r from-black to-gray-900">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10"><Zap size={24} className="text-white" /></div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.3em]">Sistema de Gestión Premium</h3>
              <p className="text-[10px] text-gray-500 uppercase font-medium mt-1">Optimiza tu producción y ventas con precisión milimétrica</p>
            </div>
          </div>
          <div className="flex gap-12 p-8 items-center bg-gray-900/50 border-l border-white/5">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Versión</p>
              <p className="text-xs font-bold tracking-widest">2.5.0 PRO</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Estado</p>
              <p className="text-xs font-bold text-green-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div> EN LÍNEA
              </p>
            </div>
          </div>
        </section>

        {activeTab === 'cotizador' && renderCotizador()}
        {activeTab === 'ventas' && (
          <Ventas 
            sales={sales} 
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale} 
            onUpdateSaleStatus={handleUpdateSaleStatus} 
          />
        )}
        {activeTab === 'compras' && (
          <Compras 
            purchases={purchases} 
            onAddPurchase={handleAddPurchase} 
            onDeletePurchase={handleDeletePurchase} 
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard 
            sales={sales} 
            purchases={purchases} 
          />
        )}

        {/* FAQ Section */}
        <section className="panel p-12 mt-20 bg-gray-50 border-none shadow-sm">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><HelpCircle size={24} className="text-gray-900" /></div>
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Preguntas Frecuentes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-gray-900 tracking-widest">¿Cómo funciona el cotizador?</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">El sistema calcula automáticamente el costo de producción basado en la referencia, técnica de estampado y cantidad. Sugiere un precio de venta con un margen de utilidad optimizado para tu negocio.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-gray-900 tracking-widest">¿Cómo exportar reportes?</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">En la pestaña de Ventas encontrarás el botón "Exportar Reporte" que descarga un archivo CSV con todo el historial de transacciones para tu contabilidad y análisis externo.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-gray-900 tracking-widest">¿Cómo actualizar precios base?</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">Puedes importar un archivo Excel en el cotizador con las columnas "Referencia" y "Precio_Unitario" para actualizar masivamente los costos de tus prendas de forma rápida.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-gray-900 tracking-widest">¿Qué es la Matriz de Negocio?</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">Es una herramienta de análisis profundo que clasifica tus productos por rentabilidad real, permitiéndote identificar cuáles generan mayor ganancia neta y cuáles requieren ajustes.</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 py-5 px-12 z-[60]">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-bold uppercase tracking-[0.5em] text-gray-400">
            <div className="flex gap-12">
               <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-black"></div> DTG & DTF PRO</span>
               <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-black"></div> CALIDAD PREMIUM</span>
            </div>
            <div className="text-gray-900 italic tracking-[0.8em] flex items-center gap-4">
               FURIA ROCK <div className="w-1 h-1 bg-gray-200 rounded-full"></div> COCO YEMA
            </div>
         </div>
      </footer>
    </div>
  );
};

export default App;
