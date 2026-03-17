import React from 'react';
import { QuoteItem, Sale } from '../../types';

interface DocumentTemplateProps {
  type: 'cotizacion' | 'factura';
  number: string;
  date: string;
  client: string;
  items: Array<{
    descripcion: string;
    cantidad: number;
    valor: number;
    subtotal: number;
  }>;
  metodoPago?: string;
  observaciones?: string;
  paymentInfo?: string;
  logoUrl: string;
}

const DocumentTemplate: React.FC<DocumentTemplateProps> = ({
  type,
  number,
  date,
  client,
  items,
  metodoPago,
  observaciones,
  paymentInfo,
  logoUrl
}) => {
  const isFactura = type === 'factura';
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);

  const containerStyle: React.CSSProperties = {
    width: '800px',
    padding: '60px',
    fontFamily: 'Arial, sans-serif',
    background: isFactura ? '#0a0a0a' : '#ffffff',
    color: isFactura ? '#ffffff' : '#000000',
    border: isFactura ? 'none' : '1px solid #e5e7eb',
    boxSizing: 'border-box',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '40px',
  };

  const logoStyle: React.CSSProperties = {
    height: '100px',
    marginBottom: '20px',
    filter: isFactura ? 'invert(1) brightness(2)' : 'none',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    margin: '10px 0',
    textTransform: 'uppercase',
    color: isFactura ? '#ff7a00' : '#1f2937',
  };

  const headerContainerStyle: React.CSSProperties = {
    ...headerStyle,
    background: isFactura ? 'transparent' : '#f9fafb',
    padding: isFactura ? '0' : '40px',
    borderRadius: isFactura ? '0' : '20px',
    border: isFactura ? 'none' : '1px solid #f3f4f6',
    marginBottom: '40px',
  };

  const infoSectionStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '40px',
    fontSize: '14px',
    lineHeight: '1.6',
    padding: isFactura ? '0' : '0 20px',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '40px',
  };

  const thStyle: React.CSSProperties = {
    background: isFactura ? '#1f2937' : '#374151',
    color: '#ffffff',
    padding: '12px 15px',
    textAlign: 'left',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: isFactura ? '1px solid #374151' : '1px solid #e5e7eb',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 15px',
    fontSize: '14px',
    borderBottom: isFactura ? '1px solid #1f2937' : '1px solid #f3f4f6',
  };

  const totalSectionStyle: React.CSSProperties = {
    textAlign: 'right',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: isFactura ? '2px solid #ff7a00' : '2px solid #374151',
  };

  return (
    <div id={`document-to-export-${type}`} style={containerStyle}>
      <div style={headerContainerStyle}>
        <img src={logoUrl} alt="Logo Furia Rock" style={logoStyle} />
        <h1 style={titleStyle}>{isFactura ? 'Factura de Venta' : 'Cotización (Cuenta de Cobro)'}</h1>
      </div>

      <div style={infoSectionStyle}>
        <div>
          <p><strong>N°:</strong> {number}</p>
          <p><strong>Fecha:</strong> {date}</p>
          <p><strong>Cliente:</strong> {client}</p>
          {isFactura && metodoPago && <p><strong>Método de Pago:</strong> {metodoPago}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><strong>FURIA ROCK</strong></p>
          <p>Expertos en DTG & DTF</p>
          <p>Colombia</p>
        </div>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Descripción</th>
            <th style={thStyle}>Cantidad</th>
            <th style={thStyle}>Valor Unitario</th>
            <th style={thStyle}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td style={tdStyle}>{item.descripcion}</td>
              <td style={tdStyle}>{item.cantidad}</td>
              <td style={tdStyle}>${item.valor.toLocaleString('es-CO')}</td>
              <td style={tdStyle}>${item.subtotal.toLocaleString('es-CO')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={totalSectionStyle}>
        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
          TOTAL {isFactura ? 'FACTURA' : 'COTIZACIÓN'}: ${total.toLocaleString('es-CO')}
        </p>
      </div>

      {(observaciones || !isFactura) && (
        <div style={{ marginTop: '40px', fontSize: '12px', color: isFactura ? '#8f97a6' : '#6b7280' }}>
          <p><strong>Observaciones:</strong></p>
          <p>{observaciones || 'Esta cotización tiene una validez de 8 días hábiles.'}</p>
          {!isFactura && (
            <div style={{ marginTop: '20px' }}>
              <p><strong>Datos de Pago:</strong></p>
              <p style={{ whiteSpace: 'pre-line' }}>{paymentInfo || 'Transferencia Bancaria - Bancolombia / Nequi'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentTemplate;
