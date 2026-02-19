import { ProductReference } from './types';

export const PRODUCT_REFERENCES_INITIAL: ProductReference[] = [
  { id: 'cam-c4', name: 'Camiseta C4', baseCost: 19000 },
  { id: 'cam-randy', name: 'Camiseta Randy', baseCost: 27000 },
  { id: 'cam-per-a', name: 'Camiseta Peruana', baseCost: 37000 },
  { id: 'cam-catar', name: 'Camiseta Catar', baseCost: 35000 },
  { id: 'cam-per-n', name: 'Camiseta Niño Peruana', baseCost: 23500 },
  { id: 'cam-acid-n', name: 'Camiseta Niño Acid Wash', baseCost: 23500 },
  { id: 'cam-nac-n', name: 'Camiseta Niño 100% Nacional', baseCost: 14000 },
  { id: 'set-per-b', name: 'Conjunto Niño Camiseta Peruana y Bermuda 100% Algodón', baseCost: 37000 },
  { id: 'set-acid-b', name: 'Conjunto Niño Camiseta Acid Wash y Bermuda 100% Algodón', baseCost: 37000 },
  { id: 'set-nac-b', name: 'Conjunto Niño Camiseta Bermuda 100% Algodón Nacional', baseCost: 27500 },
  { id: 'set-per-j', name: 'Conjunto Niño Camiseta Peruana y Jogger 100% Algodón', baseCost: 43000 },
  { id: 'set-acid-j', name: 'Conjunto Niño Camiseta Acid Wash y Jogger 100% Algodón', baseCost: 43000 },
  { id: 'set-nac-j', name: 'Conjunto Niño Camiseta Jogger 100% Algodón Nacional', baseCost: 33500 }
];

export const TALLAS_NINO = ['2', '4', '6', '8', '10', '12', '14', '16'];
export const TALLAS_ADULTO = ['S', 'M', 'L', 'XL', 'XXL'];

export const COLORES_CAMISETA = [
  "No aplica", "Blanco", "Negro", "Arena", "Rojo", "Verde", "Café",
  "Acid Wash Café", "Acid Wash Negro", "Acid Wash Verde", "Acid Wash Azul", "Acid Wash Gris"
];

export const COLORES_BERMUDA = [
  "No aplica", "Blanco", "Negro", "Gris Oscuro", "Gris Claro", "Azul Rey", "Palo de Rosa", "Guayaba",
  "Azul Cielo", "Azul Oscuro", "Lila", "Verde Antioquia", "Camel", "Fucsia", "Fantasía",
  "Verde Oliva", "Café"
];

export const COSTO_CM2 = 170; 
export const COSTO_PLANCHADO = 1000;
export const COSTO_EMPAQUE = 1300;
export const GANANCIA_NINO = 35000;
export const GANANCIA_ADULTO = 30000;
