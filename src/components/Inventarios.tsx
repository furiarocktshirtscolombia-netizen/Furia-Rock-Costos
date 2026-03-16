import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import { Package, TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';

interface InventariosProps {
  inventory: InventoryItem[];
}

const Inventarios: React.FC<InventariosProps> = ({ inventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTalla, setFilterTalla] = useState('Todas');
  const [filterColor, setFilterColor] = useState('Todos');
  const [filterStock, setFilterStock] = useState('Todos');

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const tallas = ['Todas', ...Array.from(new Set(inventory.map(i => i.talla)))];
  const colores = ['Todos', ...Array.from(new Set(inventory.map(i => i.color)))];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.referencia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTalla = filterTalla === 'Todas' || item.talla === filterTalla;
    const matchesColor = filterColor === 'Todos' || item.color === filterColor;
    const matchesStock = filterStock === 'Todos' || 
      (filterStock === 'Bajo' && item.stockActual <= 5 && item.stockActual > 2) ||
      (filterStock === 'Crítico' && item.stockActual <= 2) ||
      (filterStock === 'Suficiente' && item.stockActual > 5);
    
    return matchesSearch && matchesTalla && matchesColor && matchesStock;
  });

  // Summary stats
  const totalVariants = inventory.length;
  const totalUnits = inventory.reduce((acc, item) => acc + item.stockActual, 0);
  const totalValue = inventory.reduce((acc, item) => acc + item.valorTotalInventario, 0);
  const lowStockItems = inventory.filter(item => item.stockActual <= 5);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Inventario Detallado por Variante</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Package size={48} className="text-[#ff7a00]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Total Variantes</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{totalVariants}</p>
        </div>
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} className="text-[#4ade80]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Unidades Disponibles</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{totalUnits}</p>
        </div>
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={48} className="text-[#ff7a00]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Valor Total Inventario</p>
          <p className="text-2xl font-bold text-[#ff7a00] tracking-tighter">{formatCOP(totalValue)}</p>
        </div>
        <div className="panel p-8 relative overflow-hidden bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle size={48} className="text-[#ef4444]" /></div>
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-2">Variantes Bajo Stock</p>
          <p className="text-2xl font-bold text-[#ef4444] tracking-tighter">{lowStockItems.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="panel p-6 bg-[#1a1d24] border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f97a6]" size={16} />
          <input 
            type="text" 
            placeholder="Buscar referencia..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
          />
        </div>
        <select 
          value={filterTalla}
          onChange={e => setFilterTalla(e.target.value)}
          className="bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
        >
          {tallas.map(t => <option key={t} value={t}>{t === 'Todas' ? 'Todas las tallas' : `Talla ${t}`}</option>)}
        </select>
        <select 
          value={filterColor}
          onChange={e => setFilterColor(e.target.value)}
          className="bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
        >
          {colores.map(c => <option key={c} value={c}>{c === 'Todos' ? 'Todos los colores' : c}</option>)}
        </select>
        <select 
          value={filterStock}
          onChange={e => setFilterStock(e.target.value)}
          className="bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Suficiente">Stock Suficiente</option>
          <option value="Bajo">Stock Bajo (≤ 5)</option>
          <option value="Crítico">Stock Crítico (≤ 2)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Inventory Table */}
        <div className="panel p-8 lg:col-span-2 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Stock Detallado por Variante
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Referencia</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Producto</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Variante</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Comprado</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Vendido</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Stock</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Costo Prom.</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInventory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <p className="text-sm font-bold text-white">{item.referencia}</p>
                      <p className="text-[10px] text-[#8f97a6] uppercase font-bold tracking-wider">{item.categoria}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs text-[#b9c0cc]">{item.producto}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <span className="bg-white/5 px-2 py-1 rounded border border-white/10 text-[10px] font-bold text-[#b9c0cc]">{item.talla}</span>
                        <span className="bg-white/5 px-2 py-1 rounded border border-white/10 text-[10px] font-bold text-[#b9c0cc]">{item.color}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-center text-[#b9c0cc]">{item.cantidadComprada}</td>
                    <td className="py-4 px-4 text-sm text-center text-[#b9c0cc]">{item.cantidadVendida}</td>
                    <td className={`py-4 px-4 text-sm font-bold text-center ${item.stockActual <= 2 ? 'text-[#ef4444]' : item.stockActual <= 5 ? 'text-[#ff7a00]' : 'text-[#4ade80]'}`}>
                      {item.stockActual}
                    </td>
                    <td className="py-4 px-4 text-right text-xs text-[#b9c0cc]">{formatCOP(item.costoPromedioCompra)}</td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-white">{formatCOP(item.valorTotalInventario)}</td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#8f97a6] text-[10px] font-bold uppercase tracking-widest">
                      No se encontraron variantes con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="panel p-8 bg-[#1a1d24] border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div> Alertas de Reposición
          </h3>
          <div className="space-y-4">
            {lowStockItems.length > 0 ? (
              lowStockItems.sort((a,b) => a.stockActual - b.stockActual).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">{item.referencia}</p>
                    <p className="text-[10px] text-[#8f97a6] uppercase font-bold tracking-wider">{item.talla} - {item.color}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${item.stockActual <= 2 ? 'text-[#ef4444]' : 'text-[#ff7a00]'}`}>
                      {item.stockActual}
                    </p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${item.stockActual <= 2 ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#ff7a00]/10 text-[#ff7a00]'}`}>
                      {item.stockActual <= 2 ? 'Crítico' : 'Bajo'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <CheckCircle2 className="mx-auto text-[#4ade80] mb-4" size={32} />
                <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Todo en orden. Stock suficiente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventarios;
