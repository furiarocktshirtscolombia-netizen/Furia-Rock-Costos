
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

export interface Sale {
  id: string;
  fecha: string;
  cliente: string;
  referencia: string;
  categoria: Category;
  talla: string;
  colorCamiseta: string;
  colorBermuda: string;
  cantidad: number;
  precioUnitario: number;
  totalVenta: number;
  costoTotal: number;
  ganancia: number;
  metodoPago: string;
  estado: 'Pagado' | 'Pendiente' | 'Entregado';
  observaciones: string;
}

export interface Purchase {
  id: string;
  fecha: string;
  proveedor: string;
  tipoCompra: string;
  producto: string;
  categoria: string;
  cantidad: number;
  valorUnitario: number;
  totalCompra: number;
  formaPago: string;
  observaciones: string;
}
