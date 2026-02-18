import { ProductReference } from './types';

export const PRODUCT_REFERENCES_INITIAL: ProductReference[] = [
  {
    id: 'cam-basic',
    name: 'Camiseta Algodón Premium',
    baseCost: 15000,
    description: 'Camiseta 100% algodón.'
  },
  {
    id: 'set-rock',
    name: 'Conjunto Rockero Pro',
    baseCost: 35000,
    description: 'Camiseta + Bermuda.'
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

export const COLORES_CAMISETA = [
  "Blanco", "Negro", "Arena", "Rojo", "Verde",
  "Acid Wash Café", "Acid Wash Negro", "Acid Wash Verde", "Acid Wash Azul", "Acid Wash Gris"
];

export const COLORES_BERMUDA = [
  "Blanco", "Negro", "Gris Oscuro", "Gris Claro", "Azul Rey", "Palo de Rosa", "Guayaba",
  "Azul Cielo", "Azul Oscuro", "Lila", "Verde Antioquia", "Camel", "Fucsia", "Fantasía",
  "Verde Oliva", "Café"
];

export const COLOR_HEX: Record<string, string> = {
  "Blanco": "#F5F6F7", "Negro": "#0F1115", "Arena": "#D8C3A5", "Rojo": "#D62828", "Verde": "#118A5A",
  "Café": "#6F4E37", "Gris Oscuro": "#4B4F57", "Gris Claro": "#C9CDD3",
  "Azul Rey": "#1F5EFF", "Azul Cielo": "#69B9FF", "Azul Oscuro": "#102A56",
  "Palo de Rosa": "#D6A3B5", "Guayaba": "#FF6F91", "Lila": "#B39DDB",
  "Verde Antioquia": "#1E8E3E", "Camel": "#C19A6B", "Fucsia": "#E81E8C", "Fantasía": "#8E44AD",
  "Verde Oliva": "#556B2F",
  "Acid Wash Café": "#6F4E37", "Acid Wash Negro": "#1B1E24", "Acid Wash Verde": "#1F6F4A",
  "Acid Wash Azul": "#2C6FB7", "Acid Wash Gris": "#6E7580"
};

export const COSTO_CM2 = 170; 
export const COSTO_PLANCHADO = 1000;
export const COSTO_EMPAQUE = 1300;
export const GANANCIA_NINO = 35000;
export const GANANCIA_ADULTO = 30000;
export const GANANCIA_FIJA = 30000; // Legacy if needed