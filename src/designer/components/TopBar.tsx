// Barra superior: acciones principales del disenador.
import React from 'react';
import { ViewSide } from '../types';

  interface Props {
  side: ViewSide;
onToggleSide: () => void;
onNew: () => void;
onSave: () => void;
onOpen: () => void;
onDuplicateDesign: () => void;
onUndo: () => void;
onRedo: () => void;
canUndo: boolean;
canRedo: boolean;
onExportPNG: () => void;
onExportPDF: () => void;
onPreview: () => void;
onAddToCart: () => void;
onSendToProduction: () => void;
autosaveLabel: string;
}

export default function TopBar(props: Props) {
  const {
side, onToggleSide, onNew, onSave, onOpen, onDuplicateDesign,
  onUndo, onRedo, canUndo, canRedo,
  onExportPNG, onExportPDF, onPreview, onAddToCart, onSendToProduction, autosaveLabel,
  } = props;

return (
  <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#121317] border border-white/10 rounded-2xl p-3 mb-4">
  <div className="flex items-center gap-2 flex-wrap">
  <button onClick={onNew} className="btn-light text-xs">Nuevo diseno</button>
  <button onClick={onSave} className="btn-primary text-xs">Guardar</button>
  <button onClick={onOpen} className="btn-light text-xs">Abrir diseno</button>
  <button onClick={onDuplicateDesign} className="btn-light text-xs">Duplicar</button>
  <button onClick={onUndo} disabled={!canUndo} className="btn-light text-xs">Deshacer</button>
  <button onClick={onRedo} disabled={!canRedo} className="btn-light text-xs">Rehacer</button>
  <button
  onClick={onToggleSide}
  className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-white/5 text-white hover:bg-white/10"
  >
  Vista: {side === 'front' ? 'Frente' : 'Espalda'}
</button>
  <span className="text-[10px] text-white/40">{autosaveLabel}</span>
  </div>
  <div className="flex items-center gap-2 flex-wrap">
  <button onClick={onExportPNG} className="btn-light text-xs">Exportar PNG</button>
  <button onClick={onExportPDF} className="btn-light text-xs">Exportar PDF</button>
  <button onClick={onPreview} className="btn-light text-xs">Vista previa</button>
  <button onClick={onAddToCart} className="btn-light text-xs">Agregar al carrito</button>
<button onClick={onSendToProduction} className="btn-primary text-xs">Enviar a produccion</button>
</div>
</div>
);
         }
