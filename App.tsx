
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { QuoteInputs, QuoteResults, ProductReference } from './types';
import { 
  PRODUCT_REFERENCES_INITIAL, 
  TALLAS_NIÑO, 
  TALLAS_ADULTO, 
  COSTO_POR_CM2, 
  COSTO_PLANCHADO_UNITARIO,
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
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { 
  Calculator, 
  RockingChair as Rock, 
  Shirt, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Sparkles,
  Info,
  Loader2,
  FileUp,
  Package,
  Flame,
  Zap
} from 'lucide-react';

const App: React.FC = () => {
  const [productRefs, setProductRefs] = useState<ProductReference[]>(PRODUCT_REFERENCES_INITIAL);
  const [inputs, setInputs] = useState<QuoteInputs>({
    referencia: productRefs[0].id,
    categoria: 'Niño',
    talla: TALLAS_NIÑO[3], 
    cmEstampado: 0,
    cmCorazon: 0,
    qtyPlanchado: 1
  });

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flexible column detection helper
  const findKey = (obj: any, candidates: string[]) => {
    const keys = Object.keys(obj);
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[\s_-]/g, '');
    for (const cand of candidates) {
      const match = keys.find(k => normalize(k) === normalize(cand));
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

      if (rows.length === 0) throw new Error("Archivo vacío");

      const newRefs: ProductReference[] = rows.map((row, index) => {
        const refKey = findKey(row, ['referencia', 'ref', 'reference', 'nombre', 'name', 'producto']);
        const costKey = findKey(row, ['precio_unitario', 'precio unitario', 'precio', 'costo', 'cost', 'unit_price', 'base']);
        
        return {
          id: String(row[refKey || ''] || `id-${index}`),
          name: String(row[refKey || ''] || `Producto ${index + 1}`),
          baseCost: Number(String(row[costKey || ''] || '0').replace(/[^\d.]/g, '')) || 0,
          description: row.description || ''
        };
      }).filter(p => p.name);

      if (newRefs.length > 0) {
        setProductRefs(newRefs);
        setInputs(prev => ({ ...prev, referencia: newRefs[0].id }));
        alert(`¡Éxito! Se cargaron ${newRefs.length} referencias.`);
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar el Excel. Verifica las columnas (Referencia y Precio).');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const results = useMemo((): QuoteResults => {
    const product = productRefs.find(p => p.id === inputs.referencia) || productRefs[0];
    const costoBase = product.baseCost;
    
    // Logic: cm2 * 170
    const costoEstampado = (inputs.cmEstampado || 0) * COSTO_POR_CM2;
    const costoCorazon = (inputs.cmCorazon || 0) * COSTO_POR_CM2;
    
    // Logic: planchados * 1000
    const costoPlanchado = (inputs.qtyPlanchado || 0) * COSTO_PLANCHADO_UNITARIO;
    const costoEmpaque = COSTO_EMPAQUE;
    
    const costoTotal = costoBase + costoEstampado + costoCorazon + costoPlanchado + costoEmpaque;
    
    // Logic: Fixed $30,000 profit
    const ganancia = GANANCIA_FIJA;
    const precioSugerido = Math.round(costoTotal + ganancia);
    const margen = (ganancia / precioSugerido) * 100;

    return {
      costoBase,
      costoEstampado,
      costoCorazon,
      costoPlanchado,
      costoEmpaque,
      costoTotal,
      precioSugerido,
      ganancia,
      margen
    };
  }, [inputs, productRefs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs(prev => {
      const next = { ...prev, [name]: (name.includes('cm') || name.includes('qty')) ? Number(value) : value };
      if (name === 'categoria') {
        next.talla = value === 'Niño' ? TALLAS_NIÑO[3] : TALLAS_ADULTO[0];
      }
      return next;
    });
  };

  const generatePitch = async () => {
    setIsAiLoading(true);
    const product = productRefs.find(p => p.id === inputs.referencia)!;
    // Map internal structure to expected structure for Gemini service
    const legacyProduct = { ...product, baseCostNiño: product.baseCost, baseCostAdulto: product.baseCost };
    const advice = await getSalesAdvice(inputs, results, legacyProduct);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  const chartData = [
    { name: 'Base', value: results.costoBase, color: '#6366f1' },
    { name: 'Estampados', value: results.costoEstampado + results.costoCorazon, color: '#ec4899' },
    { name: 'Extras/Fijos', value: results.costoPlanchado + results.costoEmpaque, color: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <header className="bg-slate-900 border-b border-red-900/50 py-6 px-4 md:px-8 mb-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg rotate-3 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
              <Shirt size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white">FURIA <span className="text-red-600">ROCK</span> KIDS</h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Cotizador de Precisión v3.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/40 border border-indigo-400/20"
            >
              <FileUp size={18} />
              Cargar Base de Datos
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Column Left: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="text-red-500" />
              <h2 className="text-xl font-bold text-white">Configuración</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Referencia de Producto</label>
                <select 
                  name="referencia"
                  value={inputs.referencia}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 transition-all"
                >
                  {productRefs.map(ref => (
                    <option key={ref.id} value={ref.id}>{ref.name}</option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-indigo-400 font-bold">
                  Precio Base: ${results.costoBase.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Categoría</label>
                  <select 
                    name="categoria"
                    value={inputs.categoria}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Niño">Niño</option>
                    <option value="Adulto">Adulto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Talla</label>
                  <select 
                    name="talla"
                    value={inputs.talla}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                  >
                    {(inputs.categoria === 'Niño' ? TALLAS_NIÑO : TALLAS_ADULTO).map(talla => (
                      <option key={talla} value={talla}>{talla}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Cm² Principal ($170)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        name="cmEstampado"
                        value={inputs.cmEstampado}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-white focus:ring-2 focus:ring-red-500"
                      />
                      <Layers className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Cm² Corazón ($170)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        name="cmCorazon"
                        value={inputs.cmCorazon}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-white focus:ring-2 focus:ring-red-500"
                      />
                      <Sparkles className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Cantidad de Planchados ($1000/u)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      name="qtyPlanchado"
                      min="0"
                      value={inputs.qtyPlanchado}
                      onChange={handleInputChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-white focus:ring-2 focus:ring-red-500"
                    />
                    <Zap className="absolute left-3 top-3.5 text-slate-500" size={18} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Package size={18} className="text-blue-500" />
              Gastos de Procesamiento
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                <span className="text-slate-400 text-sm">Planchado ({inputs.qtyPlanchado}x)</span>
                <span className="text-white font-bold">${results.costoPlanchado.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                <span className="text-slate-400 text-sm">Empaque Fijo</span>
                <span className="text-white font-bold">${COSTO_EMPAQUE.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-green-500/10 p-4 rounded-xl border border-green-500/20 mt-4">
                <span className="text-green-400 text-sm font-black uppercase tracking-widest">Ganancia Asegurada</span>
                <span className="text-green-400 text-xl font-black">${GANANCIA_FIJA.toLocaleString()}</span>
              </div>
            </div>
            <div className="absolute top-[-20px] right-[-20px] opacity-10">
              <DollarSign size={120} className="text-green-500" />
            </div>
          </div>
        </div>

        {/* Column Right: Results & Charts */}
        <div className="lg:col-span-7 space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-900 rounded-[2.5rem] p-10 shadow-2xl shadow-red-900/30 ring-1 ring-white/10">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm mb-2">Precio de Venta Rockero</h3>
                <div className="flex items-baseline gap-3 justify-center md:justify-start">
                  <span className="text-7xl font-black text-white tracking-tighter drop-shadow-xl">
                    ${results.precioSugerido.toLocaleString()}
                  </span>
                  <span className="text-2xl text-white/70 font-bold uppercase">COP</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                  <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full text-white text-sm font-black border border-white/20 flex items-center gap-2">
                    <Flame size={18} className="text-orange-400" />
                    MARGEN: {results.margen.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="bg-black/30 p-8 rounded-[2rem] backdrop-blur-2xl border border-white/10 w-full md:w-72 shadow-2xl">
                <p className="text-white/60 text-xs font-black uppercase mb-4 tracking-widest">Resumen de Inversión</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Prenda Base:</span>
                    <span className="text-white font-bold">${results.costoBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Estampado:</span>
                    <span className="text-white font-bold">${(results.costoEstampado + results.costoCorazon).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Operativo:</span>
                    <span className="text-white font-bold">${(results.costoPlanchado + results.costoEmpaque).toLocaleString()}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-white/30 flex justify-between font-black text-xl text-white">
                    <span className="text-white/80 text-sm self-center">TOTAL:</span>
                    <span>${results.costoTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Rock className="absolute bottom-[-40px] left-[-40px] opacity-10 text-white" size={300} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl">
              <h4 className="text-white font-black uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
                <Layers size={18} className="text-indigo-500" />
                Desglose de Costos
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={50} outerRadius={75} paddingAngle={8} dataKey="value">
                      {chartData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl flex flex-col justify-center items-center text-center">
              <div className="bg-green-500/20 p-4 rounded-full mb-4">
                <TrendingUp size={32} className="text-green-500" />
              </div>
              <p className="text-slate-400 text-sm uppercase font-black tracking-[0.2em] mb-2">Utilidad por Prenda</p>
              <p className="text-5xl font-black text-green-400">${GANANCIA_FIJA.toLocaleString()}</p>
              <div className="mt-6 bg-slate-800/50 px-6 py-2 rounded-full border border-slate-700">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Ganancia Fija Configuradas</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 relative overflow-hidden group shadow-xl">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600/20 p-3 rounded-2xl">
                    <Sparkles className="text-indigo-500" size={28} />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase text-sm tracking-widest">Asistente de Ventas IA</h4>
                    <p className="text-xs text-slate-400">Argumento persuasivo para el cliente</p>
                  </div>
                </div>
                <button 
                  onClick={generatePitch}
                  disabled={isAiLoading}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl transition-all shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : 'Generar Pitch'}
                </button>
             </div>
             <div className="min-h-[120px] bg-slate-950/60 rounded-2xl p-8 border border-slate-800/50 relative z-10 text-slate-300 leading-relaxed font-medium italic">
                {aiAdvice ? `"${aiAdvice}"` : "Presiona el botón para recibir un discurso de ventas profesional basado en esta cotización."}
             </div>
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full"></div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 py-4 px-8 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <div className="flex gap-6">
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> TINTA: ${COSTO_POR_CM2}/cm²</span>
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> PLANCHADO: ${COSTO_PLANCHADO_UNITARIO}</span>
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> EMPAQUE: ${COSTO_EMPAQUE}</span>
          </div>
          <div className="text-indigo-400/80">FURIA ROCK KIDS • SISTEMA DE GESTIÓN PRO</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
