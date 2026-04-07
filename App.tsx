import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { QuoteInputs, QuoteResults, ProductReference, QuoteItem, Sale, Purchase, Client, Invoice } from './types';
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
import Clientes from './src/components/Clientes';
import Facturacion from './src/components/Facturacion';
import DocumentTemplate from './src/components/DocumentTemplate';
import { getNextNumber, downloadPDF, downloadImage } from './src/services/documentService';
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
  HelpCircle,
  Settings,
  Upload,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react';

// URL GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbxe5y8mkupeU5x5whboWLW-L20cv91zrbF0QUYAOrvi4CzhoLzU3qcBHPbkTFJHUBAT/exec";

// FUNCIÓN GENÉRICA PARA SINCRONIZAR CON SHEETS
async function syncWithSheets(hoja: string, data: any) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        accion: "guardar",
        hoja: hoja,
        ...data
      })
    });
  } catch (err) {
    console.error(`Error guardando en ${hoja}:`, err);
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
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear el canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error(`No se pudo cargar la imagen: ${src}`));
    };

    img.src = src;
  });
}

interface PdfDocumentoItem {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
}

function construirDescripcionDocumento(item: QuoteItem | Sale): string {
  const colors = [];
  if (item.colorCamiseta) colors.push(`Camiseta: ${item.colorCamiseta}`);
  if (item.colorInferior) colors.push(`Inferior: ${item.colorInferior}`);
  const colorStr = colors.length > 0 ? ` - ${colors.join(', ')}` : '';
  const tallaStr = item.talla ? ` (${item.talla})` : '';
  const impresionStr = item.tipoImpresion ? ` - ${item.tipoImpresion}` : '';
  
  const productName = 'referencia' in item ? item.referencia : item.product.name;
  
  return `${productName}${tallaStr}${colorStr}${impresionStr}`;
}

async function generarPdfPlantillaExacta(params: {
  tipo: "cuenta_cobro" | "factura_venta";
  fecha?: string;
  cliente?: string;
  numeroFactura?: string | null;
  observaciones?: string;
  items: PdfDocumentoItem[];
}) {
  try {
    // @ts-ignore
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      throw new Error("No se detectó jsPDF");
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(26, 29, 36);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("FURIA ROCK", 15, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("T-SHIRTS & PREMIUM APPAREL", 15, 28);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const titulo = params.tipo === "factura_venta" ? "FACTURA DE VENTA" : "COTIZACIÓN / CUENTA DE COBRO";
    doc.text(titulo, pageWidth - 15, 20, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (params.numeroFactura) {
      doc.text(`N° ${params.numeroFactura}`, pageWidth - 15, 28, { align: "right" });
    }

    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE:", 15, 55);
    doc.setFont("helvetica", "normal");
    doc.text(params.cliente || "CLIENTE GENERAL", 45, 55);

    doc.setFont("helvetica", "bold");
    doc.text("FECHA:", 15, 62);
    doc.setFont("helvetica", "normal");
    doc.text(formatFechaDocumento(params.fecha), 45, 62);

    const tableData = params.items.map(item => [
      item.descripcion,
      item.cantidad,
      formatCOPDocumento(item.valorUnitario),
      formatCOPDocumento(item.subtotal)
    ]);

    // @ts-ignore
    doc.autoTable({
      startY: 75,
      head: [['DESCRIPCIÓN / DETALLES', 'CANT.', 'UNITARIO', 'SUBTOTAL']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [26, 29, 36], 
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      }
    });

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 150;
    const total = params.items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAGAR:", pageWidth - 85, finalY + 15);
    doc.text(formatCOPDocumento(total), pageWidth - 15, finalY + 15, { align: "right" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DE PAGO:", 15, finalY + 30);
    doc.setFont("helvetica", "normal");
    doc.text(`Beneficiario: ${DATOS_COBRO.beneficiario}`, 15, finalY + 37);
    doc.text(`Nequi: ${DATOS_COBRO.nequi}`, 15, finalY + 44);
    doc.text(`Llave: ${DATOS_COBRO.llave}`, 15, finalY + 51);

    if (params.observaciones) {
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVACIONES:", 15, finalY + 65);
      doc.setFont("helvetica", "normal");
      const splitObs = doc.splitTextToSize(params.observaciones, pageWidth - 30);
      doc.text(splitObs, 15, finalY + 72);
    }

    const nombreArchivo = params.tipo === "factura_venta" 
      ? `Factura_${(params.cliente || "Cliente").replace(/\s+/g, "_")}.pdf`
      : `Cotizacion_${(params.cliente || "Cliente").replace(/\s+/g, "_")}.pdf`;

    doc.save(nombreArchivo);
  } catch (error) {
    console.error("Error generando PDF:", error);
    throw error;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cotizador');
  const [productRefs, setProductRefs] = useState<ProductReference[]>(() => {
    const saved = localStorage.getItem('furia_product_refs');
    return saved ? JSON.parse(saved) : PRODUCT_REFERENCES_INITIAL;
  });
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('furia_sales');
    return saved ? JSON.parse(saved) : [];
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('furia_purchases');
    return saved ? JSON.parse(saved) : [];
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('furia_clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('furia_invoices');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [documentToExport, setDocumentToExport] = useState<{
    type: 'cotizacion' | 'factura';
    number: string;
    date: string;
    client: string;
    items: any[];
    metodoPago?: string;
    observaciones?: string;
  } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
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
    tipoImpresion: '',
    costoImpresion: 0,
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
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        console.log("Iniciando carga de datos desde Sheets...");
        
        let response;
        try {
          response = await fetch(API_URL, {
            method: 'GET',
            redirect: 'follow'
          });
        } catch (getErr) {
          console.warn("GET falló (posible error de CORS), intentando con POST...", getErr);
          response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ accion: "leer" })
          });
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error("Error al parsear JSON de Sheets:", jsonErr);
          throw new Error("La respuesta del servidor no es un JSON válido.");
        }
        
        console.log("Datos recibidos exitosamente:", Object.keys(data));
        
        if (data.Ventas) setSales(data.Ventas);
        if (data.Compras) setPurchases(data.Compras);
        if (data.Clientes) setClients(data.Clientes);
        if (data.Facturas) setInvoices(data.Facturas);
      } catch (err) {
        console.error("Error cargando datos desde Sheets:", err);
        console.warn("Usando datos locales debido al error de conexión.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('furia_sales', JSON.stringify(sales));
    }
  }, [sales, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('furia_purchases', JSON.stringify(purchases));
    }
  }, [purchases, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('furia_product_refs', JSON.stringify(productRefs));
    }
  }, [productRefs, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('furia_clients', JSON.stringify(clients));
    }
  }, [clients, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('furia_invoices', JSON.stringify(invoices));
    }
  }, [invoices, isLoading]);

  const handleExportData = () => {
    const data = {
      sales,
      purchases,
      productRefs,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `furia_rock_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.sales && data.purchases && data.productRefs) {
          if (window.confirm("¿Estás seguro de importar estos datos? Se sobrescribirá la información actual.")) {
            setSales(data.sales);
            setPurchases(data.purchases);
            setProductRefs(data.productRefs);
            alert("Datos importados correctamente.");
          }
        } else {
          alert("Archivo de respaldo inválido.");
        }
      } catch (err) {
        alert("Error al leer el archivo.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm("¿ESTÁS COMPLETAMENTE SEGURO? Esta acción borrará TODAS las ventas, compras y referencias personalizadas del navegador. Esta acción no se puede deshacer.")) {
      setSales([]);
      setPurchases([]);
      setProductRefs(PRODUCT_REFERENCES_INITIAL);
      localStorage.clear();
      alert("Sistema reiniciado.");
      window.location.reload();
    }
  };

  const downloadPDF_jsPDF = async () => {
    try {
      const itemsToExport: QuoteItem[] = quoteItems.length > 0
        ? quoteItems
        : [{
            id: 'preview',
            product: currentProduct,
            categoria: inputs.categoria,
            talla: inputs.talla,
            colorCamiseta: inputs.colorCamiseta,
            colorInferior: inputs.colorInferior,
            gramaje: inputs.gramaje,
            diseno: inputs.diseno,
            cmEstampado: inputs.cmEstampado,
            cmCorazon: inputs.cmCorazon,
            qtyPlanchado: inputs.qtyPlanchado,
            costoEmpaque: inputs.costoEmpaque,
            quantity: inputs.quantity,
            results: currentResults,
            tipoImpresion: inputs.tipoImpresion,
            costoImpresion: inputs.costoImpresion
          } as QuoteItem];

      const itemsPdf: PdfDocumentoItem[] = itemsToExport.map((it) => ({
        descripcion: construirDescripcionDocumento(it),
        cantidad: it.quantity,
        valorUnitario: it.results.precioUnidad,
        subtotal: it.results.precioTotal
      }));

      await generarPdfPlantillaExacta({
        tipo: "cuenta_cobro",
        fecha: new Date().toISOString(),
        cliente: inputs.clientName || "CLIENTE",
        observaciones,
        items: itemsPdf
      });
    } catch (error) {
      console.error("Error descargando cotización:", error);
      alert("No se pudo descargar la cotización. Revisa que la plantilla esté en public/plantilla-cuenta-cobro.png");
    }
  };

  const handleGenerateQuote = () => {
    if (quoteItems.length === 0 && !inputs.clientName) return alert("Ingresa al menos el nombre del cliente.");
    downloadPDF_jsPDF();
  };

  const handleDownloadInvoice = async (sale: Sale) => {
    try {
      setIsLoading(true);
      const invoiceItems = sales.filter(s => s.invoiceNumber === sale.invoiceNumber);
      
      const itemsPdf: PdfDocumentoItem[] = invoiceItems.map(s => ({
        descripcion: construirDescripcionDocumento(s),
        cantidad: s.cantidad,
        valorUnitario: s.precioVentaUnitario,
        subtotal: s.totalVenta
      }));

      await generarPdfPlantillaExacta({
        tipo: "factura_venta",
        fecha: sale.fecha,
        cliente: sale.cliente,
        numeroFactura: sale.invoiceNumber.replace('FACT-', ''),
        observaciones: sale.observaciones,
        items: itemsPdf
      });
    } catch (error) {
      console.error("Error descargando factura:", error);
      alert("No se pudo descargar la factura. Revisa que la plantilla esté en public/plantilla-cuenta-cobro.png");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSale = async () => {
    if (quoteItems.length === 0) return alert("No hay items para vender.");
    
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

    const invoiceNumber = getNextNumber('factura');
    const invoiceNumberFull = `FACT-${invoiceNumber}`;

    const newSales: Sale[] = quoteItems.map(item => ({
      id: Date.now() + Math.random(),
      invoiceNumber: invoiceNumberFull,
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
      costoImpresion: item.costoImpresion,
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

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      numero: invoiceNumberFull,
      fecha: new Date().toISOString().split('T')[0],
      cliente: inputs.clientName || "Cliente General",
      total: newSales.reduce((acc, s) => acc + s.totalVenta, 0),
      estado: 'Pendiente'
    };
    setInvoices(prev => [...prev, newInvoice]);

    const existingClient = clients.find(c => c.nombre === (inputs.clientName || "Cliente General"));
    if (!existingClient) {
      const newClient: Client = {
        id: Date.now().toString(),
        nombre: inputs.clientName || "Cliente General",
        telefono: "",
        ciudad: "",
        direccion: "",
        notas: ""
      };
      setClients(prev => [...prev, newClient]);
      await syncWithSheets("Clientes", newClient);
    }

    for (const sale of newSales) {
      await syncWithSheets("Ventas", {
        ...sale,
        colorSuperior: sale.colorCamiseta
      });
    }
    await syncWithSheets("Facturas", newInvoice);

    setDocumentToExport({
      type: 'factura',
      number: invoiceNumber,
      date: new Date().toLocaleDateString("es-CO"),
      client: inputs.clientName || "Cliente General",
      items: quoteItems.map(item => ({
        descripcion: `${item.product.name} (${item.talla} - ${item.colorCamiseta}${item.tipoImpresion ? ` - ${item.tipoImpresion}` : ''})`,
        cantidad: item.quantity,
        valor: item.results.precioUnidad,
        subtotal: item.results.precioTotal
      })),
      metodoPago: "Pendiente",
      observaciones: observaciones
    });
    setShowExportModal(true);

    setQuoteItems([]);
    setInputs(prev => ({ ...prev, clientName: "" }));
    setObservaciones("");
    setActiveTab('ventas');
    alert("¡Venta registrada y factura generada!");
  };

  // ── CAMBIO 1: handleAddSale ahora sincroniza con Sheets ──────────────────
  const handleAddSale = async (sale: Sale) => {
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
    const saleWithInvoice = { ...sale, invoiceNumber };

    setSales(prev => [...prev, saleWithInvoice]);
    await syncWithSheets("Ventas", saleWithInvoice); // ← NUEVO
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
    await syncWithSheets("Compras", purchase);
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
    const costoImpresion = Number(inputs.costoImpresion) || 0;
    
    const costoTotalUnidad = base + estampadoPrincipal + estampadoCorazon + costoPlanchado + empaque + costoImpresion;
    
    const gananciaBase = (inputs.categoria === 'Niño' && isConjuntoItem) ? GANANCIA_NINO : GANANCIA_ADULTO;
    const precioSugerido = costoTotalUnidad + gananciaBase;
    
    const precioUnidad = Math.ceil(precioSugerido / 500) * 500;
    
    const gananciaReal = precioUnidad - costoTotalUnidad;
    
    return {
      costoBase: base,
      costoEstampado: estampadoPrincipal,
      costoCorazon: estampadoCorazon,
      costoPlanchado: costoPlanchado,
      costoEmpaque: empaque,
      costoImpresion,
      costoTotal: costoTotalUnidad,
      precioUnidad,
      precioTotal: precioUnidad * inputs.quantity,
      ganancia: gananciaReal,
      margen: (gananciaReal / precioUnidad) * 100
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
      costoImpresion: inputs.costoImpresion,
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">
                  Tipo de Impresión
                </label>
                <select
                  value={inputs.tipoImpresion}
                  onChange={(e) =>
                    setInputs({
                      ...inputs,
                      tipoImpresion: e.target.value as '' | 'DTG' | 'DTF',
                      costoImpresion: 0
                    })
                  }
                  className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                >
                  <option value="">Seleccionar...</option>
                  <option value="DTG">DTG</option>
                  <option value="DTF">DTF</option>
                </select>
              </div>

              {inputs.tipoImpresion && (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <label className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-widest px-1">
                    Costo {inputs.tipoImpresion}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inputs.costoImpresion}
                    onChange={(e) =>
                      setInputs({
                        ...inputs,
                        costoImpresion: Number(e.target.value)
                      })
                    }
                    placeholder={`Ej: ${inputs.tipoImpresion === 'DTG' ? '38000' : '18000'}`}
                    className="w-full bg-[#0b0b0d] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:ring-2 focus:ring-[#ff7a00] outline-none transition-all"
                  />
                </div>
              )}
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
                tipoImpresion: '',
                costoImpresion: 0,
                cmEstampado: 0,
                cmCorazon: 0,
                qtyPlanchado: 1,
                costoEmpaque: COSTO_EMPAQUE,
                gramaje: "200g",
                diseno: ""
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
                {currentResults.costoImpresion > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#8f97a6] text-[10px] uppercase font-bold tracking-widest">Costo {inputs.tipoImpresion}</span>
                    <span className="text-white font-bold">{formatCOP(currentResults.costoImpresion)}</span>
                  </div>
                )}
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
                onClick={handleGenerateQuote} 
                disabled={quoteItems.length === 0 && !inputs.clientName} 
                className="bg-[#ff7a00] hover:bg-[#ff8f26] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-3 text-[10px] tracking-widest transition-all shadow-lg shadow-[#ff7a00]/20 active:scale-95 disabled:opacity-20"
              >
                <FileText size={16} /> GENERAR COTIZACIÓN
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

          {/* Modal de Exportación */}
      {showExportModal && documentToExport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1a1d24] w-full max-w-5xl rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Vista Previa del Documento</h2>
                <p className="text-[10px] text-[#ff7a00] font-bold uppercase tracking-widest mt-1">
                  {documentToExport.type === 'factura' ? 'Factura de Venta' : 'Cotización'} #{documentToExport.number}
                </p>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[#8f97a6] hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 flex flex-col lg:flex-row gap-10">
              <div className="flex-1 bg-zinc-900 rounded-3xl p-8 border border-white/5 overflow-auto max-h-[600px] flex justify-center">
                <div className="origin-top scale-[0.6] sm:scale-[0.8] lg:scale-[1]">
                  <DocumentTemplate 
                    {...documentToExport}
                    logoUrl={LOGO_FURIA}
                    paymentInfo={documentToExport.type === 'cotizacion' ? `Bancolombia Ahorros: ${DATOS_COBRO.nequi}\nNequi: ${DATOS_COBRO.nequi}\nTitular: ${DATOS_COBRO.beneficiario}` : undefined}
                  />
                </div>
              </div>

              <div className="w-full lg:w-80 space-y-6">
                <div className="panel p-8 bg-white/5 border-white/10">
                  <h3 className="text-[10px] font-bold text-[#8f97a6] uppercase tracking-[0.3em] mb-6">Opciones de Descarga</h3>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={async () => {
                        if (!documentToExport) return;
                        try {
                          setIsLoading(true);
                          const itemsPdf: PdfDocumentoItem[] = documentToExport.items.map(it => ({
                            descripcion: it.descripcion,
                            cantidad: it.cantidad,
                            valorUnitario: it.valor,
                            subtotal: it.subtotal
                          }));

                          await generarPdfPlantillaExacta({
                            tipo: documentToExport.type === 'cotizacion' ? 'cuenta_cobro' : 'factura_venta',
                            fecha: documentToExport.date,
                            cliente: documentToExport.client,
                            numeroFactura: documentToExport.type === 'factura' ? documentToExport.number : null,
                            observaciones: documentToExport.observaciones,
                            items: itemsPdf
                          });
                        } catch (err) {
                          alert("Error al generar el PDF.");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full bg-[#ff7a00] hover:bg-[#ff8f26] text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-xs tracking-widest transition-all shadow-lg shadow-[#ff7a00]/20"
                    >
                      <FileText size={20} /> DESCARGAR PDF
                    </button>

                    <button 
                      onClick={() => downloadImage(`document-to-export-${documentToExport.type}`, `FuriaRock_${documentToExport.type}_${documentToExport.number}.png`)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-5 rounded-2xl border border-white/10 flex items-center justify-center gap-3 text-xs tracking-widest transition-all"
                    >
                      <ImageIcon size={20} /> DESCARGAR IMAGEN
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                  <div className="flex gap-3">
                    <Info size={18} className="text-[#ff7a00] shrink-0" />
                    <p className="text-[10px] text-[#b9c0cc] leading-relaxed">
                      El documento se generará con alta resolución. Asegúrate de que los datos sean correctos antes de descargar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
              <div className="bg-zinc-900 p-6 rounded-2xl border border-orange-500/20 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                <p className="text-white font-bold text-xs uppercase tracking-widest">Sincronizando con Sheets...</p>
              </div>
            </div>
          )}

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
              <div className="text-[10px] text-[#8f97a6] uppercase font-bold mb-1 tracking-widest">Estado</div>
              <div className="text-xs font-bold text-[#4ade80] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></div> EN LÍNEA
              </div>
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
            onDownloadInvoice={handleDownloadInvoice}
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
            clients={clients}
            onExportExcel={handleExportExcel}
          />
        )}

        {activeTab === 'inventarios' && (
          <Inventarios inventory={inventoryData} />
        )}

        {activeTab === 'clientes' && (
          <Clientes 
            clients={clients} 
            onAddClient={async (client) => {
              setClients(prev => [...prev, client]);
              await syncWithSheets("Clientes", client); // ← CAMBIO 2
            }} 
          />
        )}

        {activeTab === 'facturacion' && (
          <Facturacion 
            invoices={invoices} 
            onUpdateStatus={async (id, status) => {
              setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, estado: status } : inv));
            }} 
          />
        )}

        {activeTab === 'config' && (
          <div className="space-y-10">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Configuración y Datos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="panel p-8 bg-[#1a1d24] border border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#ff7a00]"></div> Respaldo de Información
                </h3>
                <p className="text-xs text-[#8f97a6] mb-8 leading-relaxed">
                  Descarga una copia de seguridad de toda tu base de datos (ventas, compras y productos). 
                  Puedes guardar este archivo en tu computador o en la nube para restaurarlo en cualquier momento.
                </p>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handleExportData}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] tracking-widest transition-all border border-white/10"
                  >
                    <Download size={16} /> EXPORTAR RESPALDO (.JSON)
                  </button>
                  
                  <label className="bg-[#ff7a00] hover:bg-[#ff8f26] text-white font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] tracking-widest transition-all shadow-lg shadow-[#ff7a00]/20 cursor-pointer">
                    <Upload size={16} /> IMPORTAR RESPALDO (.JSON)
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="panel p-8 bg-[#1a1d24] border border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div> Zona de Peligro
                </h3>
                <p className="text-xs text-[#8f97a6] mb-8 leading-relaxed">
                  Estas acciones son irreversibles. Ten cuidado al ejecutarlas. 
                  Se recomienda realizar un respaldo antes de proceder.
                </p>
                <button 
                  onClick={handleClearData}
                  className="w-full bg-transparent hover:bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] tracking-widest transition-all"
                >
                  <Trash2 size={16} /> REINICIAR TODO EL SISTEMA
                </button>
              </div>
            </div>

            <div className="panel p-8 bg-[#1a1d24] border border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#b9c0cc]"></div> Información del Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Ventas Registradas</p>
                  <p className="text-xl font-bold text-white">{sales.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Compras Registradas</p>
                  <p className="text-xl font-bold text-white">{purchases.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-bold text-[#8f97a6] uppercase tracking-widest mb-1">Referencias de Producto</p>
                  <p className="text-xl font-bold text-white">{productRefs.length}</p>
                </div>
              </div>
            </div>
          </div>
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
