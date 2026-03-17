import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { QuoteInputs, QuoteResults, ProductReference, QuoteItem, Sale, Purchase } from './types';
import { 
  PRODUCT_REFERENCES_INITIAL, 
  TALLAS_NINO, 
  TALLAS_ADULTO, 
  COLORES_CAMISETA,
  COLORES_BERMUDA,
  COSTO_CM2, 
  COSTO_PLANCHADO,
  COSTO_EMPAQUE,
  GANANCIA_NINO,
  GANANCIA_ADULTO,
  METODOS_PAGO
} from './constants';
import Navigation from './src/components/Navigation';
import Ventas from './src/components/Ventas';
import Compras from './src/components/Compras';
import Dashboard from './src/components/Dashboard';
import Inventarios from './src/components/Inventarios';
import { 
  FileUp,
  Download,
  MessageSquare,
  User,
  Plus,
  Trash2,
  ShoppingCart,
  LayoutGrid,
  Target,
  Zap,
  Info,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

// URL GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbxGsiFcP3sIWSdHsB3CGG9SanXFTVFHgOSmrQv-6Gx5U-ggHQL9PaS9JOMh6JxwPMMW/exec";

// FUNCIÓN GUARDAR VENTA
async function guardarVentaEnSheets(venta: any) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        accion: "guardarVenta",
        ...venta
      })
    });
  } catch (err) {
    console.error("Error guardando venta:", err);
  }
}

// FUNCIÓN GUARDAR COMPRA
async function guardarCompraEnSheets(compra: any) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        accion: "guardarCompra",
        ...compra
      })
    });
  } catch (err) {
    console.error("Error guardando compra:", err);
  }
}

const LOGO_FURIA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/%3E%3C/svg%3E";
const LOGO_COCO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M8 14s1.5 2 4 2 4-2 4-2'/%3E%3Cline x1='9' y1='9' x2='9.01' y2='9'/%3E%3Cline x1='15' y1='9' x2='15.01' y2='9'/%3E%3C/svg%3E";

const PLANTILLA_CUENTA_COBRO = "/plantilla-cuenta-cobro.png";

const DATOS_COBRO = {
  empresa: "FURIA ROCK T-SHIRTS",
  beneficiario: "Sebastian Crimson",
  nequi: "31285854503",
  llave: "31285854503"
};

function formatCOPDocumento(value: number) {
  return "$" + Math.round(Number(value || 0)).toLocaleString("es-CO");
}

function formatFechaDocumento(fecha?: string) {
  const d = fecha ? new Date(fecha) : new Date();
  return d.toLocaleDateString("es-CO");
}

function loadImageAsDataURL(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

type PdfDocumentoItem = {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
};

function construirDescripcionDocumento(item: {
  colorCamiseta?: string;
  talla?: string;
  product?: { name: string };
  gramaje?: string;
  diseno?: string;
  tipoImpresion?: string;
}) {
  const color = item.colorCamiseta && item.colorCamiseta !== "No aplica" ? item.colorCamiseta : "";
  const gramaje = item.gramaje || "";
  const talla = item.talla || "";
  const diseno = item.diseno ? `Diseño ${item.diseno}` : "";
  const tipo = item.tipoImpresion || "";
  const nombre = item.product?.name || "";
  
  return [color, gramaje, talla, diseno, tipo, nombre].filter(Boolean).join(" ");
}

async function generarPdfPlantillaExacta(params: {
  tipo: "cuenta_cobro" | "factura_venta";
  fecha?: string;
  cliente?: string;
  numeroFactura?: string | null;
  observaciones?: string;
  items: PdfDocumentoItem[];
}) {
  // @ts-ignore
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert("No se detectó jsPDF");
    return;
  }

  let bg = "";
  try {
    bg = await loadImageAsDataURL(PLANTILLA_CUENTA_COBRO);
  } catch (e) {
    console.error("No se pudo cargar la plantilla, usando fondo blanco", e);
  }

  const doc = new jsPDF("l", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fondo plantilla
  if (bg) {
    doc.addImage(bg, "PNG", 0, 0, pageWidth, pageHeight);
  } else {
    // Fallback header oscuro si no hay imagen
    doc.setFillColor(20, 20, 25);
    doc.rect(0, 0, pageWidth, 50, 'F');
  }

  const fecha = formatFechaDocumento(params.fecha);
  const total = params.items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);

  // ===== DATOS SUPERIORES =====
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  // Fecha izquierda
  doc.text("Fecha:", 24, 23);
  doc.setFont("helvetica", "normal");
  doc.text(fecha, 24, 31);

  // Consignar a izquierda
  doc.setFont("helvetica", "bold");
  doc.text("Consignar a:", 24, 44);
  doc.setFont("helvetica", "normal");
  doc.text(`Nequi ${DATOS_COBRO.nequi}`, 54, 44);

  // Llave derecha
  doc.setFont("helvetica", "bold");
  doc.text("Llave:", 182, 23);
  doc.setFont("helvetica", "normal");
  doc.text(`Nequi ${DATOS_COBRO.nequi}`, 182, 31);
  doc.text(`Llave: ${DATOS_COBRO.llave}`, 182, 44);

  // ===== TÍTULO CENTRAL =====
  doc.setTextColor(30, 30, 30);
  doc.setFont("times", "normal");
  doc.setFontSize(26);

  const titulo = params.tipo === "factura_venta" ? "FACTURA DE VENTA" : "CUENTA DE COBRO";
  doc.text(titulo, pageWidth / 2, 82, { align: "center" });

  if (params.tipo === "factura_venta" && params.numeroFactura) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Factura N° ${params.numeroFactura}`, 245, 70, { align: "right" });
  }

  // ===== TABLA MANUAL =====
  const startX = 22;
  const startY = 96;
  const rowH = 12;
  const colDesc = 126;
  const colCant = 25;
  const colUnit = 38;
  const colSub = 38;

  // Encabezado tabla
  doc.setFillColor(35, 35, 35);
  doc.rect(startX, startY, colDesc, rowH, "F");
  doc.rect(startX + colDesc, startY, colCant, rowH, "F");
  doc.rect(startX + colDesc + colCant, startY, colUnit, rowH, "F");
  doc.rect(startX + colDesc + colCant + colUnit, startY, colSub, rowH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Descripción", startX + 5, startY + 8);
  doc.text("Cantidad", startX + colDesc + colCant / 2, startY + 8, { align: "center" });
  doc.text("Valor Unitario", startX + colDesc + colCant + colUnit / 2, startY + 8, { align: "center" });
  doc.text("Subtotal", startX + colDesc + colCant + colUnit + colSub / 2, startY + 8, { align: "center" });

  // Filas
  let y = startY + rowH;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  params.items.forEach((item) => {
    doc.setDrawColor(190, 190, 190);
    doc.rect(startX, y, colDesc, rowH);
    doc.rect(startX + colDesc, y, colCant, rowH);
    doc.rect(startX + colDesc + colCant, y, colUnit, rowH);
    doc.rect(startX + colDesc + colCant + colUnit, y, colSub, rowH);

    doc.text(item.descripcion, startX + 5, y + 8);
    doc.text(String(item.cantidad), startX + colDesc + colCant / 2, y + 8, { align: "center" });
    doc.text(formatCOPDocumento(item.valorUnitario), startX + colDesc + colCant + colUnit - 5, y + 8, { align: "right" });
    doc.text(formatCOPDocumento(item.subtotal), startX + colDesc + colCant + colUnit + colSub - 5, y + 8, { align: "right" });

    y += rowH;
  });

  // fila vacía
  doc.rect(startX, y, colDesc, rowH);
  doc.rect(startX + colDesc, y, colCant, rowH);
  doc.rect(startX + colDesc + colCant, y, colUnit, rowH);
  doc.rect(startX + colDesc + colCant + colUnit, y, colSub, rowH);

  // TOTAL A PAGAR
  doc.setFillColor(35, 35, 35);
  doc.rect(startX + colDesc + colCant, y, colUnit, rowH, "F");
  doc.rect(startX + colDesc + colCant + colUnit, y, colSub, rowH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL A PAGAR", startX + colDesc + colCant + colUnit / 2, y + 8, { align: "center" });
  doc.text(formatCOPDocumento(total), startX + colDesc + colCant + colUnit + colSub - 5, y + 8, { align: "right" });

  // Observación
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Observación:", 22, y + 18);
  doc.setFont("helvetica", "normal");
  doc.text(
    params.observaciones?.trim() || "Enviar comprobante de pago una vez realizada la consignación.",
    50,
    y + 18
  );

  // Pie inferior
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(`Beneficiario: ${DATOS_COBRO.beneficiario}`, 22, 186);
  doc.text(`Fecha: ${fecha}`, 22, 194);

  doc.text(`Consignar a: ${DATOS_COBRO.nequi}`, 170, 186);
  doc.text(`Llave: ${DATOS_COBRO.llave}`, 170, 194);

  // QR Code
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${DATOS_COBRO.nequi}`;
    doc.addImage(qrUrl, 'PNG', pageWidth / 2 - 15, 175, 30, 30);
  } catch (e) {
    console.error("Error adding QR code", e);
  }

  const nombreArchivo =
    params.tipo === "factura_venta"
      ? `Factura_Venta_${(params.cliente || "Cliente").replace(/\s+/g, "_")}.pdf`
      : `Cuenta_Cobro_${(params.cliente || "Cliente").replace(/\s+/g, "_")}.pdf`;

  doc.save(nombreArchivo);
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cotizador');
  const [productRefs, setProductRefs] = useState<ProductReference[]>(PRODUCT_REFERENCES_INITIAL);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('furia_sales');
    return saved ? JSON.parse(saved) : [];
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('furia_purchases');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputs, setInputs] = useState<QuoteInputs>({
    clientName: "",
    quantity: 1,
    referencia: PRODUCT_REFERENCES_INITIAL[0].id,
    categoria: 'Niño',
    talla: TALLAS_NINO[3],
    colorCamiseta: COLORES_CAMISETA[2],
    colorInferior: "No aplica",
    gramaje: "200g",
    diseno: "",
    tipoImpresion: "DTG",
    cmEstampado: 0,
    cmCorazon: 0,
    qtyPlanchado: 1,
    costoEmpaque: COSTO_EMPAQUE
  });
  const [observaciones, setObservaciones] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // INVENTORY LOGIC
  const inventoryData = useMemo(() => {
    const map: Record<string, any> = {};

    // Process Purchases
    purchases.forEach(p => {
      const ref = p.referencia || p.producto || "Sin Referencia";
      const prod = p.producto || ref;
      const key = `${ref}__${p.talla}__${p.color}`;
      if (!map[key]) {
        map[key] = {
          referencia: ref,
          producto: prod,
          categoria: p.categoria,
          talla: p.talla,
          color: p.color,
          cantidadComprada: 0,
          cantidadVendida: 0,
          totalInvertido: 0
        };
      }
      map[key].cantidadComprada += p.cantidad;
      map[key].totalInvertido += p.totalCompra;
    });

    // Process Sales
    sales.forEach(s => {
      const ref = s.referencia || "Sin Referencia";
      const key = `${ref}__${s.talla}__${s.colorCamiseta}`;
      if (!map[key]) {
        map[key] = {
          referencia: ref,
          producto: ref,
          categoria: s.categoria,
          talla: s.talla,
          color: s.colorCamiseta,
          cantidadComprada: 0,
          cantidadVendida: 0,
          totalInvertido: 0
        };
      }
      map[key].cantidadVendida += s.cantidad;
    });

    return Object.values(map).map(item => {
      const stockActual = item.cantidadComprada - item.cantidadVendida;
      const costoPromedioCompra = item.cantidadComprada > 0 
        ? item.totalInvertido / item.cantidadComprada 
        : 0;
      
      return {
        referencia: item.referencia,
        producto: item.producto,
        categoria: item.categoria,
        talla: item.talla,
        color: item.color,
        cantidadComprada: item.cantidadComprada,
        cantidadVendida: item.cantidadVendida,
        stockActual,
        costoPromedioCompra,
        valorTotalInventario: stockActual * costoPromedioCompra
      };
    });
  }, [sales, purchases]);

  useEffect(() => {
    localStorage.setItem('furia_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('furia_purchases', JSON.stringify(purchases));
  }, [purchases]);

  const handleRegisterSale = async () => {
    if (quoteItems.length === 0) return alert("No hay items para vender.");
    
    // Check stock
    for (const item of quoteItems) {
      const invItem = inventoryData.find(i => 
        i.referencia === item.product.name && 
        i.talla === item.talla && 
        i.color === item.colorCamiseta
      );
      const stock = invItem ? invItem.stockActual : 0;
      if (item.quantity > stock) {
        return alert(`Inventario insuficiente para: ${item.product.name} (${item.talla} - ${item.colorCamiseta}). Stock actual: ${stock}`);
      }
    }

    const nextInvoiceNum = (sales.length + 1).toString().padStart(5, '0');
    const invoiceNumber = `FACT-${nextInvoiceNum}`;

    const newSales: Sale[] = quoteItems.map(item => ({
      id: Date.now() + Math.random(),
      invoiceNumber,
      fecha: new Date().toISOString().split('T')[0],
      cliente: inputs.clientName || "Cliente General",
      referencia: item.product.name,
      categoria: item.categoria,
      talla: item.talla,
      colorCamiseta: item.colorCamiseta,
      colorInferior: item.colorInferior,
      gramaje: item.gramaje,
      diseno: item.diseno,
      tipoImpresion: item.tipoImpresion,
      cantidad: item.quantity,
      precioVentaUnitario: item.results.precioUnidad,
      costoUnitario: item.results.costoTotal,
      totalVenta: item.results.precioTotal,
      costoTotal: item.results.costoTotal * item.quantity,
      ganancia: item.results.ganancia * item.quantity,
      metodoPago: "Pendiente",
      estado: 'Pendiente',
      observaciones: observaciones
    }));

    setSales(prev => [...prev, ...newSales]);

    for (const sale of newSales) {
      await guardarVentaEnSheets({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        fecha: sale.fecha,
        cliente: sale.cliente,
        referencia: sale.referencia,
        categoria: sale.categoria,
        talla: sale.talla,
        colorSuperior: sale.colorCamiseta,
        colorInferior: sale.colorInferior || "No aplica",
        gramaje: sale.gramaje,
        diseno: sale.diseno,
        tipoImpresion: sale.tipoImpresion,
        cantidad: sale.cantidad,
        costoUnitario: sale.costoUnitario,
        precioVentaUnitario: sale.precioVentaUnitario,
        totalVenta: sale.totalVenta,
        costoTotal: sale.costoTotal,
        ganancia: sale.ganancia,
        metodoPago: sale.metodoPago,
        estado: sale.estado,
        observaciones: sale.observaciones
      });
    }

    const itemsFactura: PdfDocumentoItem[] = quoteItems.map((it) => ({
      descripcion: construirDescripcionDocumento(it),
      cantidad: it.quantity,
      valorUnitario: it.results.precioUnidad,
      subtotal: it.results.precioTotal
    }));

    await generarPdfPlantillaExacta({
      tipo: "factura_venta",
      fecha: new Date().toISOString(),
      cliente: inputs.clientName || "CLIENTE",
      numeroFactura: invoiceNumber,
      observaciones,
      items: itemsFactura
    });

    setQuoteItems([]);
    setInputs(prev => ({ ...prev, clientName: "" }));
    setObservaciones("");
    setActiveTab('ventas');
    alert("¡Venta registrada, guardada en Google Sheets y factura generada!");
  };

  const handleAddSale = (sale: Sale) => {
    // Check stock
    const invItem = inventoryData.find(i => 
      i.referencia === sale.referencia && 
      i.talla === sale.talla && 
      i.color === sale.colorCamiseta
    );
    const stock = invItem ? invItem.stockActual : 0;
    if (sale.cantidad > stock) {
      return alert(`Inventario insuficiente para: ${sale.referencia} (${sale.talla} - ${sale.colorCamiseta}). Stock actual: ${stock}`);
    }

    const nextInvoiceNum = (sales.length + 1).toString().padStart(5, '0');
    const invoiceNumber = `FACT-${nextInvoiceNum}`;
    
    setSales(prev => [...prev, { ...sale, invoiceNumber }]);
  };

  const handleDeleteSale = (id: string) => {
    if (confirm("¿Eliminar esta venta?")) {
      setSales(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleUpdateSaleStatus = (id: string, status: Sale['estado']) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, estado: status } : s));
  };

  const handleAddPurchase = async (purchase: Purchase) => {
    setPurchases(prev => [...prev, purchase]);

    await guardarCompraEnSheets({
      id: purchase.id,
      fecha: purchase.fecha,
      proveedor: purchase.proveedor,
      referencia: purchase.referencia,
      producto: purchase.producto,
      categoria: purchase.categoria,
      talla: purchase.talla,
      color: purchase.color,
      cantidad: purchase.cantidad,
      valorUnitarioCompra: purchase.valorUnitario,
      totalCompra: purchase.totalCompra,
      metodoPago: (purchase as any).metodoPago || "",
      observaciones: (purchase as any).observaciones || ""
    });
  };

  const handleDeletePurchase = (id: string) => {
    if (confirm("¿Eliminar este registro de compra?")) {
      setPurchases(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleExportExcel = () => {
    if (sales.length === 0 && purchases.length === 0) {
      return alert("No hay datos para exportar.");
    }

    // HOJA 1: VENTAS
    const wsVentas = XLSX.utils.json_to_sheet(sales.map(s => ({
      ID: s.id,
      Fecha: s.fecha,
      Cliente: s.cliente,
      Referencia: s.referencia,
      Categoría: s.categoria,
      Talla: s.talla,
      'Color Superior': s.colorCamiseta,
      'Color Inferior': s.colorInferior,
      Cantidad: s.cantidad,
      'Costo Unitario': s.costoUnitario,
      'Precio Venta Unitario': s.precioVentaUnitario,
      'Total Venta': s.totalVenta,
      'Costo Total': s.costoTotal,
      Ganancia: s.ganancia,
      'Método Pago': s.metodoPago,
      Estado: s.estado,
      Observaciones: s.observaciones
    })));

    // HOJA 2: COMPRAS
    const wsCompras = XLSX.utils.json_to_sheet(purchases.map(p => ({
      ID: p.id,
      Fecha: p.fecha,
      Proveedor: p.proveedor,
      Producto: p.producto,
      Categoría: p.categoria,
      Cantidad: p.cantidad,
      'Valor Unitario': p.valorUnitario,
      Total: p.totalCompra,
      'Método Pago': (p as any).metodoPago || "",
      Observaciones: (p as any).observaciones || ""
    })));

    // HOJA 3: RESUMEN
    const totalVentas = sales.reduce((acc, s) => acc + s.totalVenta, 0);
    const totalCostoVentas = sales.reduce((acc, s) => acc + s.costoTotal, 0);
    const totalCompras = purchases.reduce((acc, p) => acc + p.totalCompra, 0);
    const gananciaBruta = totalVentas - totalCostoVentas;
    const gananciaNeta = gananciaBruta - totalCompras;

    const resumenData = [
      { Concepto: 'Total Ventas', Valor: totalVentas },
      { Concepto: 'Costo de Producción Vendido', Valor: totalCostoVentas },
      { Concepto: 'Total Compras', Valor: totalCompras },
      { Concepto: 'Ganancia Bruta', Valor: gananciaBruta },
      { Concepto: 'Ganancia Neta', Valor: gananciaNeta }
    ];
    const wsResumen = XLSX.utils.json_to_sheet(resumenData);

    // HOJA 4: COSTOS Y RENTABILIDAD (Por referencia)
    const mapaRent: any = {};
    sales.forEach(v => {
      const ref = v.referencia;
      if (!mapaRent[ref]) {
        mapaRent[ref] = {
          Referencia: ref,
          'Unidades Vendidas': 0,
          'Costo Acumulado': 0,
          'Ventas Acumuladas': 0,
          'Ganancia Acumulada': 0
        };
      }
      mapaRent[ref]['Unidades Vendidas'] += v.cantidad;
      mapaRent[ref]['Costo Acumulado'] += v.costoTotal;
      mapaRent[ref]['Ventas Acumuladas'] += v.totalVenta;
      mapaRent[ref]['Ganancia Acumulada'] += v.ganancia;
    });

    const rentData = Object.values(mapaRent).map((item: any) => {
      const margen = item['Ventas Acumuladas'] > 0 
        ? ((item['Ganancia Acumulada'] / item['Ventas Acumuladas']) * 100).toFixed(2) + "%"
        : "0%";
      return { ...item, 'Margen %': margen };
    });
    const wsRent = XLSX.utils.json_to_sheet(rentData);

    // HOJA 5: INVENTARIO GENERAL
    const generalInvMap: Record<string, any> = {};
    inventoryData.forEach(i => {
      if (!generalInvMap[i.referencia]) {
        generalInvMap[i.referencia] = {
          Referencia: i.referencia,
          Producto: i.producto,
          Categoría: i.categoria,
          Comprado: 0,
          Vendido: 0,
          'Stock Actual': 0,
          'Valor Total': 0
        };
      }
      generalInvMap[i.referencia].Comprado += i.cantidadComprada;
      generalInvMap[i.referencia].Vendido += i.cantidadVendida;
      generalInvMap[i.referencia]['Stock Actual'] += i.stockActual;
      generalInvMap[i.referencia]['Valor Total'] += i.valorTotalInventario;
    });
    const wsGeneralInv = XLSX.utils.json_to_sheet(Object.values(generalInvMap));

    // HOJA 6: INVENTARIO DETALLADO
    const wsDetailedInv = XLSX.utils.json_to_sheet(inventoryData.map(i => ({
      Referencia: i.referencia,
      Producto: i.producto,
      Categoría: i.categoria,
      Talla: i.talla,
      Color: i.color,
      Comprado: i.cantidadComprada,
      Vendido: i.cantidadVendida,
      'Stock Actual': i.stockActual,
      'Costo Promedio Compra': i.costoPromedioCompra,
      'Valor Total Inventario': i.valorTotalInventario
    })));

    // HOJA 7: ALERTAS DE REPOSICIÓN
    const alertsData = inventoryData
      .filter(i => i.stockActual <= 5)
      .map(i => ({
        Referencia: i.referencia,
        Talla: i.talla,
        Color: i.color,
        'Stock Actual': i.stockActual,
        Estado: i.stockActual <= 2 ? 'Crítico' : 'Bajo'
      }));
    const wsAlerts = XLSX.utils.json_to_sheet(alertsData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");
    XLSX.utils.book_append_sheet(wb, wsCompras, "Compras");
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsRent, "Ganancia_por_Articulo");
    XLSX.utils.book_append_sheet(wb, wsGeneralInv, "Inventario_General");
    XLSX.utils.book_append_sheet(wb, wsDetailedInv, "Inventario_Detallado");
    XLSX.utils.book_append_sheet(wb, wsAlerts, "Alertas_Reposicion");

    XLSX.writeFile(wb, `Control_FuriaRock_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCOP = (val: number) => "$ " + Math.round(Number(val || 0)).toLocaleString("es-CO");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      if (!rows.length) return;
      const norm = (s: any) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      const findKey = (obj: any, posibles: string[]) => {
        const keys = Object.keys(obj);
        for (const p of posibles) {
          const hit = keys.find(k => norm(k) === norm(p));
          if (hit) return hit;
        }
        return null;
      };
      const refKey = findKey(rows[0], ["referencia", "ref", "nombre"]);
      const precioKey = findKey(rows[0], ["precio_unitario", "precio", "costo"]);
      if (refKey && precioKey) {
        const newRefs: ProductReference[] = rows.map((row, idx) => ({
          id: String(row[refKey] || `id-${idx}`),
          name: String(row[refKey]),
          baseCost: Number(String(row[precioKey]).replace(/[^\d.]/g, "")) || 0
        })).filter(p => p.name);
        setProductRefs(newRefs);
        setInputs(prev => ({ ...prev, referencia: newRefs[0].id }));
      }
    } catch (err) { 
      alert('Error al procesar el Excel.'); 
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    setInputs(prev => ({
      ...prev,
      talla: prev.categoria === 'Niño' ? TALLAS_NINO[0] : TALLAS_ADULTO[0]
    }));
  }, [inputs.categoria]);

  const currentProduct = useMemo(() => 
    productRefs.find(p => p.id === inputs.referencia) || productRefs[0], 
  [inputs.referencia, productRefs]);

  const esConjunto = (refName: string) => {
    const r = (refName || "").toLowerCase();
    return r.includes("conjunto") || r.includes("jogger") || r.includes("bermuda") || r.includes("joker") || r.includes("set") || r.includes("+");
  };

  const isConjuntoItem = useMemo(() => esConjunto(currentProduct?.name), [currentProduct]);

  const showBermudaSelector = useMemo(() => {
    return (inputs.categoria === 'Niño') && isConjuntoItem;
  }, [inputs.categoria, isConjuntoItem]);

  useEffect(() => {
    if (!showBermudaSelector) {
      setInputs(prev => ({ ...prev, colorInferior: "No aplica" }));
    } else if (inputs.colorInferior === "No aplica") {
      setInputs(prev => ({ ...prev, colorInferior: COLORES_BERMUDA[2] }));
    }
  }, [showBermudaSelector]);

  const currentResults = useMemo((): QuoteResults => {
    const base = currentProduct.baseCost;
    const estampadoPrincipal = (Number(inputs.cmEstampado) || 0) * COSTO_CM2;
    const estampadoCorazon = (Number(inputs.cmCorazon) || 0) * COSTO_CM2;
    const costoPlanchado = (Number(inputs.qtyPlanchado) || 0) * COSTO_PLANCHADO;
    const empaque = Number(inputs.costoEmpaque) || 0;
    
    const costoTotalUnidad = base + estampadoPrincipal + estampadoCorazon + costoPlanchado + empaque;
    
    const ganancia = (inputs.categoria === 'Niño' && isConjuntoItem) ? GANANCIA_NINO : GANANCIA_ADULTO;
    const precioUnidad = Math.round(costoTotalUnidad + ganancia);
    
    return {
      costoBase: base,
      costoEstampado: estampadoPrincipal,
      costoCorazon: estampadoCorazon,
      costoPlanchado: costoPlanchado,
      costoEmpaque: empaque,
      costoTotal: costoTotalUnidad,
      precioUnidad,
      precioTotal: precioUnidad * inputs.quantity,
      ganancia,
      margen: (ganancia / precioUnidad) * 100
    };
  }, [inputs, currentProduct, isConjuntoItem]);

  const addToQuote = () => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product: currentProduct,
      categoria: inputs.categoria,
      talla: inputs.talla,
      colorCamiseta: inputs.colorCamiseta,
      colorInferior: showBermudaSelector ? inputs.colorInferior : "No aplica",
      gramaje: inputs.gramaje,
      diseno: inputs.diseno,
      tipoImpresion: inputs.tipoImpresion,
      cmEstampado: inputs.cmEstampado,
      cmCorazon: inputs.cmCorazon,
      qtyPlanchado: inputs.qtyPlanchado,
      costoEmpaque: inputs.costoEmpaque,
      quantity: inputs.quantity,
      results: { ...currentResults }
    };
    setQuoteItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => setQuoteItems(prev => prev.filter(it => it.id !== id));

  const downloadPDF_jsPDF = async (
    items?: QuoteItem[] | Sale[], 
    customClientName?: string, 
    isInvoice: boolean = false,
    invoiceNum?: string
  ) => {
    const itemsToExport = items || (quoteItems.length > 0 ? quoteItems : [{
      id: 'preview',
      product: { name: currentProduct.name } as any,
      categoria: inputs.categoria,
      talla: inputs.talla,
      colorCamiseta: inputs.colorCamiseta,
      colorInferior: showBermudaSelector ? inputs.colorInferior : "No aplica",
      gramaje: inputs.gramaje,
      diseno: inputs.diseno,
      tipoImpresion: inputs.tipoImpresion,
      quantity: inputs.quantity,
      results: currentResults
    } as any]);

    const itemsPdf: PdfDocumentoItem[] = itemsToExport.map((it: any) => {
      const isSale = 'precioVentaUnitario' in it;
      const qty = isSale ? it.cantidad : it.quantity;
      const unitPrice = isSale ? it.precioVentaUnitario : it.results.precioUnidad;
      const subtotal = isSale ? it.totalVenta : it.results.precioTotal;
      
      return {
        descripcion: construirDescripcionDocumento(it),
        cantidad: qty,
        valorUnitario: unitPrice,
        subtotal: subtotal
      };
    });

    await generarPdfPlantillaExacta({
      tipo: isInvoice ? "factura_venta" : "cuenta_cobro",
      fecha: new Date().toISOString(),
      cliente: customClientName || inputs.clientName || "CLIENTE",
      numeroFactura: invoiceNum,
      observaciones,
      items: itemsPdf
    });
  };

  const renderCotizador = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-5 space-y-8">
        <section className="panel p-8 bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <User size={18} className="text-[#ff7a00]" />
            <h2 className="text-lg font-bold uppercase tracking-widest text-white">1. Datos del Cliente</h2>
          </div>
          <input 
            type="text" 
            value={inputs.clientName} 
            onChange={(e) => setInputs({...inputs, clientName: e.target.value})} 
            className="w-full px-5 py-4 bg-[#0b0b0d] border border-white/10 rounded-xl text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" 
            placeholder="Nombre del cliente..." 
          />
        </section>

        <section className="panel p-8 bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4">
            <LayoutGrid size={18} className="text-[#ff7a00]" />
            <h2 className="text-lg font-bold uppercase tracking-widest text-white">2. Selección Técnica</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Referencia</label>
                <select 
                  value={inputs.referencia} 
                  onChange={(e) => setInputs({...inputs, referencia: e.target.value})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                  id="selReferencia"
                >
                  {productRefs.map(r => <option key={r.id} value={r.id} className="bg-[#1a1d24]">{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Costo Base</label>
                <div className="w-full bg-[#121317] border border-white/10 rounded-xl px-4 py-3.5 text-[#ff7a00] font-bold">
                  $ {currentProduct.baseCost.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Categoría</label>
                <select 
                  value={inputs.categoria} 
                  onChange={(e) => setInputs({...inputs, categoria: e.target.value as any})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                  id="selCategoria"
                >
                  <option value="Niño" className="bg-[#1a1d24]">Niño</option>
                  <option value="Adulto" className="bg-[#1a1d24]">Adulto</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Talla</label>
                <select 
                  value={inputs.talla} 
                  onChange={(e) => setInputs({...inputs, talla: e.target.value})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                >
                  {(inputs.categoria === 'Niño' ? TALLAS_NINO : TALLAS_ADULTO).map(t => <option key={t} value={t} className="bg-[#1a1d24]">{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Color Camiseta</label>
                <select 
                  value={inputs.colorCamiseta} 
                  onChange={(e) => setInputs({...inputs, colorCamiseta: e.target.value})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                >
                  {COLORES_CAMISETA.map(c => <option key={c} value={c} className="bg-[#1a1d24]">{c}</option>)}
                </select>
              </div>
              
              {showBermudaSelector && (
                <div className="space-y-2" id="wrapColorInferior">
                  <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Color Bermuda/Jogger</label>
                  <select 
                    value={inputs.colorInferior} 
                    onChange={(e) => setInputs({...inputs, colorInferior: e.target.value})} 
                    className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                  >
                    {COLORES_BERMUDA.map(c => <option key={c} value={c} className="bg-[#1a1d24]">{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Gramaje</label>
                <select 
                  value={inputs.gramaje} 
                  onChange={(e) => setInputs({...inputs, gramaje: e.target.value})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                >
                  <option value="160g">160g</option>
                  <option value="180g">180g</option>
                  <option value="200g">200g</option>
                  <option value="220g">220g</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Diseño</label>
                <input 
                  type="text" 
                  value={inputs.diseno} 
                  onChange={(e) => setInputs({...inputs, diseno: e.target.value})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" 
                  placeholder="Ej: Rosa, Calavera..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Tipo Impresión</label>
                <select 
                  value={inputs.tipoImpresion} 
                  onChange={(e) => setInputs({...inputs, tipoImpresion: e.target.value})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                >
                  <option value="DTG">DTG</option>
                  <option value="DTF">DTF</option>
                  <option value="Serigrafía">Serigrafía</option>
                  <option value="Sublimación">Sublimación</option>
                  <option value="Bordado">Bordado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1 flex items-center gap-1 text-[#8f97a6]">Cm² Estampado <Info size={10} /></label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.cmEstampado} 
                  onChange={(e) => setInputs({...inputs, cmEstampado: Number(e.target.value)})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1 flex items-center gap-1 text-[#8f97a6]">Punto Corazón <Info size={10} /></label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.cmCorazon} 
                  onChange={(e) => setInputs({...inputs, cmCorazon: Number(e.target.value)})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Planchados</label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.qtyPlanchado} 
                  onChange={(e) => setInputs({...inputs, qtyPlanchado: Number(e.target.value)})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Empaque</label>
                <input 
                  type="number" 
                  min="0" 
                  value={inputs.costoEmpaque} 
                  onChange={(e) => setInputs({...inputs, costoEmpaque: Number(e.target.value)})} 
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">Cantidad Lote</label>
              <input 
                type="number" 
                min="1" 
                value={inputs.quantity} 
                onChange={(e) => setInputs({...inputs, quantity: Math.max(1, Number(e.target.value))})} 
                className="w-full bg-[#121317] border-2 border-dashed border-white/10 rounded-xl px-5 py-4 text-white font-bold text-center text-2xl outline-none focus:border-[#ff7a00] transition-all" 
              />
            </div>

            <button onClick={addToQuote} className="w-full bg-[#ff7a00] text-white py-5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-[#ff7a00]/20 hover:bg-[#ff8f26] transition-all active:scale-[0.98]">
              <Plus size={18} /> AGREGAR PRENDA AL PEDIDO
            </button>
            <button 
              onClick={() => setInputs({
                clientName: inputs.clientName,
                quantity: 1,
                referencia: productRefs[0].id,
                categoria: 'Niño',
                talla: TALLAS_NINO[3],
                colorCamiseta: COLORES_CAMISETA[2],
                colorInferior: "No aplica",
                cmEstampado: 0,
                cmCorazon: 0,
                qtyPlanchado: 1,
                costoEmpaque: COSTO_EMPAQUE
              })} 
              className="w-full text-[10px] text-[#8f97a6] hover:text-white uppercase font-bold tracking-widest mt-4 transition-colors"
            >
              Resetear Formulario
            </button>
          </div>
        </section>

        <div className="text-center space-y-2">
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-[#8f97a6] font-bold uppercase tracking-widest hover:text-[#ff7a00] transition-colors flex items-center gap-2 justify-center mx-auto">
            <FileUp size={14} /> Importar Excel de Precios
          </button>
          <p className="text-[8px] text-[#8f97a6] uppercase tracking-tighter">El Excel debe tener columnas: "Referencia" y "Precio_Unitario"</p>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
        </div>
      </div>

      <div className="lg:col-span-7 space-y-8">
        <section className="panel p-12 relative overflow-hidden group bg-gradient-to-br from-[#1a1d24] to-[#0b0b0d] text-white border-white/5 shadow-2xl">
          <div className="absolute -top-24 -right-24 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
            <Zap size={300} strokeWidth={1} className="text-[#ff7a00]" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 text-center lg:text-left">
              <p className="text-[#8f97a6] font-bold uppercase tracking-[0.5em] text-[10px] mb-6">Venta Sugerida (Unidad)</p>
              <h3 className="text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-[#8f97a6]">
                {formatCOP(currentResults.precioUnidad)}
              </h3>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="bg-white/5 text-white px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest border border-white/10 backdrop-blur-md">TOTAL LOTE: {formatCOP(currentResults.precioTotal)}</div>
              </div>
            </div>
            <div className="w-full lg:w-80 bg-white/5 backdrop-blur-2xl p-10 rounded-[40px] border border-white/10 shadow-inner">
              <h4 className="text-[#8f97a6] font-bold text-[10px] uppercase tracking-[0.3em] mb-8 text-center">Rentabilidad</h4>
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <span className="text-[#8f97a6] text-[10px] uppercase font-bold tracking-widest">Ganancia Real</span>
                  <span className="text-[#4ade80] font-bold text-lg">{formatCOP(currentResults.ganancia)}</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full"></div>
                <div className="flex justify-between items-end">
                  <span className="text-[#8f97a6] text-[10px] uppercase font-bold pb-2 tracking-widest">Margen</span>
                  <span className="text-white font-black text-5xl tracking-tighter">{currentResults.margen.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel p-10 bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="bg-[#ff7a00]/10 p-3 rounded-xl"><ShoppingCart size={20} className="text-[#ff7a00]" /></div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Pedido Actual</h2>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button 
                onClick={() => { if(confirm("¿Limpiar toda la cotización?")) setQuoteItems([]); }} 
                className="bg-white/5 hover:bg-[#ef4444]/10 text-[#8f97a6] hover:text-[#ef4444] font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all active:scale-95 border border-white/5"
              >
                <Trash2 size={16} /> LIMPIAR
              </button>
              <button 
                onClick={downloadPDF_jsPDF} 
                disabled={quoteItems.length === 0 && !inputs.clientName} 
                className="bg-[#ff7a00] hover:bg-[#ff8f26] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all shadow-lg shadow-[#ff7a00]/20 active:scale-95 disabled:opacity-20"
              >
                <Download size={16} /> PDF
              </button>
              <button 
                onClick={handleRegisterSale} 
                disabled={quoteItems.length === 0} 
                className="bg-[#4ade80] hover:bg-[#22c55e] text-[#0b0b0d] font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all shadow-lg shadow-[#4ade80]/20 active:scale-95 disabled:opacity-20"
              >
                <CheckCircle2 size={16} /> CONVERTIR EN VENTA
              </button>
            </div>
          </div>

          {quoteItems.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-[#8f97a6] font-bold uppercase tracking-widest text-[11px]">No hay productos en la cotización.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {quoteItems.map(item => (
                <div key={item.id} className="bg-[#0b0b0d]/40 border border-white/5 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 hover:border-[#ff7a00]/30 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-[#1a1d24] border border-white/10 rounded-2xl flex items-center justify-center text-[#ff7a00] font-bold text-lg rotate-3 group-hover:rotate-0 transition-transform">x{item.quantity}</div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold uppercase text-base tracking-tight">{item.product.name}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-[#ff7a00]/10 text-[#ff7a00] px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-[#ff7a00]/20">TALLA {item.talla}</span>
                        {item.colorCamiseta !== "No aplica" && <span className="bg-white/5 text-[#b9c0cc] px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-white/10">SUP: {item.colorCamiseta}</span>}
                        {item.colorInferior && item.colorInferior !== "No aplica" && <span className="bg-white/5 text-[#b9c0cc] px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-white/10">INF: {item.colorInferior}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[9px] text-[#8f97a6] font-bold uppercase tracking-widest mb-1">Subtotal Item</p>
                      <p className="text-white font-bold text-2xl tracking-tighter">{formatCOP(item.results.precioTotal)}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-4 bg-[#1a1d24] hover:bg-[#ef4444]/10 text-[#8f97a6] hover:text-[#ef4444] rounded-2xl transition-all border border-white/10">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="mt-12 pt-10 border-t border-white/5 flex justify-between items-end">
                <div>
                  <p className="text-[#8f97a6] font-bold text-[10px] uppercase tracking-[0.4em] flex items-center gap-2 mb-2">
                    <Target size={14} className="text-[#ff7a00]" /> VALOR TOTAL COTIZADO
                  </p>
                  <p className="text-6xl font-bold text-white tracking-tighter">
                    {formatCOP(quoteItems.reduce<number>((acc: number, item: QuoteItem) => acc + item.results.precioTotal, 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel p-10 bg-[#121317] border border-white/5">
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">
              <MessageSquare size={14} className="text-[#ff7a00]" /> Notas Personalizadas para el PDF
            </label>
            <textarea 
              value={observaciones} 
              onChange={(e) => setObservaciones(e.target.value)} 
              className="w-full bg-[#0b0b0d] border border-white/10 rounded-3xl px-8 py-6 text-white text-sm font-medium min-h-[120px] resize-none focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all" 
              placeholder="Ej: Lavar a mano, no planchar directamente sobre el estampado. Entrega en 10 días hábiles..." 
            />
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32">
      <header className="app-header py-4 px-12 mb-10 shadow-2xl sticky top-0 z-[100] bg-[#0b0b0d]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-[#ff7a00] to-[#d96500] p-2 rounded-xl shadow-lg shadow-[#ff7a00]/20">
              <Zap size={24} className="text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">FURIA ROCK</h1>
              <p className="text-[8px] text-[#ff7a00] font-bold tracking-[0.2em] uppercase">Expertos en DTG & DTF</p>
            </div>
          </div>
          
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex items-center gap-6 text-right hidden lg:flex">
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">COCO YEMA</h1>
              <p className="text-[8px] text-[#ff7a00] font-bold tracking-[0.2em] uppercase">Premium Kids Fashion</p>
            </div>
            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
              <img src={LOGO_COCO} className="h-10 w-auto" alt="Coco" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <section className="panel p-0 overflow-hidden bg-gradient-to-r from-[#1a1d24] to-[#0b0b0d] text-white flex flex-col md:flex-row items-stretch justify-between shadow-2xl border-white/5">
          <div className="flex-1 flex items-center gap-6 p-8 bg-gradient-to-r from-[#0b0b0d] to-[#1a1d24]">
            <div className="bg-[#ff7a00]/10 p-4 rounded-2xl backdrop-blur-md border border-[#ff7a00]/20"><Zap size={24} className="text-[#ff7a00]" /></div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-white">Sistema de Gestión Premium</h3>
              <p className="text-[10px] text-[#8f97a6] uppercase font-medium mt-1">Optimiza tu producción y ventas con precisión milimétrica</p>
            </div>
          </div>
          <div className="flex gap-12 p-8 items-center bg-white/5 border-l border-white/5">
            <div className="text-center">
              <p className="text-[10px] text-[#8f97a6] uppercase font-bold mb-1 tracking-widest">Versión</p>
              <p className="text-xs font-bold tracking-widest text-white">2.5.0 PRO</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-[#8f97a6] uppercase font-bold mb-1 tracking-widest">Estado</p>
              <p className="text-xs font-bold text-[#4ade80] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></div> EN LÍNEA
              </p>
            </div>
          </div>
        </section>

        {activeTab === 'cotizador' && renderCotizador()}

        {activeTab === 'ventas' && (
          <Ventas 
            sales={sales} 
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale} 
            onUpdateSaleStatus={handleUpdateSaleStatus} 
            onDownloadInvoice={(sale) => downloadPDF_jsPDF([sale], sale.cliente, true, sale.invoiceNumber)}
          />
        )}

        {activeTab === 'compras' && (
          <Compras 
            purchases={purchases} 
            productRefs={productRefs}
            onAddPurchase={handleAddPurchase} 
            onDeletePurchase={handleDeletePurchase} 
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            sales={sales} 
            purchases={purchases} 
            inventory={inventoryData}
            onExportExcel={handleExportExcel}
          />
        )}

        {activeTab === 'inventarios' && (
          <Inventarios inventory={inventoryData} />
        )}

        <section className="panel p-12 mt-20 bg-gradient-to-br from-[#1a1d24] to-[#20242d] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-[#ff7a00]/10 p-4 rounded-2xl shadow-sm border border-[#ff7a00]/20"><HelpCircle size={24} className="text-[#ff7a00]" /></div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Preguntas Frecuentes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-[#ff7a00] tracking-widest">¿Cómo funciona el cotizador?</h4>
              <p className="text-xs text-[#b9c0cc] leading-relaxed font-medium">El sistema calcula automáticamente el costo de producción basado en la referencia, técnica de estampado y cantidad. Sugiere un precio de venta con un margen de utilidad optimizado para tu negocio.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-[#ff7a00] tracking-widest">¿Cómo exportar reportes?</h4>
              <p className="text-xs text-[#b9c0cc] leading-relaxed font-medium">En la pestaña de Ventas encontrarás el botón "Exportar Reporte" que descarga un archivo CSV con todo el historial de transacciones para tu contabilidad y análisis externo.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-[#ff7a00] tracking-widest">¿Cómo actualizar precios base?</h4>
              <p className="text-xs text-[#b9c0cc] leading-relaxed font-medium">Puedes importar un archivo Excel en el cotizador con las columnas "Referencia" y "Precio_Unitario" para actualizar masivamente los costos de tus prendas de forma rápida.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-[#ff7a00] tracking-widest">¿Qué es la Matriz de Negocio?</h4>
              <p className="text-xs text-[#b9c0cc] leading-relaxed font-medium">Es una herramienta de análisis profundo que clasifica tus productos por rentabilidad real, permitiéndote identificar cuáles generan mayor ganancia neta y cuáles requieren ajustes.</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#0b0b0d]/80 backdrop-blur-xl border-t border-white/5 py-5 px-12 z-[60]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-bold uppercase tracking-[0.5em] text-[#8f97a6]">
          <div className="flex gap-12">
            <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> DTG & DTF PRO</span>
            <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> CALIDAD PREMIUM</span>
          </div>
          <div className="text-white italic tracking-[0.8em] flex items-center gap-4">
            FURIA ROCK <div className="w-1 h-1 bg-white/10 rounded-full"></div> COCO YEMA
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;