
import { ProductReference } from './types';

export const PRODUCT_REFERENCES_INITIAL: ProductReference[] = [
  {
    id: 'cam-basic',
    name: 'Camiseta Algodón Premium',
    baseCost: 15000,
    description: 'Camiseta 100% algodón.'
  },
  {
    id: 'hoodie-rock',
    name: 'Hoodie Rockero',
    baseCost: 45000,
    description: 'Saco con capota.'
  }
];

export const TALLAS_NINO = ['2', '4', '6', '8', '10', '12', '14', '16'];
export const TALLAS_ADULTO = ['S', 'M', 'L', 'XL', 'XXL'];

export const COSTO_CM2 = 170; 
export const COSTO_PLANCHADO = 1000;
export const COSTO_EMPAQUE = 1300;
export const GANANCIA_FIJA = 30000;
