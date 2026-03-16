import React, { useState } from 'react';
import { Purchase, ProductReference } from '../../types';
import { Trash2, Plus, ShoppingBag, Calendar, User, Tag, CreditCard, Box } from 'lucide-react';
import { CATEGORIAS_COMPRA, METODOS_PAGO, TALLAS_NINO, TALLAS_ADULTO, COLORES_CAMISETA } from '../../constants';

interface ComprasProps {
  purchases: Purchase[];
  productRefs: ProductReference[];
  onAddPurchase: (purchase: Purchase) => void;
  onDeletePurchase: (id: string) => void;
}

const Compras: React.FC<ComprasProps> = ({ purchases, productRefs, onAddPurchase, onDeletePurchase }) => {
  const [showForm, setShowForm] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    referencia: productRefs[0]?.name || '',
    producto: productRefs[0]?.name || '', // Auto-filled with reference name
    categoria: CATEGORIAS_COMPRA[0],
    talla: TALLAS_ADULTO[0],
    color: COLORES_CAMISETA[1], // Blanco
    cantidad: 1,
    valorUnitario: 0,
    metodoPago: METODOS_PAGO[0],
    observaciones: ''
  });

  // Sync producto with referencia automatically
  React.useEffect(() => {
    setNewPurchase(prev => ({ ...prev, producto: prev.referencia }));
  }, [newPurchase.referencia]);

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const purchase: Purchase = {
      id: Date.now() + Math.random(),
      ...newPurchase,
      producto: newPurchase.producto || newPurchase.referencia,
      totalCompra: newPurchase.cantidad * newPurchase.valorUnitario
    };
    onAddPurchase(purchase);
    setNewPurchase({
      fecha: new Date().toISOString().split('T')[0],
      proveedor: '',
      referencia: productRefs[0]?.name || '',
      producto: productRefs[0]?.name || '',
      categoria: CATEGORIAS_COMPRA[0],
      talla: TALLAS_ADULTO[0],
      color: COLORES_CAMISETA[1],
      cantidad: 1,
      valorUnitario: 0,
      metodoPago: METODOS_PAGO[0],
      observaciones: ''
    });
    setShowForm(false);
  };

  const totalInversion = purchases.reduce((acc, p) => acc + p.totalCompra, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="panel px-8 py-4 border-l-4 border-l-[#ff7a00] bg-gradient-to-br from-[#1a1d24] to-[#20242d]">
          <p className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Inversión Total</p>
          <p className="text-3xl font-bold text-white">{formatCOP(totalInversion)}</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#ff7a00] text-white px-8 py-4 rounded-xl flex items-center gap-3 text-[11px] font-bold tracking-widest hover:bg-[#ff8f26] transition-all active:scale-95 shadow-lg shadow-[#ff7a00]/20"
        >
          {showForm ? 'CANCELAR' : <><Plus size={18} /> NUEVA COMPRA</>}
        </button>
      </div>

      {showForm && (
        <section className="panel p-8 animate-in fade-in slide-in-from-top-4 duration-300 bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <h2 className="text-lg font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4 text-white">Nueva Compra</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Fecha</label>
              <input required type="date" value={newPurchase.fecha} onChange={e => setNewPurchase({...newPurchase, fecha: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Proveedor</label>
              <input required type="text" value={newPurchase.proveedor} onChange={e => setNewPurchase({...newPurchase, proveedor: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" placeholder="Nombre del proveedor..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Referencia</label>
              <select required value={newPurchase.referencia} onChange={e => setNewPurchase({...newPurchase, referencia: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all">
                {productRefs.map(r => <option key={r.id} value={r.name} className="bg-[#1a1d24]">{r.name}</option>)}
                <option value="Insumo General" className="bg-[#1a1d24]">Insumo General</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Descripción / Producto</label>
              <input 
                type="text" 
                value={newPurchase.producto} 
                readOnly 
                className="w-full bg-[#1a1d24] border border-white/10 rounded-xl px-4 py-3 text-[#8f97a6] font-bold outline-none cursor-not-allowed" 
                placeholder="Nombre de la referencia..." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Categoría</label>
              <select value={newPurchase.categoria} onChange={e => setNewPurchase({...newPurchase, categoria: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all">
                {CATEGORIAS_COMPRA.map(c => <option key={c} value={c} className="bg-[#1a1d24]">{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Talla</label>
              <select value={newPurchase.talla} onChange={e => setNewPurchase({...newPurchase, talla: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all">
                <optgroup label="Adulto" className="bg-[#1a1d24]">
                  {TALLAS_ADULTO.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="Niño" className="bg-[#1a1d24]">
                  {TALLAS_NINO.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <option value="N/A" className="bg-[#1a1d24]">No aplica</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Color</label>
              <select value={newPurchase.color} onChange={e => setNewPurchase({...newPurchase, color: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all">
                {COLORES_CAMISETA.map(c => <option key={c} value={c} className="bg-[#1a1d24]">{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Cantidad</label>
              <input required type="number" min="1" value={newPurchase.cantidad} onChange={e => setNewPurchase({...newPurchase, cantidad: Number(e.target.value)})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Valor Unitario</label>
              <input required type="number" min="0" value={newPurchase.valorUnitario} onChange={e => setNewPurchase({...newPurchase, valorUnitario: Number(e.target.value)})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Método de Pago</label>
              <select value={newPurchase.metodoPago} onChange={e => setNewPurchase({...newPurchase, metodoPago: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all">
                {METODOS_PAGO.map(m => <option key={m} value={m} className="bg-[#1a1d24]">{m}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Observaciones</label>
              <textarea value={newPurchase.observaciones} onChange={e => setNewPurchase({...newPurchase, observaciones: e.target.value})} className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none min-h-[80px] resize-none transition-all" placeholder="Detalles adicionales..." />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="bg-[#ff7a00] text-white px-12 py-4 rounded-xl text-[11px] font-bold tracking-widest hover:bg-[#ff8f26] transition-all active:scale-95 shadow-lg shadow-[#ff7a00]/20">GUARDAR COMPRA</button>
            </div>
          </form>
        </section>
      )}

      <div className="panel p-8 bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Proveedor</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Referencia</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Producto</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest">Variante</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-center">Cant.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">V. Unitario</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Total</th>
                <th className="py-4 px-4 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {purchases.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-4 text-xs font-medium text-[#b9c0cc] whitespace-nowrap">{p.fecha}</td>
                  <td className="py-4 px-4 text-sm font-bold text-white">{p.proveedor}</td>
                  <td className="py-4 px-4 text-xs font-bold text-[#ff7a00]">{p.referencia}</td>
                  <td className="py-4 px-4 text-xs font-bold text-[#b9c0cc]">{p.producto}</td>
                  <td className="py-4 px-4 text-xs text-[#8f97a6]">
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/10 mr-2">{p.talla}</span>
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/10">{p.color}</span>
                  </td>
                  <td className="py-4 px-4 text-center font-bold text-[#ff7a00]">x{p.cantidad}</td>
                  <td className="py-4 px-4 text-right font-bold text-white">{formatCOP(p.valorUnitario)}</td>
                  <td className="py-4 px-4 text-right font-bold text-[#4ade80]">{formatCOP(p.totalCompra)}</td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      onClick={() => onDeletePurchase(p.id)}
                      className="p-2 text-[#8f97a6] hover:text-[#ef4444] transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-[#8f97a6] font-bold uppercase tracking-widest text-[11px]">
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
