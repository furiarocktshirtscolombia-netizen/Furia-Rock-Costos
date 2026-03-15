import React, { useState } from 'react';
import { Sale } from '../../types';
import { Trash2, Search, Filter, Download, Plus } from 'lucide-react';
import { ESTADOS_VENTA, METODOS_PAGO } from '../../constants';

interface VentasProps {
  sales: Sale[];
  onAddSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onUpdateSaleStatus: (id: string, status: Sale['estado']) => void;
}

const Ventas: React.FC<VentasProps> = ({ sales, onAddSale, onDeleteSale, onUpdateSaleStatus }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [newSale, setNewSale] = useState({
    cliente: '',
    fecha: new Date().toISOString().split('T')[0],
    referencia: '',
    talla: '',
    colorCamiseta: '',
    colorInferior: '',
    cantidad: 1,
    precioVentaUnitario: 0,
    costoUnitario: 0,
    metodoPago: METODOS_PAGO[0],
    estado: 'Pendiente' as Sale['estado'],
    observaciones: ''
  });

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sale: Sale = {
      id: Date.now() + Math.random(),
      ...newSale,
      categoria: 'Niño', // Default or derived
      totalVenta: newSale.cantidad * newSale.precioVentaUnitario,
      costoTotal: newSale.cantidad * newSale.costoUnitario,
      ganancia: (newSale.precioVentaUnitario - newSale.costoUnitario) * newSale.cantidad
    };
    onAddSale(sale);
    setNewSale({
      cliente: '',
      fecha: new Date().toISOString().split('T')[0],
      referencia: '',
      talla: '',
      colorCamiseta: '',
      colorInferior: '',
      cantidad: 1,
      precioVentaUnitario: 0,
      costoUnitario: 0,
      metodoPago: METODOS_PAGO[0],
      estado: 'Pendiente',
      observaciones: ''
    });
    setShowForm(false);
  };

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

  const exportToCSV = () => {
    if (sales.length === 0) return;
    const headers = ["Fecha", "Cliente", "Referencia", "Talla", "Color Sup", "Color Inf", "Cantidad", "Total Venta", "Ganancia", "Método Pago", "Estado"];
    const rows = sales.map(s => [
      s.fecha,
      s.cliente,
      s.referencia,
      s.talla,
      s.colorCamiseta,
      s.colorInferior,
      s.cantidad,
      s.totalVenta,
      s.ganancia,
      s.metodoPago,
      s.estado
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Ventas_FuriaRock_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="panel p-6 border-l-4 border-l-black">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Vendido</p>
          <p className="text-2xl font-bold text-gray-900">{formatCOP(stats.totalVendido)}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-gray-400">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ganancia Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCOP(stats.totalGanancia)}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-gray-200">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Prendas Vendidas</p>
          <p className="text-2xl font-bold text-gray-900">{stats.cantidad}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-gray-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.pendientes}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-8 py-4 rounded-xl flex items-center gap-3 text-[11px] font-bold tracking-widest hover:bg-gray-800 transition-all active:scale-95"
        >
          {showForm ? 'CANCELAR' : <><Plus size={18} /> REGISTRAR VENTA MANUAL</>}
        </button>
      </div>

      {showForm && (
        <section className="panel p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">Nueva Venta</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Cliente</label>
              <input required type="text" value={newSale.cliente} onChange={e => setNewSale({...newSale, cliente: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" placeholder="Nombre del cliente..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Fecha</label>
              <input required type="date" value={newSale.fecha} onChange={e => setNewSale({...newSale, fecha: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Referencia</label>
              <input required type="text" value={newSale.referencia} onChange={e => setNewSale({...newSale, referencia: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" placeholder="Referencia del producto..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Talla</label>
              <input required type="text" value={newSale.talla} onChange={e => setNewSale({...newSale, talla: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" placeholder="Talla..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Color Superior</label>
              <input required type="text" value={newSale.colorCamiseta} onChange={e => setNewSale({...newSale, colorCamiseta: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" placeholder="Color camiseta..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Color Inferior</label>
              <input type="text" value={newSale.colorInferior} onChange={e => setNewSale({...newSale, colorInferior: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" placeholder="Color bermuda / No aplica..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Cantidad</label>
              <input required type="number" min="1" value={newSale.cantidad} onChange={e => setNewSale({...newSale, cantidad: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Precio Venta Unitario</label>
              <input required type="number" min="0" value={newSale.precioVentaUnitario} onChange={e => setNewSale({...newSale, precioVentaUnitario: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Costo Unitario</label>
              <input required type="number" min="0" value={newSale.costoUnitario} onChange={e => setNewSale({...newSale, costoUnitario: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Método de Pago</label>
              <select value={newSale.metodoPago} onChange={e => setNewSale({...newSale, metodoPago: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none">
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Estado</label>
              <select value={newSale.estado} onChange={e => setNewSale({...newSale, estado: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none">
                {ESTADOS_VENTA.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Observaciones</label>
              <textarea value={newSale.observaciones} onChange={e => setNewSale({...newSale, observaciones: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm font-medium min-h-[80px] resize-none focus:ring-2 focus:ring-black outline-none" placeholder="Detalles adicionales..." />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="bg-black text-white px-12 py-4 rounded-xl text-[11px] font-bold tracking-widest hover:bg-gray-800 transition-all active:scale-95">GUARDAR VENTA</button>
            </div>
          </form>
        </section>
      )}

      <div className="panel p-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar cliente o ref..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none"
            >
              <option value="Todos">Todos los estados</option>
              {ESTADOS_VENTA.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button 
            onClick={exportToCSV}
            className="bg-gray-100 text-gray-900 font-bold px-6 py-3 rounded-xl text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
          >
            <Download size={14} /> Exportar Reporte
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cliente</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Referencia</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Talla</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Color Sup.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Color Inf.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Cant.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Total Venta</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Ganancia</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Estado</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-4 text-xs font-medium text-gray-500 whitespace-nowrap">{sale.fecha}</td>
                  <td className="py-4 px-4 text-sm font-bold text-gray-900">{sale.cliente}</td>
                  <td className="py-4 px-4 text-xs font-bold text-gray-700">{sale.referencia}</td>
                  <td className="py-4 px-4 text-xs text-gray-600">{sale.talla}</td>
                  <td className="py-4 px-4 text-xs text-gray-600">{sale.colorCamiseta}</td>
                  <td className="py-4 px-4 text-xs text-gray-600">{sale.colorInferior}</td>
                  <td className="py-4 px-4 text-center font-bold text-black">x{sale.cantidad}</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCOP(sale.totalVenta)}</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCOP(sale.ganancia)}</td>
                  <td className="py-4 px-4 text-center">
                    <select 
                      value={sale.estado}
                      onChange={(e) => onUpdateSaleStatus(sale.id, e.target.value as any)}
                      className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border-none cursor-pointer transition-all ${
                        sale.estado === 'Pagado' ? 'bg-green-100 text-green-700' : 
                        sale.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {ESTADOS_VENTA.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      onClick={() => onDeleteSale(sale.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[11px]">
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
