
export type Category = 'Niño' | 'Adulto';

export interface ProductReference {
  id: string;
  name: string;
  baseCost: number; // Single base cost from Excel
  description?: string;
}

export interface QuoteInputs {
  referencia: string;
  categoria: Category;
  talla: string;
  cmEstampado: number;
  cmCorazon: number;
  qtyPlanchado: number; // Added quantity for ironing
}

export interface QuoteResults {
  costoBase: number;
  costoEstampado: number;
  costoCorazon: number;
  costoPlanchado: number;
  costoEmpaque: number;
  costoTotal: number;
  precioSugerido: number;
  ganancia: number;
  margen: number;
}
