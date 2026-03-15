import React from 'react';
import { LayoutGrid, ShoppingCart, ShoppingBag, PieChart as PieChartIcon } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'cotizador', label: 'Cotizador', icon: LayoutGrid },
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
    { id: 'compras', label: 'Compras', icon: ShoppingBag },
    { id: 'dashboard', label: 'Dashboard', icon: PieChartIcon },
  ];

  return (
    <nav className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isActive 
                ? 'bg-white text-black shadow-lg shadow-white/10' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
