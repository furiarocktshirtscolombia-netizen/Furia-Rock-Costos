// Cliente HTTP hacia el mismo backend (Google Apps Script) que ya usa
// App.tsx. Reutiliza GAS_URL para que el disenador quede integrado con
// el inventario, ventas y clientes reales de Furia Rock.
// NOTA: las acciones 'guardarDiseno', 'crearPedidoDiseno' y
// 'listarDisenosCliente' deben agregarse en Codigo_Inventario_Central.gs
// (ver snippet sugerido en src/designer/README.md).
import { GAS_URL } from '../config';
import { ProductionOrderPayload, DesignState } from '../types';

async function postToGAS(action: string, payload: object): Promise<any> {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action, ...payload }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error al comunicarse con GAS_URL:', err);
    throw err;
  }
}

export function saveDesignToBackend(design: DesignState) {
  return postToGAS('guardarDiseno', { diseno: design });
}

export function sendProductionOrder(payload: ProductionOrderPayload) {
  return postToGAS('crearPedidoDiseno', payload as unknown as object);
}

export function fetchSavedDesigns(cliente: string) {
  return postToGAS('listarDisenosCliente', { cliente });
}
