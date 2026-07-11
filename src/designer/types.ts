// Furia Rock Designer - definiciones de tipos centrales del modulo
// Este modulo es aditivo: no modifica la logica existente del Cotizador.

export type ViewSide = 'front' | 'back';

export type GarmentType =
    | 'camiseta_unisex'
| 'oversize'
| 'infantil'
| 'hoodie'
| 'polo'
| 'sudadera'
| 'tank_top';

export interface GarmentColorOption {
    id: string;
    name: string;
    hex: string;
}

export interface PrintArea {
    x: number;
    y: number;
    width: number;
    height: number;
    maxWidthCm: number;
    maxHeightCm: number;
    collarOffsetCm: number;
}

export interface Garment {
    id: string;
    name: string;
    type: GarmentType;
    brand: string;
    reference: string;
    colors: GarmentColorOption[];
    sizes: string[];
    printAreaFront: PrintArea;
    printAreaBack: PrintArea;
    imageFront: string;
    imageBack: string;
    cost: number;
    price: number;
    stock: number;
    status: 'activo' | 'inactivo';
}

export type LibraryCategoryId =
    | 'disenos'
| 'logos'
| 'dinosaurios'
| 'carros'
| 'rock'
| 'infantil'
| 'anime'
| 'deportes'
| 'profesiones'
| 'frases'
| 'formas'
| 'stickers';

export interface LibraryCategory {
    id: LibraryCategoryId;
    label: string;
    icon: string;
}

export interface LibraryItem {
    id: string;
    name: string;
    category: LibraryCategoryId;
    tags: string[];
    thumbnailUrl: string;
    fileUrlPng: string;
    fileUrlSvg?: string;
    popularity: number;
    createdAt: string;
    status: 'activo' | 'inactivo';
}

export type DesignElementType = 'image' | 'text';

export interface BaseDesignElement {
    id: string;
    type: DesignElementType;
    side: ViewSide;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    opacity: number;
    locked: boolean;
}

export interface ImageDesignElement extends BaseDesignElement {
    type: 'image';
    src: string;
    originalWidth: number;
    originalHeight: number;
}

export interface TextDesignElement extends BaseDesignElement {
    type: 'text';
    text: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    uppercase: boolean;
    align: 'left' | 'center' | 'right';
    letterSpacing: number;
    curve: number;
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
}

export type DesignElement = ImageDesignElement | TextDesignElement;

export interface DesignState {
    id: string;
    name: string;
    garmentId: string;
    colorId: string;
    size: string;
    elementsFront: DesignElement[];
    elementsBack: DesignElement[];
    updatedAt: string;
}

export interface CartItem {
    id: string;
    garmentId: string;
    garmentName: string;
    colorId: string;
    colorName: string;
    size: string;
    quantity: number;
    unitPrice: number;
    designId: string;
    previewUrl: string;
    cliente: string;
    observaciones: string;
}

export interface ProductionOrderPayload {
    cliente: string;
    telefono?: string;
    garmentId: string;
    garmentRef: string;
    colorId: string;
    size: string;
    quantity: number;
    price: number;
    designId: string;
    previewFrontUrl: string;
    previewBackUrl: string;
    printFileUrl: string;
    observaciones: string;
}
