
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
  colorInferior: string;
  gramaje: string;
  diseno: string;
  tipoImpresion: '' | 'DTG' | 'DTF';
  costoImpresion: number;
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
  colorInferior: string;
  gramaje: string;
  diseno: string;
  tipoImpresion: '' | 'DTG' | 'DTF';
  costoImpresion: number;
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
  costoImpresion: number;
  costoTotal: number;
  precioUnidad: number;
  precioTotal: number;
  ganancia: number;
  margen: number;
}

export interface Client {
  id: string;
  nombre: string;
  telefono: string;
  ciudad: string;
  direccion: string;
  notas: string;
}

export interface Invoice {
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  total: number;
  estado: 'Pagada' | 'Pendiente' | 'Anulada';
  pdfUrl?: string;
}

export interface Sale {
  id: string | number;
  invoiceNumber: string;
  fecha: string;
  cliente: string;
  referencia: string;
  categoria: Category;
  talla: string;
  colorCamiseta: string;
  colorInferior: string;
  gramaje?: string;
  diseno?: string;
  tipoImpresion?: '' | 'DTG' | 'DTF';
  costoImpresion?: number;
  cantidad: number;
  precioVentaUnitario: number;
  costoUnitario: number;
  totalVenta: number;
  costoTotal: number;
  ganancia: number;
  metodoPago: string;
  estado: 'Pagado' | 'Pendiente' | 'Entregado';
  observaciones: string;
}

export interface Purchase {
  id: string | number;
  fecha: string;
  proveedor: string;
  referencia: string;
  producto: string;
  categoria: string;
  talla: string;
  color: string;
  cantidad: number;
  valorUnitario: number;
  totalCompra: number;
  observaciones: string;
}

export interface InventoryItem {
  referencia: string;
  producto: string;
  categoria: string;
  talla: string;
  color: string;
  cantidadComprada: number;
  cantidadVendida: number;
  stockActual: number;
  costoPromedioCompra: number;
  valorTotalInventario: number;
}
