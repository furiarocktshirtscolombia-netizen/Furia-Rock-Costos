import React from 'react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  ShoppingBag, 
  PieChart as PieChartIcon, 
  Package, 
  Settings, 
  Users, 
  FileText 
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChartIcon },
    { id: 'cotizador', label: 'Cotizador', icon: LayoutGrid },
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
    { id: 'compras', label: 'Compras', icon: ShoppingBag },
    { id: 'inventarios', label: 'Inventarios', icon: Package },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'facturacion', label: 'Facturación', icon: FileText },
    { id: 'config', label: 'Config', icon: Settings },
  ];

  return (
    <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              isActive 
                ? 'bg-[#ff7a00] text-white shadow-xl shadow-[#ff7a00]/20' 
                : 'text-[#8f97a6] hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={14} strokeWidth={isActive ? 3 : 2} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
