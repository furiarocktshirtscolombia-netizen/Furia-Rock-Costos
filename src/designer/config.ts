// Configuracion compartida del modulo Disenador.
// IMPORTANTE: pega aqui la MISMA URL de Google Apps Script (GAS_URL) que ya
// usa App.tsx, para que el disenador escriba en las mismas hojas de calculo
// (Inventario, Ventas, Clientes) que usa el resto del sistema Furia Rock.
export const GAS_URL ='https://script.google.com/macros/s/AKfycby9m-yDkajrDZyINyGjsrWW_Efu48IbI9GtjOpU0aIsO_uZsMppobAnIx8hIRU1yYsd/exec';

// Cada cuantos milisegundos se autoguarda el diseno en edicion.
export const AUTOSAVE_INTERVAL_MS = 8000;

// Nombre de la clave usada para el borrador local (respaldo si falla la red).
export const LOCAL_DRAFT_KEY = 'furia_rock_designer_draft_v1';
