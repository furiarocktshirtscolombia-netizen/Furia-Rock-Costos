// Panel derecho: propiedades del elemento seleccionado (imagen o texto).
import React from 'react';
import { SelectedElementInfo } from './CanvasStage';
import { FONT_OPTIONS, ensureFontLoaded } from '../data/fonts';
import { Garment, ViewSide } from '../types';
import { computeRealMeasurements, computeDpiInfo, DpiRating } from '../utils/measurements';

interface Props {
  selected: SelectedElementInfo | null;
  garment: Garment;
  side: ViewSide;
  onChange: (props: Partial<SelectedElementInfo>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onCenterH: () => void;
  onCenterV: () => void;
}

function dpiColorClass(rating: DpiRating): string {
  switch (rating) {
    case 'excelente': return 'bg-green-900/40 text-green-300';
    case 'aceptable': return 'bg-blue-900/40 text-blue-300';
    case 'regular': return 'bg-yellow-900/40 text-yellow-300';
    default: return 'bg-red-900/40 text-red-300';
  }
}

export default function RightPanel({ selected, garment, side, onChange, onDuplicate, onDelete, onToggleLock, onCenterH, onCenterV }: Props) {
  if (!selected) {
    return (
      <aside className="w-full lg:w-72 bg-[#121317] border border-white/10 rounded-2xl p-4">
        <p className="text-sm text-white/50">Selecciona un elemento del lienzo para editar sus propiedades.</p>
      </aside>
    );
  }

  const isText = selected.kind === 'text';
  const area = side === 'front' ? garment.printAreaFront : garment.printAreaBack;
  const realWidthPx = (selected.width || 0) * (selected.scaleX || 1);
  const realHeightPx = (selected.height || 0) * (selected.scaleY || 1);
  const measurements = computeRealMeasurements(
    {
      left: selected.x - realWidthPx / 2,
      top: selected.y - realHeightPx / 2,
      width: realWidthPx,
      height: realHeightPx,
    },
    area
  );
  const dpiInfo = !isText && selected.width ? computeDpiInfo(selected.width, measurements.widthCm) : null;

  return (
    <aside className="w-full lg:w-72 flex flex-col gap-4 bg-[#121317] border border-white/10 rounded-2xl p-4 overflow-y-auto max-h-[80vh]">
      <div className="flex gap-2 flex-wrap">
        <button onClick={onDuplicate} className="btn-light text-xs">Duplicar</button>
        <button onClick={onDelete} className="btn-light text-xs">Eliminar</button>
        <button onClick={onToggleLock} className="btn-light text-xs">{selected.locked ? 'Desbloquear' : 'Bloquear'}</button>
        <button onClick={onCenterH} className="btn-light text-xs">Centrar H</button>
        <button onClick={onCenterV} className="btn-light text-xs">Centrar V</button>
      </div>

      <div className="bg-black/30 rounded-xl p-3 text-xs text-white/80 space-y-1">
        <p className="font-bold text-white/60 uppercase tracking-widest text-[10px] mb-1">Medidas reales</p>
        <p>Ancho: {measurements.widthCm} cm &nbsp; Alto: {measurements.heightCm} cm</p>
        <p>Area usada: {measurements.areaUsedCm2} cm2 de {measurements.areaMaxCm2} cm2</p>
        <p>Area restante: {measurements.areaRemainingCm2} cm2</p>
        <p>Desde el cuello: {measurements.distTopCollarCm} cm</p>
        <p>Desde borde inferior: {measurements.distBottomCm} cm</p>
        <p>Desde los lados: {measurements.distLeftCm} cm / {measurements.distRightCm} cm</p>
        {measurements.outOfBounds && (
          <p className="text-[#ff7a00] font-bold">El diseno sobresale del area de impresion segura.</p>
        )}
      </div>

      {dpiInfo && (
        <div className={'rounded-xl p-3 text-xs space-y-1 ' + dpiColorClass(dpiInfo.rating)}>
          <p className="font-bold uppercase tracking-widest text-[10px] mb-1">Calidad de impresion (DTG)</p>
          <p>DPI efectivo: {dpiInfo.dpiEffective}</p>
          <p className="font-bold">{dpiInfo.label}</p>
        </div>
      )}

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
