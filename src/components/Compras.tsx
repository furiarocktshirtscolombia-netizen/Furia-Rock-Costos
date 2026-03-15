import React, { useState } from 'react';
import { Purchase } from '../../types';
import { Trash2, Plus, ShoppingBag, Calendar, User, Tag, CreditCard } from 'lucide-react';
import { CATEGORIAS_COMPRA, METODOS_PAGO } from '../../constants';

interface ComprasProps {
  purchases: Purchase[];
  onAddPurchase: (purchase: Purchase) => void;
  onDeletePurchase: (id: string) => void;
}

const Compras: React.FC<ComprasProps> = ({ purchases, onAddPurchase, onDeletePurchase }) => {
  const [showForm, setShowForm] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    producto: '',
    categoria: CATEGORIAS_COMPRA[0],
    cantidad: 1,
    valorUnitario: 0,
    observaciones: ''
  });

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const purchase: Purchase = {
      id: Date.now() + Math.random(),
      ...newPurchase,
      totalCompra: newPurchase.cantidad * newPurchase.valorUnitario
    };
    onAddPurchase(purchase);
    setNewPurchase({
      fecha: new Date().toISOString().split('T')[0],
      proveedor: '',
      producto: '',
      categoria: CATEGORIAS_COMPRA[0],
      cantidad: 1,
      valorUnitario: 0,
      observaciones: ''
    });
    setShowForm(false);
  };

  const totalInversion = purchases.reduce((acc, p) => acc + p.totalCompra, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="panel px-8 py-4 border-l-4 border-l-black">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Inversión Total</p>
          <p className="text-3xl font-bold text-gray-900">{formatCOP(totalInversion)}</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-8 py-4 rounded-xl flex items-center gap-3 text-[11px] font-bold tracking-widest hover:bg-gray-800 transition-all active:scale-95"
        >
          {showForm ? 'CANCELAR' : <><Plus size={18} /> NUEVA COMPRA</>}
        </button>
      </div>

      {showForm && (
        <section className="panel p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">Nueva Compra</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Fecha</label>
              <input required type="date" value={newPurchase.fecha} onChange={e => setNewPurchase({...newPurchase, fecha: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Proveedor</label>
              <input required type="text" value={newPurchase.proveedor} onChange={e => setNewPurchase({...newPurchase, proveedor: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" placeholder="Nombre del proveedor..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Producto / Insumo</label>
              <input required type="text" value={newPurchase.producto} onChange={e => setNewPurchase({...newPurchase, producto: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" placeholder="¿Qué compraste?" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Categoría</label>
              <select value={newPurchase.categoria} onChange={e => setNewPurchase({...newPurchase, categoria: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none">
                {CATEGORIAS_COMPRA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Cantidad</label>
              <input required type="number" min="1" value={newPurchase.cantidad} onChange={e => setNewPurchase({...newPurchase, cantidad: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Valor Unitario</label>
              <input required type="number" min="0" value={newPurchase.valorUnitario} onChange={e => setNewPurchase({...newPurchase, valorUnitario: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Total Compra</label>
              <div className="w-full px-4 py-3 bg-gray-100 text-gray-900 font-bold border border-gray-200 rounded-xl">
                {formatCOP(newPurchase.cantidad * newPurchase.valorUnitario)}
              </div>
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Observaciones</label>
              <textarea value={newPurchase.observaciones} onChange={e => setNewPurchase({...newPurchase, observaciones: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-black outline-none min-h-[80px] resize-none" placeholder="Detalles adicionales..." />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="bg-black text-white px-12 py-4 rounded-xl text-[11px] font-bold tracking-widest hover:bg-gray-800 transition-all active:scale-95">GUARDAR COMPRA</button>
            </div>
          </form>
        </section>
      )}

      <div className="panel p-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Proveedor</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Producto</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Categoría</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Cant.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">V. Unitario</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Total</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-4 text-xs font-medium text-gray-500 whitespace-nowrap">{p.fecha}</td>
                  <td className="py-4 px-4 text-sm font-bold text-gray-900">{p.proveedor}</td>
                  <td className="py-4 px-4 text-xs font-bold text-gray-700">{p.producto}</td>
                  <td className="py-4 px-4 text-xs text-gray-600">{p.categoria}</td>
                  <td className="py-4 px-4 text-center font-bold text-black">x{p.cantidad}</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCOP(p.valorUnitario)}</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCOP(p.totalCompra)}</td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      onClick={() => onDeletePurchase(p.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[11px]">
                    No hay compras registradas.
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

export default Compras;
