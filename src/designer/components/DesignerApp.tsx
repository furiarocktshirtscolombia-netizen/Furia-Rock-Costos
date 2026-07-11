// Componente principal del Disenador de Camisetas Furia Rock.
// Orquesta las 4 zonas (barra superior, panel izquierdo, lienzo, panel derecho)
// y la logica de guardado/autoguardado/historial.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from './TopBar';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import HelpModal from './HelpModal';
import CanvasStage, { CanvasStageHandle, SelectedElementInfo } from './CanvasStage';
import { GARMENTS } from '../data/products';
import { ViewSide, CartItem } from '../types';
import { AUTOSAVE_INTERVAL_MS, LOCAL_DRAFT_KEY } from '../config';
import { saveDesignToBackend, sendProductionOrder, fetchAreasDTG } from '../utils/gasApi';
import { applyAreaOverrides } from '../utils/areaOverrides';

export default function DesignerApp() {
  // Prendas con las medidas DTG por defecto (data/products.ts). Si la hoja
  // "AreasDTG" en Google Sheets responde con overrides, se reemplazan aqui
  // mismo sin tocar el archivo de datos original (ver utils/areaOverrides.ts).
  const [garmentsData, setGarmentsData] = useState(GARMENTS);
  const [garmentId, setGarmentId] = useState(GARMENTS[0].id);
  const garment = garmentsData.find((g) => g.id === garmentId) || garmentsData[0];
  const [colorId, setColorId] = useState(garment.colors[0].id);
  const [size, setSize] = useState(garment.sizes[0]);
  const [side, setSide] = useState<ViewSide>('front');
  const [selected, setSelected] = useState<SelectedElementInfo | null>(null);
  const [cliente, setCliente] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [autosaveLabel, setAutosaveLabel] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const canvasRef = useRef<CanvasStageHandle>(null);
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const skipHistoryRef = useRef(false);

  const colorHex = (garment.colors.find((c) => c.id === colorId) || garment.colors[0]).hex;

  useEffect(() => {
    let cancelled = false;
    fetchAreasDTG()
      .then((res) => {
        if (cancelled) return;
        if (res && res.status === 'ok' && Array.isArray(res.areas) && res.areas.length > 0) {
          setGarmentsData(applyAreaOverrides(GARMENTS, res.areas));
        }
      })
      .catch(() => {
        // Sin conexion o accion no disponible todavia en el backend:
        // se conservan las medidas por defecto de data/products.ts.
      });
    return () => { cancelled = true; };
  }, []);

  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return;
    const json = canvasRef.current ? canvasRef.current.getObjectsJSON() : null;
    if (!json) return;
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const handleSelectElement = useCallback((info: SelectedElementInfo | null) => {
    setSelected(info);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => pushHistory(), 400);
    return () => clearTimeout(t);
  }, [selected, pushHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      const json = canvasRef.current ? canvasRef.current.getObjectsJSON() : null;
      if (!json) return;
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({ garmentId, colorId, size, side, json, savedAt: Date.now() }));
      setAutosaveLabel('Borrador guardado ' + new Date().toLocaleTimeString());
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [garmentId, colorId, size, side]);

  function handleSelectGarment(id: string) {
    const g = garmentsData.find((x) => x.id === id);
    if (!g) return;
    setGarmentId(id);
    setColorId(g.colors[0].id);
    setSize(g.sizes[0]);
  }

  function handleAddImageFromLibrary(url: string) {
    if (canvasRef.current) canvasRef.current.addImageFromUrl(url);
  }

  function handleAddText() {
    if (canvasRef.current) canvasRef.current.addText('Tu texto aqui');
  }

  function handleChangeSelected(props: Partial<SelectedElementInfo>) {
    if (canvasRef.current) canvasRef.current.updateSelectedProps(props);
    setSelected((prev) => (prev ? { ...prev, ...props } : prev));
  }

  function handleUndo() {
    if (historyIndexRef.current <= 0 || !canvasRef.current) return;
    historyIndexRef.current -= 1;
    skipHistoryRef.current = true;
    canvasRef.current.loadObjectsJSON(historyRef.current[historyIndexRef.current]);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    setTimeout(() => { skipHistoryRef.current = false; }, 300);
  }

  function handleRedo() {
    if (!canvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    skipHistoryRef.current = true;
    canvasRef.current.loadObjectsJSON(historyRef.current[historyIndexRef.current]);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    setCanUndo(true);
    setTimeout(() => { skipHistoryRef.current = false; }, 300);
  }

  function handleNew() {
    if (!window.confirm('Se perdera el diseno actual no guardado. Continuar?')) return;
    if (canvasRef.current) canvasRef.current.loadObjectsJSON({ objects: [] });
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }

  async function handleSave() {
    setAutosaveLabel('Guardando...');
    try {
      await saveDesignToBackend({
        id: 'd_' + Date.now(),
        name: garment.name + ' - ' + new Date().toLocaleDateString(),
        garmentId,
        colorId,
        size,
        elementsFront: [],
        elementsBack: [],
        updatedAt: new Date().toISOString(),
      } as any);
      setAutosaveLabel('Guardado ' + new Date().toLocaleTimeString());
    } catch {
      setAutosaveLabel('No se pudo guardar (revisa GAS_URL en config.ts)');
    }
  }

  function handleExportPNG() {
    const dataUrl = canvasRef.current ? canvasRef.current.exportPNG() : undefined;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'diseno-furia-rock.png';
    a.click();
  }

  function handleAddToCart() {
    const dataUrl = (canvasRef.current ? canvasRef.current.exportPNG() : '') || '';
    const item: CartItem = {
      id: 'c_' + Date.now(),
      garmentId,
      garmentName: garment.name,
      colorId,
      colorName: (garment.colors.find((c) => c.id === colorId) || garment.colors[0]).name,
      size,
      quantity: 1,
      unitPrice: garment.price,
      designId: 'd_' + Date.now(),
      previewUrl: dataUrl,
      cliente,
      observaciones,
    };
    setCart((prev) => [...prev, item]);
  }

  async function handleSendToProduction() {
    const dataUrl = (canvasRef.current ? canvasRef.current.exportPNG() : '') || '';
    try {
      await sendProductionOrder({
        cliente,
        garmentId,
        garmentRef: garment.reference,
        colorId,
        size,
        quantity: 1,
        price: garment.price,
        designId: 'd_' + Date.now(),
        previewFrontUrl: dataUrl,
        previewBackUrl: dataUrl,
        printFileUrl: dataUrl,
        observaciones,
      });
      window.alert('Pedido enviado a produccion.');
    } catch {
      window.alert('No se pudo enviar el pedido. Revisa la configuracion de GAS_URL.');
    }
  }

  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      <TopBar
        side={side}
        onToggleSide={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}
        onNew={handleNew}
        onSave={handleSave}
        onOpen={() => window.alert('Abrir diseno: pendiente de listado real desde GAS (fetchSavedDesigns).')}
        onDuplicateDesign={() => window.alert('Duplicar diseno: pendiente de integracion con backend.')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportPNG={handleExportPNG}
        onExportPDF={() => window.alert('Exportar PDF: pendiente (usar jsPDF, ya disponible en el proyecto).')}
        onPreview={() => window.alert('Vista previa: por ahora usa Exportar PNG.')}
        onAddToCart={handleAddToCart}
        onSendToProduction={handleSendToProduction}
        onOpenHelp={() => setShowHelp(true)}
        autosaveLabel={autosaveLabel}
      />
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <LeftPanel
          garments={garmentsData}
          selectedGarment={garment}
          onSelectGarment={handleSelectGarment}
          selectedColorId={colorId}
          onSelectColor={setColorId}
          selectedSize={size}
          onSelectSize={setSize}
          onAddImageFromLibrary={handleAddImageFromLibrary}
        />
        <div className="flex-1 flex flex-col items-center gap-3">
          <button onClick={handleAddText} className="btn-light text-xs self-start">+ Agregar texto</button>
          <CanvasStage ref={canvasRef} garment={garment} colorHex={colorHex} side={side} onSelectElement={handleSelectElement} />
        </div>
        <RightPanel
          selected={selected}
          garment={garment}
          side={side}
          onChange={handleChangeSelected}
          onDuplicate={() => canvasRef.current && canvasRef.current.duplicateSelected()}
          onDelete={() => canvasRef.current && canvasRef.current.deleteSelected()}
          onToggleLock={() => canvasRef.current && canvasRef.current.toggleLockSelected()}
          onCenterH={() => canvasRef.current && canvasRef.current.centerSelectedH()}
          onCenterV={() => canvasRef.current && canvasRef.current.centerSelectedV()}
        />
      </div>

      <div className="mt-6 bg-[#121317] border border-white/10 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Datos del cliente y carrito ({cart.length})</h3>
        <div className="flex flex-wrap gap-3 mb-3">
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" className="text-sm" />
          <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones" className="text-sm flex-1 min-w-[200px]" />
        </div>
        <ul className="text-xs text-white/60 space-y-1">
          {cart.map((item) => (
            <li key={item.id}>{item.garmentName} - {item.colorName} - {item.size} - x{item.quantity}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
