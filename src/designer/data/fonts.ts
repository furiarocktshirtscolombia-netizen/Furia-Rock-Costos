// Lista curada de fuentes para el editor de texto.
// Se cargan bajo demanda desde Google Fonts (link dinamico) para no penalizar
// el rendimiento inicial de la app. Se puede ampliar libremente hasta 100+.
export interface FontOption {
family: string;
category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace';
}

export const FONT_OPTIONS: FontOption[] = [
{ family: 'Inter', category: 'sans-serif' },
{ family: 'Roboto', category: 'sans-serif' },
{ family: 'Poppins', category: 'sans-serif' },
{ family: 'Montserrat', category: 'sans-serif' },
{ family: 'Oswald', category: 'sans-serif' },
{ family: 'Bebas Neue', category: 'display' },
{ family: 'Anton', category: 'display' },
{ family: 'Archivo Black', category: 'display' },
{ family: 'Rubik', category: 'sans-serif' },
{ family: 'Barlow', category: 'sans-serif' },
{ family: 'Work Sans', category: 'sans-serif' },
{ family: 'Nunito', category: 'sans-serif' },
{ family: 'Raleway', category: 'sans-serif' },
{ family: 'Lato', category: 'sans-serif' },
{ family: 'Open Sans', category: 'sans-serif' },
{ family: 'Playfair Display', category: 'serif' },
{ family: 'Merriweather', category: 'serif' },
{ family: 'Lora', category: 'serif' },
{ family: 'Bitter', category: 'serif' },
{ family: 'PT Serif', category: 'serif' },
{ family: 'Pacifico', category: 'handwriting' },
{ family: 'Caveat', category: 'handwriting' },
{ family: 'Dancing Script', category: 'handwriting' },
{ family: 'Shadows Into Light', category: 'handwriting' },
{ family: 'Permanent Marker', category: 'handwriting' },
{ family: 'Satisfy', category: 'handwriting' },
{ family: 'Great Vibes', category: 'handwriting' },
{ family: 'Amatic SC', category: 'display' },
{ family: 'Bangers', category: 'display' },
{ family: 'Righteous', category: 'display' },
{ family: 'Fjalla One', category: 'display' },
{ family: 'Passion One', category: 'display' },
{ family: 'Alfa Slab One', category: 'display' },
{ family: 'Luckiest Guy', category: 'display' },
{ family: 'Metal Mania', category: 'display' },
{ family: 'Nosifer', category: 'display' },
{ family: 'Creepster', category: 'display' },
{ family: 'Special Elite', category: 'display' },
{ family: 'Press Start 2P', category: 'monospace' },
{ family: 'Space Mono', category: 'monospace' },
{ family: 'JetBrains Mono', category: 'monospace' },
{ family: 'Roboto Mono', category: 'monospace' },
{ family: 'Kanit', category: 'sans-serif' },
{ family: 'Teko', category: 'display' },
{ family: 'Staatliches', category: 'display' },
{ family: 'Russo One', category: 'display' },
{ family: 'Orbitron', category: 'display' },
{ family: 'Black Ops One', category: 'display' },
{ family: 'Fredoka', category: 'display' },
{ family: 'Baloo 2', category: 'display' },
{ family: 'Comfortaa', category: 'display' },
{ family: 'Quicksand', category: 'sans-serif' },
{ family: 'Josefin Sans', category: 'sans-serif' },
{ family: 'Cabin', category: 'sans-serif' },
{ family: 'Karla', category: 'sans-serif' },
{ family: 'Titillium Web', category: 'sans-serif' },
{ family: 'Ubuntu', category: 'sans-serif' },
{ family: 'Zilla Slab', category: 'serif' },
{ family: 'Abril Fatface', category: 'display' },
{ family: 'Caveat Brush', category: 'handwriting' },
{ family: 'Indie Flower', category: 'handwriting' },
];

const loadedFonts = new Set<string>();

export function ensureFontLoaded(family: string): void {
if (loadedFonts.has(family)) return;
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;500;700;900&display=swap`;
document.head.appendChild(link);
loadedFonts.add(family);
}
