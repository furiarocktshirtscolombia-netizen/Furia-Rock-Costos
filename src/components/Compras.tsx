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
    proveedor: '',
    tipoCompra: CATEGORIAS_COMPRA[0],
    producto: '',
    categoria: '',
    cantidad: 1,
    valorUnitario: 0,
    formaPago: METODOS_PAGO[0],
    observaciones: ''
  });

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const purchase: Purchase = {
      id: crypto.randomUUID(),
      fecha: new Date().toLocaleDateString("es-CO"),
      ...newPurchase,
      totalCompra: newPurchase.cantidad * newPurchase.valorUnitario
    };
    onAddPurchase(purchase);
    setNewPurchase({
      proveedor: '',
      tipoCompra: CATEGORIAS_COMPRA[0],
      producto: '',
      categoria: '',
      cantidad: 1,
      valorUnitario: 0,
      formaPago: METODOS_PAGO[0],
      observaciones: ''
    });
    setShowForm(false);
  };

  const totalInversion = purchases.reduce((acc, p) => acc + p.totalCompra, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="card px-8 py-4 border-l-4 border-l-hot-pink">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Inversión Total</p>
          <p className="text-3xl font-black text-white">{formatCOP(totalInversion)}</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-8 py-4 flex items-center gap-3 text-[11px] tracking-widest"
        >
          {showForm ? 'CANCELAR' : <><Plus size={18} /> NUEVA COMPRA</>}
        </button>
      </div>

      {showForm && (
        <section className="card p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Proveedor</label>
              <input 
                required
                type="text" 
                value={newPurchase.proveedor}
                onChange={e => setNewPurchase({...newPurchase, proveedor: e.target.value})}
                className="w-full px-4 py-3"
                placeholder="Nombre del proveedor..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Producto / Insumo</label>
              <input 
                required
                type="text" 
                value={newPurchase.producto}
                onChange={e => setNewPurchase({...newPurchase, producto: e.target.value})}
                className="w-full px-4 py-3"
                placeholder="¿Qué compraste?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Compra</label>
              <select 
                value={newPurchase.tipoCompra}
                onChange={e => setNewPurchase({...newPurchase, tipoCompra: e.target.value})}
                className="w-full"
              >
                {CATEGORIAS_COMPRA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad</label>
              <input 
                required
                type="number" 
                min="1"
                value={newPurchase.cantidad}
                onChange={e => setNewPurchase({...newPurchase, cantidad: Number(e.target.value)})}
                className="w-full px-4 py-3"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Unitario</label>
              <input 
                required
                type="number" 
                min="0"
                value={newPurchase.valorUnitario}
                onChange={e => setNewPurchase({...newPurchase, valorUnitario: Number(e.target.value)})}
                className="w-full px-4 py-3"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Forma de Pago</label>
              <select 
                value={newPurchase.formaPago}
                onChange={e => setNewPurchase({...newPurchase, formaPago: e.target.value})}
                className="w-full"
              >
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Observaciones</label>
              <textarea 
                value={newPurchase.observaciones}
                onChange={e => setNewPurchase({...newPurchase, observaciones: e.target.value})}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white text-sm min-h-[80px] resize-none"
                placeholder="Detalles adicionales..."
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="btn-primary px-12 py-4 text-[11px] tracking-widest">
                REGISTRAR COMPRA
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="card p-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Proveedor</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Producto</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Categoría</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Total</th>
                <th className="py-4 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {purchases.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-4 text-xs font-medium text-slate-400">{p.fecha}</td>
                  <td className="py-4 px-4 text-sm font-black text-white">{p.proveedor}</td>
                  <td className="py-4 px-4 text-sm font-bold text-white">{p.producto}</td>
                  <td className="py-4 px-4">
                    <span className="bg-slate-900 text-slate-400 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">
                      {p.tipoCompra}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center font-black text-hot-pink">x{p.cantidad}</td>
                  <td className="py-4 px-4 text-right font-black text-white">{formatCOP(p.totalCompra)}</td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      onClick={() => onDeletePurchase(p.id)}
                      className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-[11px]">
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
