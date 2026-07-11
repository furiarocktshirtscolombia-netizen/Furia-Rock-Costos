// Aplica a data/products.ts los valores de area de impresion DTG (en cm)
// obtenidos desde la hoja "AreasDTG" de Google Sheets. Esto permite que un
// administrador edite ancho/alto/collar por prenda y lado sin tocar codigo.
// Si no hay overrides (fetch fallido o hoja vacia) se devuelven las prendas
// sin cambios, usando los valores por defecto ya definidos en products.ts.
import { Garment } from '../types';

export interface AreaDTGRecord {
  garmentId: string;
  lado: 'front' | 'back';
  maxWidthCm: number;
  maxHeightCm: number;
  collarOffsetCm: number;
}

export function applyAreaOverrides(garments: Garment[], areas: AreaDTGRecord[] | undefined | null): Garment[] {
  if (!areas || areas.length === 0) return garments;

  const byKey = new Map<string, AreaDTGRecord>();
  areas.forEach((a) => {
    if (!a || !a.garmentId || !a.lado) return;
    byKey.set(a.garmentId + ':' + a.lado, a);
  });

  return garments.map((g) => {
    const front = byKey.get(g.id + ':front');
    const back = byKey.get(g.id + ':back');
    if (!front && !back) return g;
    return {
      ...g,
      printAreaFront: front
        ? { ...g.printAreaFront, maxWidthCm: front.maxWidthCm, maxHeightCm: front.maxHeightCm, collarOffsetCm: front.collarOffsetCm }
        : g.printAreaFront,
      printAreaBack: back
        ? { ...g.printAreaBack, maxWidthCm: back.maxWidthCm, maxHeightCm: back.maxHeightCm, collarOffsetCm: back.collarOffsetCm }
        : g.printAreaBack,
    };
  });
}
