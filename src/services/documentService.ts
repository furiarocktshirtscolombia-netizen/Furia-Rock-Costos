import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

export const getNextNumber = (type: 'factura' | 'cotizacion'): string => {
  const key = type === 'factura' 
    ? 'furia_factura_number' 
    : 'furia_cotizacion_number';
  
  const current = Number(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, current.toString());
  
  return String(current).padStart(5, '0');
};

export const downloadPDF = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const opt = {
    margin: 0,
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
  };

  html2pdf().set(opt).from(element).save();
};

export const downloadImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
