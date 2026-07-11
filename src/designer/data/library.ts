// Biblioteca de elementos de ejemplo (mock).
// En produccion, estos datos se administran desde el panel admin y se guardan
// en la hoja "BibliotecaDisenos" via Google Apps Script (o storage de archivos).
import { LibraryCategory, LibraryItem } from '../types';

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  { id: 'disenos', label: 'Disenos', icon: 'Palette' },
  { id: 'logos', label: 'Logos', icon: 'Shapes' },
  { id: 'dinosaurios', label: 'Dinosaurios', icon: 'Bone' },
  { id: 'carros', label: 'Carros', icon: 'Car' },
  { id: 'rock', label: 'Rock', icon: 'Guitar' },
  { id: 'infantil', label: 'Infantil', icon: 'Baby' },
  { id: 'anime', label: 'Anime', icon: 'Sparkles' },
  { id: 'deportes', label: 'Deportes', icon: 'Trophy' },
  { id: 'profesiones', label: 'Profesiones', icon: 'Briefcase' },
  { id: 'frases', label: 'Frases', icon: 'Type' },
  { id: 'formas', label: 'Formas', icon: 'Shapes' },
  { id: 'stickers', label: 'Stickers', icon: 'Sticker' },
  ];

function item(id: string, name: string, category: LibraryItem['category'], tags: string[], popularity: number): LibraryItem {
  const seed = encodeURIComponent(name);
  return {
    id, name, category, tags, popularity,
    thumbnailUrl: `https://placehold.co/160x160/1a1d24/ff7a00?text=${seed}`,
    fileUrlPng: `https://placehold.co/600x600/transparent/ff7a00?text=${seed}`,
    createdAt: '2026-01-15',
    status: 'activo',
  };
}

export const LIBRARY_ITEMS: LibraryItem[] = [
  item('l1', 'Calavera Rockera', 'rock', ['rock', 'metal', 'calavera'], 98),
  item('l2', 'Guitarra Electrica', 'rock', ['rock', 'guitarra'], 91),
  item('l3', 'T-Rex', 'dinosaurios', ['dinosaurio', 'trex'], 80),
  item('l4', 'Triceratops', 'dinosaurios', ['dinosaurio'], 70),
  item('l5', 'Auto Clasico', 'carros', ['auto', 'clasico'], 60),
  item('l6', 'Auto Deportivo', 'carros', ['auto', 'carreras'], 55),
  item('l7', 'Logo Circular', 'logos', ['logo', 'redondo'], 88),
  item('l8', 'Logo Escudo', 'logos', ['logo', 'escudo'], 75),
  item('l9', 'Osito Tierno', 'infantil', ['infantil', 'oso'], 65),
  item('l10', 'Unicornio', 'infantil', ['infantil', 'unicornio'], 72),
  item('l11', 'Personaje Anime', 'anime', ['anime', 'personaje'], 84),
  item('l12', 'Ojos Anime', 'anime', ['anime'], 50),
  item('l13', 'Balon de Futbol', 'deportes', ['deporte', 'futbol'], 77),
  item('l14', 'Pesas Gimnasio', 'deportes', ['deporte', 'gym'], 45),
  item('l15', 'Doctor', 'profesiones', ['profesion', 'salud'], 40),
  item('l16', 'Chef', 'profesiones', ['profesion', 'cocina'], 38),
  item('l17', 'Frase Motivacional', 'frases', ['frase', 'motivacion'], 95),
  item('l18', 'Frase Rock and Roll', 'frases', ['frase', 'rock'], 90),
  item('l19', 'Estrella', 'formas', ['forma', 'estrella'], 60),
  item('l20', 'Corazon', 'formas', ['forma', 'corazon'], 68),
  item('l21', 'Sticker Fuego', 'stickers', ['sticker', 'fuego'], 82),
  item('l22', 'Sticker Rayo', 'stickers', ['sticker', 'rayo'], 79),
  ];

export function getLibraryItemsByCategory(categoryId: string): LibraryItem[] {
  return LIBRARY_ITEMS.filter((i) => i.category === categoryId);
}

export function searchLibraryItems(query: string): LibraryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return LIBRARY_ITEMS;
  return LIBRARY_ITEMS.filter((i) =>
                              i.name.toLowerCase().includes(q) || i.tags.some((t) => t.toLowerCase().includes(q))
                              );
}
