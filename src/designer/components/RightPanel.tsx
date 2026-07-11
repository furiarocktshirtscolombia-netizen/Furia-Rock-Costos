// Panel derecho: propiedades del elemento seleccionado (imagen o texto).
import React from 'react';
import { SelectedElementInfo } from './CanvasStage';
import { FONT_OPTIONS, ensureFontLoaded } from '../data/fonts';

interface Props {
  selected: SelectedElementInfo | null;
  onChange: (props: Partial<SelectedElementInfo>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onCenterH: () => void;
  onCenterV: () => void;
  }

export default function RightPanel({ selected, onChange, onDuplicate, onDelete, onToggleLock, onCenterH, onCenterV }: Props) {
  if (!selected) {
    return (
      <aside className="w-full lg:w-72 bg-[#121317] border border-white/10 rounded-2xl p-4">
      <p className="text-sm text-white/50">Selecciona un elemento del lienzo para editar sus propiedades.</p>
      </aside>
      );
    }

  const isText = selected.kind === 'text';

  return (
    <aside className="w-full lg:w-72 flex flex-col gap-4 bg-[#121317] border border-white/10 rounded-2xl p-4 overflow-y-auto max-h-[80vh]">
    <div className="flex gap-2 flex-wrap">
    <button onClick={onDuplicate} className="btn-light text-xs">Duplicar</button>
    <button onClick={onDelete} className="btn-light text-xs">Eliminar</button>
    <button onClick={onToggleLock} className="btn-light text-xs">{selected.locked ? 'Desbloquear' : 'Bloquear'}</button>
    <button onClick={onCenterH} className="btn-light text-xs">Centrar H</button>
    <button onClick={onCenterV} className="btn-light text-xs">Centrar V</button>
    </div>

    <div>
    <label className="text-xs text-white/60 block mb-1">Posicion X</label>
    <input type="number" value={selected.x} onChange={(e) => onChange({ x: Number(e.target.value) })} className="w-full text-sm" />
    </div>
    <div>
    <label className="text-xs text-white/60 block mb-1">Posicion Y</label>
    <input type="number" value={selected.y} onChange={(e) => onChange({ y: Number(e.target.value) })} className="w-full text-sm" />
    </div>
    <div>
    <label className="text-xs text-white/60 block mb-1">Rotacion</label>
    <input type="number" value={selected.angle} onChange={(e) => onChange({ angle: Number(e.target.value) })} className="w-full text-sm" />
    </div>
    <div>
    <label className="text-xs text-white/60 block mb-1">Opacidad</label>
    <input type="range" min={0} max={1} step={0.05} value={selected.opacity} onChange={(e) => onChange({ opacity: Number(e.target.value) })} className="w-full" />
    </div>

    {isText && (
      <>
      <div>
      <label className="text-xs text-white/60 block mb-1">Texto</label>
      <input value={selected.text || ''} onChange={(e) => onChange({ text: e.target.value })} className="w-full text-sm" />
      </div>
      <div>
      <label className="text-xs text-white/60 block mb-1">Fuente</label>
      <select
      value={selected.fontFamily || 'Inter'}
      onChange={(e) => { ensureFontLoaded(e.target.value); onChange({ fontFamily: e.target.value }); }}
      className="w-full text-sm"
      >
      {FONT_OPTIONS.map((f) => (
        <option key={f.family} value={f.family}>{f.family}</option>
        ))}
      </select>
      </div>
      <div>
      <label className="text-xs text-white/60 block mb-1">Tamano</label>
      <input type="number" value={selected.fontSize || 32} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} className="w-full text-sm" />
      </div>
      <div>
      <label className="text-xs text-white/60 block mb-1">Color</label>
      <input type="color" value={selected.fill || '#ffffff'} onChange={(e) => onChange({ fill: e.target.value })} className="w-full h-9" />
      </div>
      <div>
      <label className="text-xs text-white/60 block mb-1">Contorno</label>
      <input type="color" value={selected.stroke || '#000000'} onChange={(e) => onChange({ stroke: e.target.value })} className="w-full h-9" />
      </div>
      <div>
      <label className="text-xs text-white/60 block mb-1">Grosor de contorno</label>
      <input type="number" min={0} value={selected.strokeWidth || 0} onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })} className="w-full text-sm" />
      </div>
      <div>
      <label className="text-xs text-white/60 block mb-1">Espaciado</label>
      <input type="number" value={selected.charSpacing || 0} onChange={(e) => onChange({ charSpacing: Number(e.target.value) })} className="w-full text-sm" />
      </div>
      <div className="flex gap-2">
      <button onClick={() => onChange({ bold: !selected.bold })} className={'btn-light text-xs ' + (selected.bold ? 'ring-2 ring-[#ff7a00]' : '')}>Negrita</button>
      <button onClick={() => onChange({ italic: !selected.italic })} className={'btn-light text-xs ' + (selected.italic ? 'ring-2 ring-[#ff7a00]' : '')}>Cursiva</button>
      <button onClick={() => onChange({ underline: !selected.underline })} className={'btn-light text-xs ' + (selected.underline ? 'ring-2 ring-[#ff7a00]' : '')}>Subrayado</button>
      </div>
      <div>
      <label className="text-xs text-white/60 block mb-1">Alineacion</label>
      <div className="flex gap-2">
      {['left', 'center', 'right'].map((a) => (
        <button key={a} onClick={() => onChange({ align: a })} className={'btn-light text-xs ' + (selected.align === a ? 'ring-2 ring-[#ff7a00]' : '')}>{a}</button>
        ))}
      </div>
      </div>
      </>
      )}
    </aside>
    );
  }
