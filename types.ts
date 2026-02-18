
export type Category = 'Niño' | 'Adulto';

export interface ProductReference {
  id: string;
  name: string;
  baseCost: number;
  description?: string;
}

export interface QuoteItem {
  id: string;
  product: ProductReference;
  categoria: Category;
  talla: string;
  colorCamiseta: string;
  colorBermuda: string;
  cmEstampado: number;
  cmCorazon: number;
  qtyPlanchado: number;
  costoEmpaque: number;
  quantity: number;
  results: QuoteResults;
}

export interface QuoteInputs {
  clientName: string;
  quantity: number;
  referencia: string;
  categoria: Category;
  talla: string;
  colorCamiseta: string;
  colorBermuda: string;
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
