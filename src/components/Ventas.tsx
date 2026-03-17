import React, { useState } from 'react';
import { Sale, Category } from '../../types';
import { Trash2, Search, Download, Plus } from 'lucide-react';
import { ESTADOS_VENTA, METODOS_PAGO, CATEGORIAS } from '../../constants';

interface VentasProps {
  sales: Sale[];
  onAddSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onUpdateSaleStatus: (id: string, status: Sale['estado']) => void;
  onDownloadInvoice: (sale: Sale) => void;
}

const Ventas: React.FC<VentasProps> = ({ sales, onAddSale, onDeleteSale, onUpdateSaleStatus, onDownloadInvoice }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [newSale, setNewSale] = useState({
    cliente: '',
    fecha: new Date().toISOString().split('T')[0],
    referencia: '',
    categoria: 'Niño' as Category,
    talla: '',
    colorCamiseta: '',
    colorInferior: '',
    gramaje: '200g',
    diseno: '',
    tipoImpresion: 'DTG',
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
      totalVenta: newSale.cantidad * newSale.precioVentaUnitario,
      costoTotal: newSale.cantidad * newSale.costoUnitario,
      ganancia: (newSale.precioVentaUnitario - newSale.costoUnitario) * newSale.cantidad
    };
    onAddSale(sale);
    setNewSale({
      cliente: '',
      fecha: new Date().toISOString().split('T')[0],
      referencia: '',
      categoria: 'Niño',
      talla: '',
      colorCamiseta: '',
      colorInferior: '',
      gramaje: '200g',
      diseno: '',
      tipoImpresion: 'DTG',
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
    const headers = ["Fecha", "Cliente", "Referencia", "Categoría", "Talla", "Color Sup", "Color Inf", "Cantidad", "Total Venta", "Ganancia", "Método Pago", "Estado"];
    const rows = sales.map(s => [
      s.fecha,
      s.cliente,
      s.referencia,
      s.categoria,
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
        <div className="panel p-6 border-l-4 border-l-[#ff7a00] bg-gradient-to-br from-[#1a1d24] to-[#121317]">
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Total Vendido</p>
          <p className="text-2xl font-bold text-white">{formatCOP(stats.totalVendido)}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-[#4ade80] bg-gradient-to-br from-[#1a1d24] to-[#121317]">
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Ganancia Total</p>
          <p className="text-2xl font-bold text-[#4ade80]">{formatCOP(stats.totalGanancia)}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-[#b9c0cc] bg-gradient-to-br from-[#1a1d24] to-[#121317]">
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Prendas Vendidas</p>
          <p className="text-2xl font-bold text-white">{stats.cantidad}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-[#ff7a00] opacity-80 bg-gradient-to-br from-[#1a1d24] to-[#121317]">
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-white">{stats.pendientes}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#ff7a00] text-white px-8 py-4 rounded-xl flex items-center gap-3 text-[11px] font-bold tracking-widest hover:bg-[#ff8f26] transition-all active:scale-95 shadow-lg"
        >
          {showForm ? 'CANCELAR' : <><Plus size={18} /> REGISTRAR VENTA MANUAL</>}
        </button>
      </div>

      {showForm && (
        <section className="panel p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4 text-white">Nueva Venta</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Cliente</label>
              <input required type="text" value={newSale.cliente} onChange={e => setNewSale({...newSale, cliente: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Nombre del cliente..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Fecha</label>
              <input required type="date" value={newSale.fecha} onChange={e => setNewSale({...newSale, fecha: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Referencia</label>
              <input required type="text" value={newSale.referencia} onChange={e => setNewSale({...newSale, referencia: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Referencia del producto..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Categoría</label>
              <select value={newSale.categoria} onChange={e => setNewSale({...newSale, categoria: e.target.value as Category})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Talla</label>
              <input required type="text" value={newSale.talla} onChange={e => setNewSale({...newSale, talla: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Talla..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Color Superior</label>
              <input required type="text" value={newSale.colorCamiseta} onChange={e => setNewSale({...newSale, colorCamiseta: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Color camiseta..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Color Inferior</label>
              <input type="text" value={newSale.colorInferior} onChange={e => setNewSale({...newSale, colorInferior: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Color bermuda / No aplica..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Gramaje</label>
              <input type="text" value={newSale.gramaje} onChange={e => setNewSale({...newSale, gramaje: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Ej: 200g..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Diseño</label>
              <input type="text" value={newSale.diseno} onChange={e => setNewSale({...newSale, diseno: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Ej: Rosa..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Tipo Impresión</label>
              <input type="text" value={newSale.tipoImpresion} onChange={e => setNewSale({...newSale, tipoImpresion: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Ej: DTG..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Cantidad</label>
              <input required type="number" min="1" value={newSale.cantidad} onChange={e => setNewSale({...newSale, cantidad: Number(e.target.value)})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Precio Venta Unitario</label>
              <input required type="number" min="0" value={newSale.precioVentaUnitario} onChange={e => setNewSale({...newSale, precioVentaUnitario: Number(e.target.value)})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Costo Unitario</label>
              <input required type="number" min="0" value={newSale.costoUnitario} onChange={e => setNewSale({...newSale, costoUnitario: Number(e.target.value)})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Método de Pago</label>
              <select value={newSale.metodoPago} onChange={e => setNewSale({...newSale, metodoPago: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none">
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Estado</label>
              <select value={newSale.estado} onChange={e => setNewSale({...newSale, estado: e.target.value as any})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none">
                {ESTADOS_VENTA.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Observaciones</label>
              <textarea value={newSale.observaciones} onChange={e => setNewSale({...newSale, observaciones: e.target.value})} className="w-full bg-[#121317] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-medium min-h-[80px] resize-none focus:ring-2 focus:ring-[#ff7a00] outline-none" placeholder="Detalles adicionales..." />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="bg-[#ff7a00] text-white px-12 py-4 rounded-xl text-[11px] font-bold tracking-widest hover:bg-[#ff8f26] transition-all active:scale-95 shadow-lg">GUARDAR VENTA</button>
            </div>
          </form>
        </section>
      )}

      <div className="panel p-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f97a6]" size={16} />
              <input 
                type="text" 
                placeholder="Buscar cliente o ref..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#121317] border border-white/5 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7a00] outline-none"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-[#121317] border border-white/5 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7a00] outline-none"
            >
              <option value="Todos">Todos los estados</option>
              {ESTADOS_VENTA.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button 
            onClick={exportToCSV}
            className="bg-[#1a1d24] text-[#b9c0cc] font-bold px-6 py-3 rounded-xl text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-[#20242d] transition-all active:scale-95 border border-white/5"
          >
            <Download size={14} /> Exportar Reporte
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Factura</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Cliente</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Referencia</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Categoría</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Talla</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Color Sup.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Color Inf.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Cant.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Total Venta</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Ganancia</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Estado</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-4 text-xs font-bold text-[#ff7a00] whitespace-nowrap">{sale.invoiceNumber || "---"}</td>
                  <td className="py-4 px-4 text-xs font-medium text-[#8f97a6] whitespace-nowrap">{sale.fecha}</td>
                  <td className="py-4 px-4 text-sm font-bold text-white">{sale.cliente}</td>
                  <td className="py-4 px-4 text-xs font-bold text-[#b9c0cc]">{sale.referencia}</td>
                  <td className="py-4 px-4 text-xs font-bold text-[#ff7a00]">{sale.categoria}</td>
                  <td className="py-4 px-4 text-xs text-[#8f97a6]">{sale.talla}</td>
                  <td className="py-4 px-4 text-xs text-[#8f97a6]">{sale.colorCamiseta}</td>
                  <td className="py-4 px-4 text-xs text-[#8f97a6]">{sale.colorInferior}</td>
                  <td className="py-4 px-4 text-center font-bold text-white">x{sale.cantidad}</td>
                  <td className="py-4 px-4 text-right font-bold text-white">{formatCOP(sale.totalVenta)}</td>
                  <td className="py-4 px-4 text-right font-bold text-[#4ade80]">{formatCOP(sale.ganancia)}</td>
                  <td className="py-4 px-4 text-center">
                    <select 
                      value={sale.estado}
                      onChange={(e) => onUpdateSaleStatus(sale.id, e.target.value as any)}
                      className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border-none cursor-pointer transition-all ${
                        sale.estado === 'Pagado' ? 'bg-green-500/20 text-green-400' : 
                        sale.estado === 'Pendiente' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {ESTADOS_VENTA.map(e => <option key={e} value={e} className="bg-[#1a1d24]">{e}</option>)}
                    </select>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onDownloadInvoice(sale)}
                        className="p-2 text-[#8f97a6] hover:text-[#4ade80] transition-colors"
                        title="Descargar Factura"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteSale(sale.id)}
                        className="p-2 text-[#8f97a6] hover:text-[#ef4444] transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-20 text-center text-[#8f97a6] font-bold uppercase tracking-widest text-[11px]">
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
