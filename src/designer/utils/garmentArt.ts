// Generador de silueta de prenda (mockup placeholder).
// Colorea un SVG en tiempo real segun el color elegido, sin afectar el diseno.
// Fase posterior: sustituir por mockups fotograficos (imageFront/imageBack).
import { GarmentType, ViewSide } from '../types';

export type SilhouetteKind = 'tshirt' | 'hoodie' | 'tank';

export function getSilhouetteKind(type: GarmentType): SilhouetteKind {
  if (type === 'hoodie' || type === 'sudadera') return 'hoodie';
  if (type === 'tank_top') return 'tank';
  return 'tshirt';
}

function bodyPath(kind: SilhouetteKind, side: ViewSide): string {
  if (kind === 'tank') {
    return 'M160,40 L170,18 L230,18 L240,40 L240,120 L300,130 L300,460 L100,460 L100,130 L160,120 Z';
  }
  if (side === 'front') {
    return 'M100,60 L150,20 L175,55 L200,35 L225,55 L250,20 L300,60 L360,110 L330,150 L300,130 L300,460 L100,460 L100,130 L70,150 L40,110 Z';
  }
  return 'M100,60 L150,25 L200,40 L250,25 L300,60 L360,110 L330,150 L300,130 L300,460 L100,460 L100,130 L70,150 L40,110 Z';
}

function hoodPath(): string {
  return 'M140,26 C160,-18 240,-18 260,26 L248,54 C225,30 175,30 152,54 Z';
}

function pocketPath(): string {
  return 'M150,330 Q200,352 250,330 L250,380 Q200,398 150,380 Z';
}

export function buildGarmentSvgDataUrl(type: GarmentType, side: ViewSide, colorHex: string): string {
  const kind = getSilhouetteKind(type);
  const parts: string[] = [];
  parts.push('<path d="' + bodyPath(kind, side) + '" fill="' + colorHex + '" stroke="rgba(0,0,0,0.25)" stroke-width="2" />');
  if (kind === 'hoodie') {
    parts.push('<path d="' + hoodPath() + '" fill="' + colorHex + '" stroke="rgba(0,0,0,0.25)" stroke-width="2" />');
    if (side === 'front') {
      parts.push('<path d="' + pocketPath() + '" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2" />');
    }
  }
  const shading = '<rect x="0" y="0" width="400" height="500" fill="url(#shade)" />';
  const defs = '<defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#000000" stop-opacity="0.08" />' +
    '<stop offset="0.5" stop-color="#ffffff" stop-opacity="0.05" />' +
    '<stop offset="1" stop-color="#000000" stop-opacity="0.12" /></linearGradient></defs>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">' +
    defs + parts.join('') + shading + '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
