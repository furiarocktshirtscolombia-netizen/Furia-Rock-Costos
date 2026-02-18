
export type Category = 'Niño' | 'Adulto';

export interface ProductReference {
  id: string;
  name: string;
  baseCost: number;
  description?: string;
}

export interface QuoteInputs {
  referencia: string;
  categoria: Category;
  talla: string;
  cmEstampado: number;
  cmCorazon: number;
  qtyPlanchado: number;
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
