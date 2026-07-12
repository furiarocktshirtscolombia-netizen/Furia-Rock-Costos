// Lienzo de edicion basado en Fabric.js v6.
// Expone metodos imperativos para que la barra superior y el panel derecho
// controlen el lienzo sin duplicar el estado del diseno.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
  import * as fabric from 'fabric';
import { Garment, ViewSide } from '../types';
import { buildGarmentSvgDataUrl } from '../utils/garmentArt';
  import { ensureFontLoaded } from '../data/fonts';

  export interface SelectedElementInfo {
  id: string;
kind: 'image' | 'text';
    width: number;
    height: number;
x: number;
y: number;
scaleX: number;
scaleY: number;
angle: number;
opacity: number;
locked: boolean;
text?: string;
fontFamily?: string;
fontSize?: number;
fill?: string;
stroke?: string;
strokeWidth?: number;
bold?: boolean;
italic?: boolean;
underline?: boolean;
align?: string;
charSpacing?: number;
}

export interface CanvasStageHandle {
  addImageFromUrl: (url: string) => void;
addText: (text: string) => void;
duplicateSelected: () => void;
deleteSelected: () => void;
toggleLockSelected: () => void;
centerSelectedH: () => void;
centerSelectedV: () => void;
updateSelectedProps: (props: Partial<SelectedElementInfo>) => void;
exportPNG: () => string | undefined;
getObjectsJSON: () => any;
loadObjectsJSON: (json: any) => void;
clearSelection: () => void;
}

interface Props {
  garment: Garment;
colorHex: string;
colorId: string;
side: ViewSide;
onSelectElement: (info: SelectedElementInfo | null) => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;

const CanvasStage = forwardRef<CanvasStageHandle, Props>(function CanvasStage(
{ garment, colorHex, colorId, side, onSelectElement },
ref
) {
const canvasElRef = useRef<HTMLCanvasElement | null>(null);
const fabricRef = useRef<fabric.Canvas | null>(null);
const guideLinesRef = useRef<fabric.Line[]>([]);
const printAreaRectRef = useRef<fabric.Rect | null>(null);

useEffect(() => {
const canvas = new fabric.Canvas(canvasElRef.current as HTMLCanvasElement, {
width: CANVAS_WIDTH,
height: CANVAS_HEIGHT,
backgroundColor: 'transparent',
preserveObjectStacking: true,
});
fabricRef.current = canvas;

const emit = () => {
const obj = canvas.getActiveObject() as any;
if (!obj) { onSelectElement(null); return; }
onSelectElement({
  id: obj.data ? obj.data.id : '',
  kind: obj.data ? obj.data.kind : 'image',
  width: obj.width || 0,
  height: obj.height || 0,
  x: Math.round(obj.left || 0),
  y: Math.round(obj.top || 0),
  scaleX: obj.scaleX || 1,
  scaleY: obj.scaleY || 1,
  angle: Math.round(obj.angle || 0),
  opacity: obj.opacity === undefined ? 1 : obj.opacity,
  locked: !!obj.lockMovementX,
  text: obj.text,
  fontFamily: obj.fontFamily,
fontSize: obj.fontSize,
fill: obj.fill,
stroke: obj.stroke,
  strokeWidth: obj.strokeWidth,
bold: obj.fontWeight === 'bold',
italic: obj.fontStyle === 'italic',
underline: obj.underline,
align: obj.textAlign,
charSpacing: obj.charSpacing,
});
};

canvas.on('selection:created', emit);
canvas.on('selection:updated', emit);
canvas.on('selection:cleared', () => onSelectElement(null));
canvas.on('object:modified', emit);

canvas.on('object:modified', emit);

canvas.on('object:moving', (e: any) => {
const obj = e.target as fabric.Object;
if (!obj) return;
clearGuides(canvas, guideLinesRef);
const centerX = CANVAS_WIDTH / 2;
const centerY = CANVAS_HEIGHT / 2;
const objCenter = obj.getCenterPoint();
const threshold = 6;
if (Math.abs(objCenter.x - centerX) < threshold) {
obj.set({ left: centerX - ((obj.width || 0) * (obj.scaleX || 1)) / 2 });
drawGuide(canvas, guideLinesRef, [centerX, 0, centerX, CANVAS_HEIGHT]);
}
if (Math.abs(objCenter.y - centerY) < threshold) {
obj.set({ top: centerY - ((obj.height || 0) * (obj.scaleY || 1)) / 2 });
drawGuide(canvas, guideLinesRef, [0, centerY, CANVAS_WIDTH, centerY]);
}
});
canvas.on('mouse:up', () => clearGuides(canvas, guideLinesRef));

return () => {
canvas.dispose();
fabricRef.current = null;
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  const canvas = fabricRef.current;
if (!canvas) return;
const realUrl = (garment.colorImages && garment.colorImages[colorId]) ? (side === 'front' ? garment.colorImages[colorId].front : garment.colorImages[colorId].back) : '';
const url = realUrl || buildGarmentSvgDataUrl(garment.type, side, colorHex);
fabric.FabricImage.fromURL(url).then((img: any) => {
  img.set({
  left: 0,
  top: 0,
  selectable: false,
  evented: false,
  scaleX: CANVAS_WIDTH / (img.width || CANVAS_WIDTH),
  scaleY: CANVAS_HEIGHT / (img.height || CANVAS_HEIGHT),
  });
canvas.backgroundImage = img;
drawPrintAreaGuide(canvas, garment, side, printAreaRectRef);
canvas.requestRenderAll();
});
}, [garment, colorId, colorHex, side]);

useImperativeHandle(ref, () => ({
addImageFromUrl(url: string) {
const canvas = fabricRef.current;
if (!canvas) return;
fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
  const area = side === 'front' ? garment.printAreaFront : garment.printAreaBack;
img.set({
  left: area.x + area.width / 2,
  top: area.y + area.height / 2,
  originX: 'center',
  originY: 'center',
  });
const scale = Math.min((area.width * 0.8) / (img.width || 1), (area.height * 0.8) / (img.height || 1));
img.scale(scale);
img.data = { id: 'el_' + Date.now(), kind: 'image' };
canvas.add(img);
canvas.setActiveObject(img);
canvas.requestRenderAll();
});
},
addText(text: string) {
  const canvas = fabricRef.current;
if (!canvas) return;
ensureFontLoaded('Inter');
const area = side === 'front' ? garment.printAreaFront : garment.printAreaBack;
const itext = new fabric.IText(text, {
left: area.x + area.width / 2,
top: area.y + area.height / 2,
originX: 'center',
originY: 'center',
fontFamily: 'Inter',
fontSize: 32,
fill: '#ffffff',
});
(itext as any).data = { id: 'el_' + Date.now(), kind: 'text' };
canvas.add(itext);
canvas.setActiveObject(itext);
canvas.requestRenderAll();
},

duplicateSelected() {
const canvas = fabricRef.current;
const obj = canvas ? canvas.getActiveObject() : null;
if (!canvas || !obj) return;
(obj as any).clone().then((cloned: fabric.Object) => {
  cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
(cloned as any).data = { id: 'el_' + Date.now(), kind: (obj as any).data ? (obj as any).data.kind : 'image' };
canvas.add(cloned);
canvas.setActiveObject(cloned);
canvas.requestRenderAll();
});
},
deleteSelected() {
const canvas = fabricRef.current;
const obj = canvas ? canvas.getActiveObject() : null;
if (!canvas || !obj) return;
canvas.remove(obj);
canvas.requestRenderAll();
onSelectElement(null);
},
toggleLockSelected() {
const canvas = fabricRef.current;
const obj = canvas ? (canvas.getActiveObject() as any) : null;
if (!canvas || !obj) return;
const locked = !obj.lockMovementX;
obj.set({
  lockMovementX: locked,
  lockMovementY: locked,
  lockScalingX: locked,
  lockScalingY: locked,
  lockRotation: locked,
  hasControls: !locked,
  });
canvas.requestRenderAll();
},
centerSelectedH() {
const canvas = fabricRef.current;
const obj = canvas ? canvas.getActiveObject() : null;
if (!canvas || !obj) return;
canvas.centerObjectH(obj);
canvas.requestRenderAll();
},
centerSelectedV() {
const canvas = fabricRef.current;
const obj = canvas ? canvas.getActiveObject() : null;
if (!canvas || !obj) return;
canvas.centerObjectV(obj);
canvas.requestRenderAll();
},

updateSelectedProps(props: Partial<SelectedElementInfo>) {
const canvas = fabricRef.current;
const obj = canvas ? (canvas.getActiveObject() as any) : null;
if (!canvas || !obj) return;
const mapped: any = { ...props };
if (props.bold !== undefined) mapped.fontWeight = props.bold ? 'bold' : 'normal';
if (props.italic !== undefined) mapped.fontStyle = props.italic ? 'italic' : 'normal';
obj.set(mapped);
canvas.requestRenderAll();
},
exportPNG() {
const canvas = fabricRef.current;
if (!canvas) return undefined;
return canvas.toDataURL({ format: 'png', multiplier: 2 } as any);
},
getObjectsJSON() {
const canvas = fabricRef.current;
return canvas ? canvas.toJSON(['data']) : null;
},
loadObjectsJSON(json: any) {
const canvas = fabricRef.current;
if (!canvas || !json) return;
canvas.loadFromJSON(json, () => canvas.requestRenderAll());
},
clearSelection() {
if (fabricRef.current) {
fabricRef.current.discardActiveObject();
fabricRef.current.requestRenderAll();
}
},
}));

return (
   <div className="relative mx-auto" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
<canvas ref={canvasElRef} />
</div>
);
});


function clearGuides(canvas: fabric.Canvas, guidesRef: React.MutableRefObject<fabric.Line[]>) {
  guidesRef.current.forEach((l) => canvas.remove(l));
guidesRef.current = [];
}

function drawGuide(canvas: fabric.Canvas, guidesRef: React.MutableRefObject<fabric.Line[]>, coords: number[]) {
  const line = new fabric.Line(coords as any, {
stroke: '#ff7a00',
strokeWidth: 1,
selectable: false,
evented: false,
strokeDashArray: [4, 4],
});
guidesRef.current.push(line);
canvas.add(line);
canvas.bringObjectToFront ? canvas.bringObjectToFront(line) : (canvas as any).bringToFront(line);
}

function drawPrintAreaGuide(canvas: fabric.Canvas, garment: Garment, side: ViewSide, rectRef: React.MutableRefObject<fabric.Rect | null>) {
  if (rectRef.current) {
canvas.remove(rectRef.current);
rectRef.current = null;
  }
const area = side === 'front' ? garment.printAreaFront : garment.printAreaBack;
const rect = new fabric.Rect({
left: area.x,
top: area.y,
width: area.width,
height: area.height,
fill: 'transparent',
stroke: 'rgba(255,255,255,0.35)',
strokeDashArray: [6, 6],
selectable: false,
evented: false,
});
rectRef.current = rect;
canvas.add(rect);
}

export default CanvasStage;
