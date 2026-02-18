
export type Category = 'Niño' | 'Adulto';

export interface ProductReference {
  id: string;
  name: string;
  baseCost: number;
  description?: string;
}

export interface QuoteInputs {
  clientName: string;
  quantity: number;
  referencia: string;
  categoria: Category;
  talla: string;
  color: string; // Added color selection
  cmEstampado: number;
  cmCorazon: number;
  qtyPlanchado: number;
  costoEmpaque: number;
}

export interface QuoteResults {
  costoBase: number;
  costoEstampado: number;
  costoCorazon: number;
  costoPlanchado: number;
  costoEmpaque: number;
  costoTotal: number;
  precioUnidad: number;
  precioTotal: number;
  ganancia: number;
  margen: number;
}
