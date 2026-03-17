import React, { useMemo } from 'react';
import { Sale, Purchase, InventoryItem, Client } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Star, AlertCircle, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  sales: Sale[];
  purchases: Purchase[];
  inventory: InventoryItem[];
  clients: Client[];
  onExportExcel: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sales, purchases, inventory, clients, onExportExcel }) => {
  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().substring(0, 7);

  // Daily/Monthly stats
  const salesToday = sales.filter(s => s.fecha === today).reduce((acc, s) => acc + s.totalVenta, 0);
  const salesThisMonth = sales.filter(s => s.fecha.startsWith(currentMonth)).reduce((acc, s) => acc + s.totalVenta, 0);
  const purchasesThisMonth = purchases.filter(p => p.fecha.startsWith(currentMonth)).reduce((acc, p) => acc + p.totalCompra, 0);
  const costOfSalesThisMonth = sales.filter(s => s.fecha.startsWith(currentMonth)).reduce((acc, s) => acc + s.costoTotal, 0);
  const profitThisMonth = (salesThisMonth - costOfSalesThisMonth) - purchasesThisMonth;

  // Basic stats
  const totalSales = sales.reduce((acc, s) => acc + s.totalVenta, 0);
  const totalCostOfSales = sales.reduce((acc, s) => acc + s.costoTotal, 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + p.totalCompra, 0);
  const grossProfit = totalSales - totalCostOfSales;
  const netProfit = grossProfit - totalPurchases;

  // Inventory stats
  const totalInventoryValue = inventory.reduce((acc, item) => acc + item.valorTotalInventario, 0);
  const totalUnitsAvailable = inventory.reduce((acc, item) => acc + item.stockActual, 0);
  const totalVariants = inventory.length;
  const totalRefs = new Set(inventory.map(i => i.referencia)).size;
  const lowStockVariants = inventory.filter(item => item.stockActual <= 5 && item.stockActual > 2).length;
  const criticalStockVariants = inventory.filter(item => item.stockActual <= 2).length;

  // Top variants sold
  const salesByVariant = sales.reduce((acc: any, s) => {
    const key = `${s.referencia} (${s.talla} - ${s.colorCamiseta})`;
    acc[key] = (acc[key] || 0) + s.cantidad;
    return acc;
  }, {});
  const topVariantsData = Object.entries(salesByVariant)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Variants with lowest stock
  const lowestStockVariants = [...inventory]
    .sort((a, b) => a.stockActual - b.stockActual)
    .slice(0, 5);

  // Sales by reference
  const salesByRef = sales.reduce((acc: any, s) => {
    acc[s.referencia] = (acc[s.referencia] || 0) + s.cantidad;
    return acc;
  }, {});
  const topRefsData = Object.entries(salesByRef)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Financial summary data
  const financialData = [
    { name: 'Ventas', value: totalSales, color: '#ff7a00' },
    { name: 'Costo Ventas', value: totalCostOfSales, color: '#b9c0cc' },
    { name: 'Compras', value: totalPurchases, color: '#8f97a6' },
    { name: 'Ganancia Neta', value: netProfit, color: '#4ade80' }
  ];

  // Sales by payment method
  const salesByPayment = sales.reduce((acc: any, s) => {
    acc[s.metodoPago] = (acc[s.metodoPago] || 0) + s.totalVenta;
    return acc;
  }, {});
  const paymentData = Object.entries(salesByPayment).map(([name, value]) => ({ name, value: value as number }));

  // Sales by category
  const salesByCategory = sales.reduce((acc: any, s) => {
    acc[s.categoria] = (acc[s.categoria] || 0) + s.cantidad;
    return acc;
  }, {});
  const categoryData = Object.entries(salesByCategory).map(([name, value]) => ({ name, value: value as number }));

  // Sales by month
  const salesByMonth = sales.reduce((acc: any, s) => {
    const month = s.fecha.substring(0, 7); // YYYY-MM
    acc[month] = (acc[month] || 0) + s.totalVenta;
    return acc;
  }, {});
  const monthlyData = Object.entries(salesByMonth)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Top 5 clients
  const salesByClient = sales.reduce((acc: any, s) => {
    acc[s.cliente] = (acc[s.cliente] || 0) + s.totalVenta;
    return acc;
  }, {});
  const topClientsData = Object.entries(salesByClient)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#ff7a00', '#ff8f26', '#d96500', '#b9c0cc', '#8f97a6', '#4ade80', '#ef4444'];

  // Profitability Analysis by Product
  const profitabilityData = useMemo(() => {
    const result: any = {};
    sales.forEach(v => {
      if (!result[v.referencia]) {
        const costoUnit = Number(v.costoUnitario || 0);
        const precioUnit = Number(v.precioVentaUnitario || 0);
        const ganancia = precioUnit - costoUnit;
        const porcentaje = costoUnit > 0 ? ((ganancia / costoUnit) * 100).toFixed(1) : "0";

        result[v.referencia] = {
          referencia: v.referencia,
          costo: costoUnit,
          precio: precioUnit,
          ganancia: ganancia,
          porcentaje: porcentaje
        };
      }
    });
    return Object.values(result);
  }, [sales]);

  // Complete Business Matrix
  const businessMatrixData = useMemo(() => {
    const mapa: any = {};

    sales.forEach(v => {
      const ref = v.referencia || "Sin referencia";

      if (!mapa[ref]) {
        mapa[ref] = {
          producto: ref,
          vendido: 0,
          inversion: 0,
          ventas: 0,
          ganancia: 0
        };
      }

      const cantidad = Number(v.cantidad || 0);
      const totalVenta = Number(v.totalVenta || 0);
      const costoTotal = Number(v.costoTotal || 0);
      const ganancia = Number(v.ganancia || 0);

      mapa[ref].vendido += cantidad;
      mapa[ref].inversion += costoTotal;
      mapa[ref].ventas += totalVenta;
      mapa[ref].ganancia += ganancia;
    });

    const data = Object.values(mapa).map((item: any) => {
      const margen = item.ventas > 0
        ? ((item.ganancia / item.ventas) * 100).toFixed(2)
        : 0;

      return {
        ...item,
        margen: Number(margen)
      };
    });

    // Ordenar por ganancia de mayor a menor
    data.sort((a: any, b: any) => b.ganancia - a.ganancia);

    // Asignar ranking
    return data.map((item: any, index: number) => ({
      ranking: index + 1,
      ...item
    }));
  }, [sales]);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Dashboard de Negocio</h2>
        <button 
          onClick={onExportExcel}
          className="bg-[#ff7a00] hover:bg-[#ff8f26] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all shadow-lg shadow-[#ff7a00]/20 active:scale-95"
        >
          <TrendingUp size={16} /> DESCARGAR EXCEL COMPLETO
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={48} className="text-[#ff7a00]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Ventas Hoy</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{formatCOP(salesToday)}</p>
        </div>
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} className="text-[#ff7a00]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Ventas Mes</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{formatCOP(salesThisMonth)}</p>
        </div>
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown size={48} className="text-[#8f97a6]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Compras Mes</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{formatCOP(purchasesThisMonth)}</p>
        </div>
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} className="text-[#4ade80]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Ganancia Mes</p>
          <p className="text-2xl font-bold text-[#4ade80] tracking-tighter">{formatCOP(profitThisMonth)}</p>
        </div>
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Package size={48} className="text-[#ff7a00]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Valor Inventario</p>
          <p className="text-2xl font-bold text-[#ff7a00] tracking-tighter">{formatCOP(totalInventoryValue)}</p>
        </div>
      </div>

      {/* Inventory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="panel p-6 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-[#ff7a00]/10">
          <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Total Refs</p>
          <p className="text-xl font-bold text-white tracking-tighter">{totalRefs}</p>
        </div>
        <div className="panel p-6 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-[#ff7a00]/10">
          <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Total Variantes</p>
          <p className="text-xl font-bold text-white tracking-tighter">{totalVariants}</p>
        </div>
        <div className="panel p-6 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-[#4ade80]/10">
          <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Unidades Disponibles</p>
          <p className="text-xl font-bold text-white tracking-tighter">{totalUnitsAvailable}</p>
        </div>
        <div className="panel p-6 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-[#ff7a00]/10">
          <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Valor Inventario</p>
          <p className="text-xl font-bold text-[#ff7a00] tracking-tighter">{formatCOP(totalInventoryValue)}</p>
        </div>
        <div className="panel p-6 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-[#ff7a00]/10">
          <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Stock Bajo</p>
          <p className="text-xl font-bold text-[#ff7a00] tracking-tighter">{lowStockVariants}</p>
        </div>
        <div className="panel p-6 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-[#ef4444]/10">
          <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Stock Crítico</p>
          <p className="text-xl font-bold text-[#ef4444] tracking-tighter">{criticalStockVariants}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Top Variants Table */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Top 5 Variantes Más Vendidas
          </h3>
          <div className="space-y-4">
            {topVariantsData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs font-bold text-[#b9c0cc]">{item.name}</p>
                <p className="text-sm font-bold text-[#ff7a00]">{item.value} unds</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lowest Stock Variants Table */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div> Top 5 Variantes con Menor Stock
          </h3>
          <div className="space-y-4">
            {lowestStockVariants.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-bold text-[#b9c0cc]">{item.referencia}</p>
                  <p className="text-[9px] text-[#8f97a6] uppercase font-bold tracking-wider">{item.talla} - {item.color}</p>
                </div>
                <p className={`text-sm font-bold ${item.stockActual <= 2 ? 'text-[#ef4444]' : 'text-[#ff7a00]'}`}>{item.stockActual} unds</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients Table */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#4ade80]"></div> Top 5 Clientes
          </h3>
          <div className="space-y-4">
            {topClientsData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs font-bold text-[#b9c0cc]">{item.name}</p>
                <p className="text-sm font-bold text-[#4ade80]">{formatCOP(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Monthly Sales Chart */}
        <div className="panel p-8 lg:col-span-2 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Tendencia de Ventas Mensuales
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff7a00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#8f97a6" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                  tick={{fontWeight: 600}}
                />
                <YAxis 
                  stroke="#8f97a6" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `$${v/1000000}M`}
                  tick={{fontWeight: 600}}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#121317', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}
                  labelStyle={{ color: '#8f97a6', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  formatter={(value: number) => [formatCOP(value), 'Ventas']}
                />
                <Area type="monotone" dataKey="value" stroke="#ff7a00" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Table */}
        <div className="panel p-8 lg:col-span-2 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Análisis de Rentabilidad por Producto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Referencia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Costo Prod.</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Precio Venta</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Ganancia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">% Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {profitabilityData.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-sm font-bold text-white">{item.referencia}</td>
                    <td className="py-4 px-4 text-right text-xs text-[#b9c0cc]">{formatCOP(item.costo)}</td>
                    <td className="py-4 px-4 text-right text-xs text-white font-bold">{formatCOP(item.precio)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-[#4ade80]">{formatCOP(item.ganancia)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-[#ff7a00]">{item.porcentaje}%</td>
                  </tr>
                ))}
                {profitabilityData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#8f97a6] text-[10px] font-bold uppercase tracking-widest">
                      No hay datos de ventas para analizar rentabilidad.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Complete Business Matrix */}
        <div className="panel p-8 lg:col-span-2 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Matriz Completa del Negocio (Ranking)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Ranking</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Producto</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Vendido</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Inversión</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Ventas</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Ganancia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Margen %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {businessMatrixData.map((item: any) => (
                  <tr key={item.ranking} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-sm font-bold text-[#8f97a6] text-center">{item.ranking}</td>
                    <td className="py-4 px-4 text-sm font-bold text-white">{item.producto}</td>
                    <td className="py-4 px-4 text-sm font-bold text-white text-center">{item.vendido}</td>
                    <td className="py-4 px-4 text-right text-xs text-[#b9c0cc]">{formatCOP(item.inversion)}</td>
                    <td className="py-4 px-4 text-right text-xs text-white">{formatCOP(item.ventas)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-[#4ade80]">{formatCOP(item.ganancia)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-[#ff7a00]">{item.margen}%</td>
                  </tr>
                ))}
                {businessMatrixData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#8f97a6] text-[10px] font-bold uppercase tracking-widest">
                      Sin datos para generar la matriz de negocio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Chart */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Resumen Financiero
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#8f97a6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8f97a6" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  formatter={(value: number) => formatCOP(value)}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {financialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Top 5 Referencias Más Vendidas
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topRefsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topRefsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px', color: '#8f97a6' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Payment Method */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Ventas por Método de Pago
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#8f97a6" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#8f97a6" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  formatter={(value: number) => formatCOP(value)}
                />
                <Bar dataKey="value" fill="#ff7a00" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Ventas por Categoría (Prendas)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px', color: '#8f97a6' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
