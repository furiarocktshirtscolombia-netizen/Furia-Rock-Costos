import React, { useState } from 'react';
import { Invoice } from '../../types';
import { Search, FileText, Download, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';

interface FacturacionProps {
  invoices: Invoice[];
  onUpdateStatus: (id: string, status: Invoice['estado']) => void;
  onViewInvoice: (inv: Invoice) => void;
  onDownloadInvoice: (inv: Invoice) => void;
}

const Facturacion: React.FC<FacturacionProps> = ({ invoices, onUpdateStatus, onViewInvoice, onDownloadInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter(inv => 
    inv.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: Invoice['estado']) => {
    switch (status) {
      case 'Pagada': return <CheckCircle className="text-emerald-500" size={16} />;
      case 'Pendiente': return <Clock className="text-amber-500" size={16} />;
      case 'Anulada': return <XCircle className="text-rose-500" size={16} />;
    }
  };

  const getStatusClass = (status: Invoice['estado']) => {
    switch (status) {
      case 'Pagada': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Pendiente': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Anulada': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-orange-500" /> Facturación
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por factura o cliente..."
            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white w-64 focus:outline-none focus:border-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Número</th>
                <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white font-mono font-bold">{inv.numero}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">{inv.fecha}</td>
                    <td className="px-6 py-4 text-white font-medium">{inv.cliente}</td>
                    <td className="px-6 py-4 text-white font-bold">
                      ${inv.total.toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusClass(inv.estado)}`}>
                        {getStatusIcon(inv.estado)}
                        {inv.estado}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors" 
                          title="Ver PDF"
                          onClick={() => onViewInvoice(inv)}
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors" 
                          title="Descargar"
                          onClick={() => onDownloadInvoice(inv)}
                        >
                          <Download size={18} />
                        </button>
                        <select
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-orange-500"
                          value={inv.estado}
                          onChange={(e) => onUpdateStatus(inv.id, e.target.value as Invoice['estado'])}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Pagada">Pagada</option>
                          <option value="Anulada">Anulada</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No se encontraron facturas.
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

export default Facturacion;
