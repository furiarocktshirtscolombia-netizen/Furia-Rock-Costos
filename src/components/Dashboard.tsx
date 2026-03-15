import React from 'react';
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
  const totalPurchases = purchases.reduce((acc, p) => acc + p.totalCompra, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.ganancia, 0);
  const netUtility = totalSales - totalPurchases;

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
    { name: 'Ventas', value: totalSales, color: '#34FF4A' },
    { name: 'Compras', value: totalPurchases, color: '#FF4FD8' },
    { name: 'Ganancia Bruta', value: totalProfit, color: '#36E6FF' }
  ];

  const COLORS = ['#34FF4A', '#FF4FD8', '#36E6FF', '#FFD23F', '#A855F7'];

  return (
    <div className="space-y-10">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} className="text-neon-green" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Ventas Totales</p>
          <p className="text-3xl font-black text-white tracking-tighter">{formatCOP(totalSales)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-neon-green font-bold">
            <TrendingUp size={12} /> +12.5% vs mes anterior
          </div>
        </div>
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown size={64} className="text-hot-pink" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Compras / Inversión</p>
          <p className="text-3xl font-black text-white tracking-tighter">{formatCOP(totalPurchases)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-hot-pink font-bold">
            <TrendingDown size={12} /> -5.2% vs mes anterior
          </div>
        </div>
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Star size={64} className="text-aqua" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Ganancia Proyectada</p>
          <p className="text-3xl font-black text-white tracking-tighter">{formatCOP(totalProfit)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-aqua font-bold">
            <TrendingUp size={12} /> Margen prom. 35%
          </div>
        </div>
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle size={64} className="text-sun" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Utilidad Neta</p>
          <p className={`text-3xl font-black tracking-tighter ${netUtility >= 0 ? 'text-white' : 'text-red-500'}`}>
            {formatCOP(netUtility)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-bold">
            Balance General
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Financial Chart */}
        <div className="card p-8">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-neon-green"></div> Resumen Financiero
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
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
        <div className="card p-8">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-aqua"></div> Top 5 Referencias Más Vendidas
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
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
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
