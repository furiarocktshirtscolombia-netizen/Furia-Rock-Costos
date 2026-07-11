// Catalogo de prendas de ejemplo (mock).
// En produccion, sincronizar con la hoja de Productos de Furia Rock via Google Apps Script.
import { Garment, GarmentColorOption } from '../types';

export const GARMENT_COLORS: GarmentColorOption[] = [
{ id: 'negro', name: 'Negro', hex: '#111111' },
{ id: 'blanco', name: 'Blanco', hex: '#ffffff' },
{ id: 'rojo', name: 'Rojo', hex: '#d92b2b' },
{ id: 'azul', name: 'Azul', hex: '#1e3a8a' },
{ id: 'verde', name: 'Verde', hex: '#166534' },
{ id: 'gris', name: 'Gris', hex: '#6b7280' },
{ id: 'rosado', name: 'Rosado', hex: '#f472b6' },
{ id: 'amarillo', name: 'Amarillo', hex: '#facc15' },
{ id: 'beige', name: 'Beige', hex: '#e7d7c1' },
{ id: 'morado', name: 'Morado', hex: '#7c3aed' },
];

const SIZES_ADULTO = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SIZES_NINO = ['4', '6', '8', '10', '12', '14'];

export const GARMENTS: Garment[] = [
{
id: 'g1', name: 'Camiseta Unisex Algodon Peruano', type: 'camiseta_unisex',
brand: 'Furia Rock', reference: 'CU-178', colors: GARMENT_COLORS, sizes: SIZES_ADULTO,
printAreaFront: { x: 130, y: 110, width: 240, height: 300 },
printAreaBack: { x: 130, y: 100, width: 240, height: 300 },
imageFront: '', imageBack: '', cost: 19500, price: 45000, stock: 120, status: 'activo',
},
{
id: 'g2', name: 'Camiseta Oversize', type: 'oversize',
brand: 'Furia Rock', reference: 'OV-200', colors: GARMENT_COLORS, sizes: SIZES_ADULTO,
printAreaFront: { x: 120, y: 120, width: 260, height: 320 },
printAreaBack: { x: 120, y: 110, width: 260, height: 320 },
imageFront: '', imageBack: '', cost: 27500, price: 58000, stock: 80, status: 'activo',
},
{
id: 'g3', name: 'Camiseta Infantil Algodon Peruano', type: 'infantil',
brand: 'Furia Rock', reference: 'INF-20', colors: GARMENT_COLORS, sizes: SIZES_NINO,
printAreaFront: { x: 140, y: 100, width: 180, height: 220 },
printAreaBack: { x: 140, y: 95, width: 180, height: 220 },
imageFront: '', imageBack: '', cost: 25500, price: 42000, stock: 60, status: 'activo',
},
{
id: 'g4', name: 'Hoodie Peruano 400g', type: 'hoodie',
brand: 'Furia Rock', reference: 'HD-400', colors: GARMENT_COLORS, sizes: SIZES_ADULTO,
printAreaFront: { x: 130, y: 150, width: 240, height: 260 },
printAreaBack: { x: 120, y: 110, width: 260, height: 320 },
imageFront: '', imageBack: '', cost: 83500, price: 135000, stock: 40, status: 'activo',
},
{
id: 'g5', name: 'Polo Clasico', type: 'polo',
brand: 'Furia Rock', reference: 'PL-01', colors: GARMENT_COLORS, sizes: SIZES_ADULTO,
printAreaFront: { x: 150, y: 140, width: 180, height: 220 },
printAreaBack: { x: 130, y: 100, width: 240, height: 280 },
imageFront: '', imageBack: '', cost: 28500, price: 62000, stock: 50, status: 'activo',
},
{
id: 'g6', name: 'Sudadera Perchada', type: 'sudadera',
brand: 'Furia Rock', reference: 'SD-01', colors: GARMENT_COLORS, sizes: SIZES_ADULTO,
printAreaFront: { x: 130, y: 140, width: 240, height: 260 },
printAreaBack: { x: 120, y: 110, width: 260, height: 320 },
imageFront: '', imageBack: '', cost: 45000, price: 89000, stock: 45, status: 'activo',
},
{
id: 'g7', name: 'Tank Top', type: 'tank_top',
brand: 'Furia Rock', reference: 'TT-01', colors: GARMENT_COLORS, sizes: SIZES_ADULTO,
printAreaFront: { x: 140, y: 130, width: 200, height: 260 },
printAreaBack: { x: 140, y: 120, width: 200, height: 280 },
imageFront: '', imageBack: '', cost: 17500, price: 38000, stock: 70, status: 'activo',
},
];

export function getGarmentById(id: string): Garment | undefined {
return GARMENTS.find((g) => g.id === id);
}
<
