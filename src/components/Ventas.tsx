import React, { useState } from 'react';
import { Sale } from '../../types';
import { Trash2, Search, Filter, Download, Plus } from 'lucide-react';
import { ESTADOS_VENTA } from '../../constants';

interface VentasProps {
  sales: Sale[];
  onDeleteSale: (id: string) => void;
  onUpdateSaleStatus: (id: string, status: Sale['estado']) => void;
}

const Ventas: React.FC<VentasProps> = ({ sales, onDeleteSale, onUpdateSaleStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         sale.referencia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || sale.estado === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const stats = {
    totalVendido: filteredSales.reduce((acc, s) => acc + s.totalVenta, 0),
    totalGanancia: filteredSales.reduce((acc, s) => acc + s.ganancia, 0),
    cantidad: filteredSales.reduce((acc, s) => acc + s.cantidad, 0),
    pendientes: filteredSales.filter(s => s.estado === 'Pendiente').length
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6 border-l-4 border-l-neon-green">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Vendido</p>
          <p className="text-2xl font-black text-white">{formatCOP(stats.totalVendido)}</p>
        </div>
        <div className="card p-6 border-l-4 border-l-hot-pink">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Ganancia Total</p>
          <p className="text-2xl font-black text-white">{formatCOP(stats.totalGanancia)}</p>
        </div>
        <div className="card p-6 border-l-4 border-l-aqua">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Prendas Vendidas</p>
          <p className="text-2xl font-black text-white">{stats.cantidad}</p>
        </div>
        <div className="card p-6 border-l-4 border-l-sun">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pendientes</p>
          <p className="text-2xl font-black text-white">{stats.pendientes}</p>
        </div>
      </div>

      <div className="card p-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar cliente o ref..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 text-sm"
            >
              <option value="Todos">Todos los estados</option>
              {ESTADOS_VENTA.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button className="bg-white text-black font-black px-6 py-3 rounded-xl text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-neon-green transition-all">
            <Download size={14} /> Exportar Reporte
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Referencia</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Total</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-4 text-xs font-medium text-slate-400">{sale.fecha}</td>
                  <td className="py-4 px-4 text-sm font-black text-white">{sale.cliente}</td>
                  <td className="py-4 px-4">
                    <div className="text-xs font-bold text-white">{sale.referencia}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{sale.talla} • {sale.colorCamiseta}</div>
                  </td>
                  <td className="py-4 px-4 text-center font-black text-aqua">x{sale.cantidad}</td>
                  <td className="py-4 px-4 text-right font-black text-white">{formatCOP(sale.totalVenta)}</td>
                  <td className="py-4 px-4 text-center">
                    <select 
                      value={sale.estado}
                      onChange={(e) => onUpdateSaleStatus(sale.id, e.target.value as any)}
                      className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border-none cursor-pointer ${
                        sale.estado === 'Pagado' ? 'bg-neon-green/20 text-neon-green' : 
                        sale.estado === 'Pendiente' ? 'bg-sun/20 text-sun' : 'bg-aqua/20 text-aqua'
                      }`}
                    >
                      {ESTADOS_VENTA.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      onClick={() => onDeleteSale(sale.id)}
                      className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-[11px]">
                    No se encontraron ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ventas;
