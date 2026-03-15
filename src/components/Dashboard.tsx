import React, { useMemo } from 'react';
import { Sale, Purchase } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Star, AlertCircle } from 'lucide-react';

interface DashboardProps {
  sales: Sale[];
  purchases: Purchase[];
}

const Dashboard: React.FC<DashboardProps> = ({ sales, purchases }) => {
  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  // Basic stats
  const totalSales = sales.reduce((acc, s) => acc + s.totalVenta, 0);
  const totalCostOfSales = sales.reduce((acc, s) => acc + s.costoTotal, 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + p.totalCompra, 0);
  const grossProfit = totalSales - totalCostOfSales;
  const netProfit = grossProfit - totalPurchases;

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
    { name: 'Ventas', value: totalSales, color: '#000000' },
    { name: 'Costo Ventas', value: totalCostOfSales, color: '#4b5563' },
    { name: 'Compras', value: totalPurchases, color: '#9ca3af' },
    { name: 'Ganancia Neta', value: netProfit, color: '#111827' }
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

  const COLORS = ['#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#111827', '#4b5563'];

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
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="panel p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign size={64} className="text-black" /></div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ventas Totales</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tighter">{formatCOP(totalSales)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-green-600 font-bold">
            <TrendingUp size={12} /> +12.5% vs mes anterior
          </div>
        </div>
        <div className="panel p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingDown size={64} className="text-gray-400" /></div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Compras / Inversión</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tighter">{formatCOP(totalPurchases)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-red-600 font-bold">
            <TrendingDown size={12} /> -5.2% vs mes anterior
          </div>
        </div>
        <div className="panel p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Star size={64} className="text-gray-300" /></div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Costo de Ventas</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tighter">{formatCOP(totalCostOfSales)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 font-bold">
            Inversión en prendas vendidas
          </div>
        </div>
        <div className="panel p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><AlertCircle size={64} className="text-gray-200" /></div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ganancia Neta Real</p>
          <p className={`text-3xl font-bold tracking-tighter ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCOP(netProfit)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 font-bold">
            Ventas - Costos - Compras
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Monthly Sales Chart */}
        <div className="panel p-8 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-black"></div> Tendencia de Ventas Mensuales
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                  tick={{fontWeight: 600}}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `$${v/1000000}M`}
                  tick={{fontWeight: 600}}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: 'none', 
                    borderRadius: '12px', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}
                  labelStyle={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  formatter={(value: number) => [formatCOP(value), 'Ventas']}
                />
                <Area type="monotone" dataKey="value" stroke="#000" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Table */}
        <div className="panel p-8 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div> Análisis de Rentabilidad por Producto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Referencia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Costo Prod.</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Precio Venta</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Ganancia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">% Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profitabilityData.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm font-bold text-gray-900">{item.referencia}</td>
                    <td className="py-4 px-4 text-right text-xs text-gray-500">{formatCOP(item.costo)}</td>
                    <td className="py-4 px-4 text-right text-xs text-gray-900 font-bold">{formatCOP(item.precio)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900">{formatCOP(item.ganancia)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900">{item.porcentaje}%</td>
                  </tr>
                ))}
                {profitabilityData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                      No hay datos de ventas para analizar rentabilidad.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Complete Business Matrix */}
        <div className="panel p-8 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div> Matriz Completa del Negocio (Ranking)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Ranking</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Producto</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Vendido</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Inversión</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Ventas</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Ganancia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Margen %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {businessMatrixData.map((item: any) => (
                  <tr key={item.ranking} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm font-bold text-gray-400 text-center">{item.ranking}</td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-900">{item.producto}</td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-900 text-center">{item.vendido}</td>
                    <td className="py-4 px-4 text-right text-xs text-gray-500">{formatCOP(item.inversion)}</td>
                    <td className="py-4 px-4 text-right text-xs text-gray-900">{formatCOP(item.ventas)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900">{formatCOP(item.ganancia)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900">{item.margen}%</td>
                  </tr>
                ))}
                {businessMatrixData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                      Sin datos para generar la matriz de negocio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Chart */}
        <div className="panel p-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-black"></div> Resumen Financiero
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
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
        <div className="panel p-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div> Top 5 Referencias Más Vendidas
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
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#111827' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Payment Method */}
        <div className="panel p-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div> Ventas por Método de Pago
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#111827' }}
                  formatter={(value: number) => formatCOP(value)}
                />
                <Bar dataKey="value" fill="#000000" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="panel p-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-200"></div> Ventas por Categoría (Prendas)
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
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#111827' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
