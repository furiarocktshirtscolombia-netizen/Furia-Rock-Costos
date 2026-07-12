// Panel izquierdo: seleccion de prenda/color/talla + biblioteca de elementos.
import React, { useMemo, useState, useRef } from 'react';  
  import { Garment, LibraryCategoryId } from '../types';
import { LIBRARY_CATEGORIES, searchLibraryItems, getLibraryItemsByCategory } from '../data/library';

  interface Props {
  garments: Garment[];
selectedGarment: Garment;
onSelectGarment: (id: string) => void;
selectedColorId: string;
onSelectColor: (id: string) => void;
selectedSize: string;
onSelectSize: (size: string) => void;
onAddImageFromLibrary: (url: string) => void;
}

export default function LeftPanel(props: Props) {
  const {
garments, selectedGarment, onSelectGarment,
  selectedColorId, onSelectColor,
  selectedSize, onSelectSize,
  onAddImageFromLibrary,
  } = props;

const [activeCategory, setActiveCategory] = useState<LibraryCategoryId>('disenos');
const [query, setQuery] = useState('');

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) { alert('Selecciona un archivo de imagen valido.'); e.target.value = ''; return; }
          if (file.size > 5 * 1024 * 1024) { alert('La imagen supera el tamano maximo de 5MB.'); e.target.value = ''; return; }
          const reader = new FileReader();
          reader.onload = () => {
                  if (typeof reader.result === 'string') onAddImageFromLibrary(reader.result);
          };
          reader.readAsDataURL(file);
          e.target.value = '';
    }

const items = useMemo(() => {
if (query.trim()) return searchLibraryItems(query);
return getLibraryItemsByCategory(activeCategory);
}, [query, activeCategory]);

return (
<aside className="w-full lg:w-80 flex flex-col gap-4 bg-[#121317] border border-white/10 rounded-2xl p-4 overflow-y-auto max-h-[80vh]">
<div>
<h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Prenda</h3>
<select
value={selectedGarment.id}
onChange={(e) => onSelectGarment(e.target.value)}
className="w-full text-sm"
>
{garments.map((g) => (
<option key={g.id} value={g.id}>{g.name}</option>
))}
</select>
</div>

<div>
<h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Color</h3>
<div className="flex flex-wrap gap-2">
{selectedGarment.colors.map((c) => (
<button
key={c.id}
onClick={() => onSelectColor(c.id)}
title={c.name}
className={'w-7 h-7 rounded-full border-2 ' + (selectedColorId === c.id ? 'border-[#ff7a00]' : 'border-white/20')}
style={{ backgroundColor: c.hex }}
/>
))}
</div>
</div>

<div>
<h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Talla</h3>
<div className="flex flex-wrap gap-2">
{selectedGarment.sizes.map((s) => (
<button
key={s}
onClick={() => onSelectSize(s)}
className={'px-3 py-1 rounded-lg text-xs font-bold border ' + (selectedSize === s ? 'bg-[#ff7a00] border-[#ff7a00] text-white' : 'border-white/20 text-white/70')}
>
{s}
</button>
))}
</div>

  <div className="border-t border-white/10 pt-3">
  <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Subir imagen</h3>
  <input
    ref={fileInputRef}
    type="file"
    accept="image/png,image/jpeg,image/webp,image/svg+xml"
    onChange={handleUploadFile}
    className="hidden"
    />
  <button
    onClick={() => fileInputRef.current?.click()}
    className="w-full text-sm font-bold px-3 py-2 rounded-lg bg-[#ff7a00] text-white hover:bg-[#e86e00] transition"
    >
  + Subir imagen desde tu equipo
  </button>
  <p className="text-[10px] text-white/40 mt-1">PNG, JPG, WEBP o SVG. Maximo 5MB.</p>
  </div>
</div>
<div className="border-t border-white/10 pt-3">
<h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Biblioteca</h3>
<input
value={query}
onChange={(e) => setQuery(e.target.value)}
placeholder="Buscar disenos..."
className="w-full text-sm mb-3"
/>
{!query.trim() && (
<div className="flex flex-wrap gap-1 mb-3">
{LIBRARY_CATEGORIES.map((cat) => (
<button
key={cat.id}
onClick={() => setActiveCategory(cat.id)}
className={'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ' + (activeCategory === cat.id ? 'bg-[#ff7a00] text-white' : 'bg-white/5 text-white/60')}
>
{cat.label}
</button>
))}
</div>
)}
<div className="grid grid-cols-3 gap-2">
{items.map((item) => (
<button
key={item.id}
onClick={() => onAddImageFromLibrary(item.fileUrlPng)}
className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-[#ff7a00] transition"
title={item.name}
>
<img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
</button>
))}
</div>
</div>
</aside>
);
}
