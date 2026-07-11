// Utilidades de medicion real (cm) y validacion de resolucion para impresion DTG.
// Funciones puras, sin dependencias de Fabric.js, para poder reutilizarlas y
// probarlas facilmente desde cualquier componente del Disenador.
import { PrintArea } from '../types';
import { DPI_EXCELENTE, DPI_ACEPTABLE, DPI_REGULAR } from '../config';

export interface ElementPixelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RealMeasurements {
  widthCm: number;
  heightCm: number;
  areaUsedCm2: number;
  areaMaxCm2: number;
  areaRemainingCm2: number;
  distTopCollarCm: number;
  distBottomCm: number;
  distLeftCm: number;
  distRightCm: number;
  outOfBounds: boolean;
}

export function getPxPerCm(area: PrintArea): number {
  const pxPerCmX = area.width / area.maxWidthCm;
  const pxPerCmY = area.height / area.maxHeightCm;
  return (pxPerCmX + pxPerCmY) / 2;
}

export function pxToCm(px: number, pxPerCm: number): number {
  if (!pxPerCm) return 0;
  return px / pxPerCm;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeRealMeasurements(box: ElementPixelBox, area: PrintArea): RealMeasurements {
  const pxPerCm = getPxPerCm(area);
  const widthCm = pxToCm(box.width, pxPerCm);
  const heightCm = pxToCm(box.height, pxPerCm);
  const areaUsedCm2 = widthCm * heightCm;
  const areaMaxCm2 = area.maxWidthCm * area.maxHeightCm;

const distLeftPx = box.left - area.x;
  const distRightPx = (area.x + area.width) - (box.left + box.width);
  const distTopPx = box.top - area.y;
  const distBottomPx = (area.y + area.height) - (box.top + box.height);

const distLeftCm = pxToCm(distLeftPx, pxPerCm);
  const distRightCm = pxToCm(distRightPx, pxPerCm);
  const distBottomCm = pxToCm(distBottomPx, pxPerCm);
  const distTopCollarCm = area.collarOffsetCm + pxToCm(distTopPx, pxPerCm);

const outOfBounds = distLeftPx < -0.01 || distRightPx < -0.01 || distTopPx < -0.01 || distBottomPx < -0.01;

return {
  widthCm: round2(widthCm),
  heightCm: round2(heightCm),
  areaUsedCm2: round2(areaUsedCm2),
  areaMaxCm2: round2(areaMaxCm2),
  areaRemainingCm2: round2(Math.max(0, areaMaxCm2 - areaUsedCm2)),
  distTopCollarCm: round2(distTopCollarCm),
  distBottomCm: round2(distBottomCm),
  distLeftCm: round2(distLeftCm),
  distRightCm: round2(distRightCm),
  outOfBounds,
};
}

export type DpiRating = 'excelente' | 'aceptable' | 'regular' | 'no_recomendado';

export interface DpiInfo {
  dpiEffective: number;
  rating: DpiRating;
  label: string;
}

export function computeDpiInfo(naturalWidthPx: number, printWidthCm: number): DpiInfo {
  const widthInches = printWidthCm / 2.54;
  const dpiEffective = widthInches > 0 ? naturalWidthPx / widthInches : 0;
  let rating: DpiRating = 'no_recomendado';
  let label = 'No recomendado';
  if (dpiEffective >= DPI_EXCELENTE) {
    rating = 'excelente';
    label = 'Excelente';
  } else if (dpiEffective >= DPI_ACEPTABLE) {
    rating = 'aceptable';
    label = 'Aceptable';
  } else if (dpiEffective >= DPI_REGULAR) {
    rating = 'regular';
    label = 'Regular';
  }
  return { dpiEffective: Math.round(dpiEffective), rating, label };
}
