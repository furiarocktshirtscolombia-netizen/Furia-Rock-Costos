
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { QuoteInputs, QuoteResults, ProductReference } from './types';
import { 
  PRODUCT_REFERENCES_INITIAL, 
  TALLAS_NINO, 
  TALLAS_ADULTO, 
  COSTO_CM2, 
  COSTO_PLANCHADO,
  COSTO_EMPAQUE,
  GANANCIA_FIJA
} from './constants';
import { getSalesAdvice } from './services/geminiService';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend
} from 'recharts';
import { 
  Calculator, 
  RockingChair as Rock, 
  Shirt, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Sparkles,
  Loader2,
  FileUp,
  Package,
  Flame,
  Zap,
  Target,
  Download,
  MessageSquare,
  User,
  Hash
} from 'lucide-react';

const App: React.FC = () => {
  const [productRefs, setProductRefs] = useState<ProductReference[]>(PRODUCT_REFERENCES_INITIAL);
  const [inputs, setInputs] = useState<QuoteInputs>({
    clientName: "",
    quantity: 1,
    referencia: PRODUCT_REFERENCES_INITIAL[0].id,
    categoria: 'Niño',
    talla: TALLAS_NINO[3],
    cmEstampado: 0,
    cmCorazon: 0,
    qtyPlanchado: 1,
    costoEmpaque: COSTO_EMPAQUE
  });
  const [observaciones, setObservaciones] = useState("");

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const findKey = (obj: any, candidates: string[]) => {
    const keys = Object.keys(obj);
    const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]/g, '');
    for (const cand of candidates) {
      const target = normalize(cand);
      const match = keys.find(k => normalize(k) === target);
      if (match) return match;
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as any[];

      if (rows.length === 0) throw new Error("El archivo está vacío");

      const newRefs: ProductReference[] = rows.map((row, index) => {
        const refKey = findKey(row, ['referencia', 'ref', 'reference', 'nombre', 'producto']);
        const costKey = findKey(row, ['precio_unitario', 'precio', 'costo', 'base', 'unit_price']);
        
        return {
          id: String(row[refKey || ''] || `id-${index}`),
          name: String(row[refKey || ''] || `Producto ${index + 1}`),
          baseCost: Number(String(row[costKey || ''] || '0').replace(/[^\d.]/g, '')) || 0,
        };
      }).filter(p => p.name);

      if (newRefs.length > 0) {
        setProductRefs(newRefs);
        setInputs(prev => ({ ...prev, referencia: newRefs[0].id }));
        alert(`¡Base de datos cargada! ${newRefs.length} productos detectados.`);
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar el Excel.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    setInputs(prev => ({
      ...prev,
      talla: prev.categoria === 'Niño' ? TALLAS_NINO[0] : TALLAS_ADULTO[0]
    }));
  }, [inputs.categoria]);

  const results = useMemo((): QuoteResults => {
    const product = productRefs.find(p => p.id === inputs.referencia) || productRefs[0];
    const costoBase = product.baseCost;
    
    // Formula: cm2 * 170
    const costoEstampado = Number(inputs.cmEstampado || 0) * COSTO_CM2;
    const costoCorazon = Number(inputs.cmCorazon || 0) * COSTO_CM2;
    
    // Formula: planchados * 1000
    const costoPlanchado = Number(inputs.qtyPlanchado || 0) * COSTO_PLANCHADO;
    const costoEmpaque = Number(inputs.costoEmpaque || 0);
    
    // Cost per Unit
    const costoTotalUnidad = costoBase + costoEstampado + costoCorazon + costoPlanchado + costoEmpaque;
    
    // Profit per Unit: Fixed $30,000
    const ganancia = GANANCIA_FIJA;
    const precioUnidad = Math.round(costoTotalUnidad + ganancia);
    
    // Total order value
    const precioTotal = precioUnidad * Math.max(1, inputs.quantity);
    const margen = (ganancia / precioUnidad) * 100;

    return {
      costoBase,
      costoEstampado,
      costoCorazon,
      costoPlanchado,
      costoEmpaque,
      costoTotal: costoTotalUnidad,
      precioUnidad,
      precioTotal,
      ganancia,
      margen
    };
  }, [inputs, productRefs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "observaciones") {
      setObservaciones(value);
      return;
    }
    setInputs(prev => ({ 
      ...prev, 
      [name]: (name.includes('cm') || name.includes('qty') || name === 'quantity' || name === 'costoEmpaque') ? Number(value) : value 
    }));
  };

  const generatePitch = async () => {
    setIsAiLoading(true);
    const product = productRefs.find(p => p.id === inputs.referencia)!;
    const advice = await getSalesAdvice(inputs, results, product);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  const downloadPDF = () => {
    const product = productRefs.find(p => p.id === inputs.referencia)!;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('FURIA ROCK KIDS - ROPA CON ACTITUD', 105, 30, { align: 'center' });

    // Client/Order Data
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Cliente:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${inputs.clientName || '____________________________'}`, 15, 65);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 72);
    
    // Detailed Table
    (doc as any).autoTable({
      startY: 85,
      head: [['Referencia', 'Talla', 'Cantidad', 'Valor Total']],
      body: [
        [
          product.name,
          inputs.talla,
          inputs.quantity,
          `$ ${results.precioTotal.toLocaleString()}`
        ]
      ],
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center' },
      styles: { halign: 'center', cellPadding: 5 },
      margin: { left: 15, right: 15 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Breakdown Section
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Procesamiento (Unitario):', 15, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`- Estampado Principal: ${inputs.cmEstampado} cm²`, 15, finalY + 10);
    doc.text(`- Estampado Corazón: ${inputs.cmCorazon} cm²`, 15, finalY + 17);
    doc.text(`- Planchado: ${inputs.qtyPlanchado} unidades`, 15, finalY + 24);
    doc.text(`- Empaque: $ ${results.costoEmpaque.toLocaleString()}`, 15, finalY + 31);

    // Final Total
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`VALOR TOTAL COTIZADO: $ ${results.precioTotal.toLocaleString()} COP`, 15, finalY + 50);

    // Observations
    doc.setFontSize(12);
    doc.text('Observaciones:', 15, finalY + 65);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const splitObs = doc.splitTextToSize(observaciones || 'Sin observaciones adicionales.', 180);
    doc.text(splitObs, 15, finalY + 75);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento tiene validez por 15 días.', 105, 285, { align: 'center' });

    doc.save(`Cotizacion_FuriaRockKids_${inputs.clientName || 'Cliente'}.pdf`);
  };

  const chartData = [
    { name: 'Prenda', value: results.costoBase, color: '#4f46e5' },
    { name: 'Estampado', value: results.costoEstampado + results.costoCorazon, color: '#db2777' },
    { name: 'Operación', value: results.costoPlanchado + results.costoEmpaque, color: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20 selection:bg-red-500/30">
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-red-900/30 py-6 px-4 md:px-8 mb-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-red-600 to-red-800 p-2.5 rounded-2xl rotate-6 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              <Shirt size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Furia Rock Kids</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-bold">Financial Operations Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold px-6 py-3 rounded-2xl transition-all border border-slate-700">
              <FileUp size={18} /> Cargar Base XLSX
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Panel Izquierdo: Configuración */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-red-500/20 p-2 rounded-lg"><User size={20} className="text-red-500" /></div>
              <h2 className="text-xl font-bold text-white tracking-tight">Datos del Cliente</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Nombre del Cliente</label>
                <input 
                  type="text" 
                  name="clientName" 
                  value={inputs.clientName} 
                  onChange={handleInputChange} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  placeholder="Ej: Diego Roca"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Referencia</label>
                  <select name="referencia" value={inputs.referencia} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-red-600">
                    {productRefs.map(ref => <option key={ref.id} value={ref.id}>{ref.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Cantidad Prendas</label>
                  <div className="relative">
                    <input type="number" name="quantity" min="1" value={inputs.quantity} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 pl-12 text-white font-bold focus:ring-2 focus:ring-red-600" />
                    <Hash className="absolute left-4 top-4.5 text-slate-600" size={18} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-500/20 p-2 rounded-lg"><Calculator size={20} className="text-indigo-500" /></div>
              <h2 className="text-xl font-bold text-white tracking-tight">Pedido Personalizado</h2>
            </div>
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Categoría</label>
                <select name="categoria" value={inputs.categoria} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold">
                  <option value="Niño">👦 Niño</option>
                  <option value="Adulto">🧔 Adulto</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Talla</label>
                <select name="talla" value={inputs.talla} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold">
                  {(inputs.categoria === 'Niño' ? TALLAS_NINO : TALLAS_ADULTO).map(talla => <option key={talla} value={talla}>{talla}</option>)}
                </select>
              </div>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Cm² Principal ($170)</label>
                  <input type="number" name="cmEstampado" value={inputs.cmEstampado} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Cm² Corazón ($170)</label>
                  <input type="number" name="cmCorazon" value={inputs.cmCorazon} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label htmlFor="inpPlanchadosQty" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Planchados (cantidad)</label>
                  <div className="relative">
                    <input 
                      id="inpPlanchadosQty"
                      type="number" 
                      name="qtyPlanchado" 
                      min="0" 
                      value={inputs.qtyPlanchado} 
                      onChange={handleInputChange} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 pl-12 text-white font-bold focus:ring-2 focus:ring-red-600 outline-none"
                    />
                    <Zap className="absolute left-4 top-4.5 text-slate-600" size={18} />
                  </div>
                </div>
                <div>
                  <label htmlFor="inpEmpaque" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Empaque (costo)</label>
                  <div className="relative">
                    <input 
                      id="inpEmpaque"
                      type="number" 
                      name="costoEmpaque" 
                      min="0" 
                      value={inputs.costoEmpaque} 
                      onChange={handleInputChange} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 pl-12 text-white font-bold focus:ring-2 focus:ring-red-600 outline-none"
                    />
                    <Package className="absolute left-4 top-4.5 text-slate-600" size={18} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
            <h4 className="text-white font-bold mb-4 flex items-center gap-3">
              <MessageSquare size={20} className="text-indigo-500" /> Observaciones (Opcional)
            </h4>
            <textarea 
              name="observaciones" 
              value={observaciones} 
              onChange={handleInputChange} 
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm min-h-[100px] resize-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Detalles que aparecerán en el PDF..."
            />
          </div>
        </div>

        {/* Panel Derecho: Resultados */}
        <div className="lg:col-span-7 space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-black rounded-[3rem] p-12 shadow-2xl border border-white/5">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="text-center md:text-left">
                <p className="text-white/60 font-black uppercase tracking-[0.4em] text-[11px] mb-3">Valor Total Cotizado</p>
                <div className="flex items-baseline gap-4 justify-center md:justify-start">
                  <span className="text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
                    ${results.precioTotal.toLocaleString()}
                  </span>
                  <span className="text-3xl text-white/50 font-bold">COP</span>
                </div>
                <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="bg-white/10 backdrop-blur-xl px-7 py-2.5 rounded-full text-white text-xs font-black flex items-center gap-2.5">
                    <Target size={18} className="text-red-400" /> Margen: {results.margen.toFixed(1)}%
                  </div>
                  <button onClick={downloadPDF} className="bg-white hover:bg-slate-100 text-black px-7 py-2.5 rounded-full text-xs font-black flex items-center gap-2.5 transition-all shadow-2xl active:scale-95">
                    <Download size={18} /> GENERAR COTIZACIÓN (PDF)
                  </button>
                </div>
              </div>
              <div className="bg-black/40 p-8 rounded-[2.5rem] backdrop-blur-3xl border border-white/5 w-full md:w-80">
                <p className="text-white/40 text-[10px] font-black uppercase mb-5 tracking-[0.2em]">Desglose Unitario</p>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60 font-bold uppercase tracking-widest">Base Prenda:</span>
                    <span className="text-white font-black">${results.costoBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60 font-bold uppercase tracking-widest">Tinta/Extra:</span>
                    <span className="text-white font-black">${(results.costoEstampado + results.costoCorazon).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60 font-bold uppercase tracking-widest">Iron/Pack:</span>
                    <span className="text-white font-black">${(results.costoPlanchado + results.costoEmpaque).toLocaleString()}</span>
                  </div>
                  <div className="pt-5 mt-5 border-t border-white/10 flex justify-between font-black text-2xl text-white">
                    <span className="text-white/40 text-[11px] uppercase font-black self-center">Unidad:</span>
                    <span className="text-red-500">${results.precioUnidad.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <Rock className="absolute -bottom-16 -left-16 opacity-10 text-white scale-150 rotate-12" size={400} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col items-center">
              <h4 className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em] mb-10 self-start">Distribución de Costos</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={85} paddingAngle={10} dataKey="value">
                      {chartData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderRadius: '20px', border: '1px solid #1e293b', color: '#fff', fontWeight: '900' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden">
              <div className="bg-emerald-500/10 p-6 rounded-full mb-6">
                <TrendingUp size={48} className="text-emerald-500" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3">Utilidad por Prenda (Fija)</p>
              <p className="text-6xl font-black text-white tracking-tighter" id="txtGanancia">${GANANCIA_FIJA.toLocaleString()}</p>
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-20"></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="bg-indigo-600/20 p-4 rounded-2xl shadow-inner"><Sparkles className="text-indigo-500" size={32} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase text-sm tracking-widest">Pitch de Venta (AI)</h4>
                    <p className="text-xs text-slate-500 font-medium">Argumento de venta persuasivo rockero</p>
                  </div>
                </div>
                <button onClick={generatePitch} disabled={isAiLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-10 py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-xl shadow-indigo-900/40">
                  {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : 'Generar Pitch IA'}
                </button>
             </div>
             <div className="min-h-[140px] bg-slate-950/80 rounded-3xl p-10 border border-slate-800/50 text-slate-300 leading-relaxed font-semibold italic text-lg shadow-inner">
                {aiAdvice ? `"${aiAdvice}"` : "Configura tu pedido y obtén un discurso de ventas profesional para cerrar el trato."}
             </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800 py-5 px-10 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          <div className="flex flex-wrap justify-center gap-8">
             <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-600"></div> TINTA: ${COSTO_CM2}/cm²</span>
             <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> PLANCHADO: ${COSTO_PLANCHADO}</span>
             <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-orange-600"></div> EMPAQUE: COSTO VARIABLE</span>
          </div>
          <div className="text-indigo-400 font-black">FURIA ROCK KIDS • OPERATIONAL INTELLIGENCE</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
