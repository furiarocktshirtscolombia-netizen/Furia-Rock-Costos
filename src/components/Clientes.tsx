import React, { useState } from 'react';
import { Client } from '../../types';
import { Search, Plus, User, Phone, MapPin, FileText } from 'lucide-react';

interface ClientesProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
}

const Clientes: React.FC<ClientesProps> = ({ clients, onAddClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    nombre: '',
    telefono: '',
    ciudad: '',
    direccion: '',
    notas: ''
  });

  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClient.nombre) {
      onAddClient({
        id: Date.now().toString(),
        nombre: newClient.nombre,
        telefono: newClient.telefono || '',
        ciudad: newClient.ciudad || '',
        direccion: newClient.direccion || '',
        notas: newClient.notas || ''
      });
      setShowAddModal(false);
      setNewClient({ nombre: '', telefono: '', ciudad: '', direccion: '', notas: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="text-orange-500" /> Gestión de Clientes
        </h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white w-64 focus:outline-none focus:border-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-orange-500/50 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-orange-500/10 p-3 rounded-full">
                <User className="text-orange-500" size={24} />
              </div>
              <span className="text-xs text-zinc-500 font-mono">ID: {client.id.slice(-6)}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{client.nombre}</h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-zinc-600" /> {client.telefono || 'Sin teléfono'}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-600" /> {client.ciudad} {client.direccion && `- ${client.direccion}`}
              </div>
              {client.notas && (
                <div className="flex items-start gap-2 mt-3 pt-3 border-top border-zinc-800">
                  <FileText size={14} className="text-zinc-600 mt-1" />
                  <p className="italic">{client.notas}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-6">Agregar Nuevo Cliente</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Nombre Completo *</label>
                <input
                  required
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  value={newClient.nombre}
                  onChange={e => setNewClient({...newClient, nombre: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    value={newClient.telefono}
                    onChange={e => setNewClient({...newClient, telefono: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Ciudad</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    value={newClient.ciudad}
                    onChange={e => setNewClient({...newClient, ciudad: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Dirección</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  value={newClient.direccion}
                  onChange={e => setNewClient({...newClient, direccion: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Notas / Observaciones</label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 h-24"
                  value={newClient.notas}
                  onChange={e => setNewClient({...newClient, notas: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
