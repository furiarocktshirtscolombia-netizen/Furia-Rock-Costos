// Panel de ayuda / manual de uso del Disenador Furia Rock.
// Explica a cualquier persona que entra como usar el editor,
// sin necesidad de leer el codigo o preguntarle a otra persona.
import React from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="w-full max-w-2xl bg-[#121317] border border-white/10 rounded-2xl p-6 my-8 text-white/90">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white">
            Guia rapida del Disenador Furia Rock
          </h2>
          <button onClick={onClose} className="btn-light text-xs">Cerrar</button>
        </div>

        <p className="text-sm text-white/70 mb-4">
          Este editor permite personalizar una camiseta con textos e imagenes,
          verificar que el diseno imprima con buena calidad, y enviarlo a
          produccion. Esta guia resume que hace cada boton.
        </p>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-bold text-white mb-1">1. Elegir prenda, color y talla</h3>
            <p className="text-white/70">
              En el panel izquierdo selecciona el tipo de prenda (camiseta,
              hoodie, polo, etc.), el color y la talla. El lienzo se actualiza
              de inmediato.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">2. Agregar elementos</h3>
            <p className="text-white/70">
              Usa "+ Agregar texto" para escribir sobre la camiseta, o elige
              una imagen desde "Biblioteca" (filtra por categoria: rock,
              infantil, deportes, etc.). Puedes agregar tantos elementos como
              necesites.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">3. Editar un elemento</h3>
            <p className="text-white/70">
              Selecciona un elemento en el lienzo para ver sus propiedades en
              el panel derecho: posicion, tamano, rotacion, opacidad. Desde
              ahi tambien puedes duplicarlo, bloquearlo, centrarlo o
              eliminarlo.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">4. Medidas reales y calidad de impresion</h3>
            <p className="text-white/70">
              El panel derecho muestra "Medidas reales": cuanta area (en cm2)
              estas usando del area imprimible de esa prenda. Estas medidas
              vienen configuradas por prenda y lado (frente/espalda) y se
              administran desde Google Sheets, por lo que pueden ajustarse sin
              tocar el codigo.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">5. Frente y espalda</h3>
            <p className="text-white/70">
              El boton "Vista: Frente / Espalda" en la barra superior cambia
              el lado de la camiseta que estas editando. Cada lado guarda sus
              propios elementos por separado.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">6. Deshacer, rehacer y autoguardado</h3>
            <p className="text-white/70">
              "Deshacer" y "Rehacer" funcionan como en cualquier editor. El
              diseno tambien se guarda automaticamente como borrador en este
              navegador cada pocos segundos (ves el aviso "Borrador guardado
              HH:MM").
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">7. Guardar, exportar y vista previa</h3>
            <p className="text-white/70">
              "Guardar" envia el diseno al backend. "Exportar PNG" descarga
              una imagen del diseno actual. "Vista previa" y "Exportar PDF"
              estan planeados para una siguiente etapa.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">8. Carrito y produccion</h3>
            <p className="text-white/70">
              "Agregar al carrito" guarda esta combinacion de prenda, color,
              talla y diseno en la lista de abajo. "Enviar a produccion"
              registra el pedido en el sistema de ventas de Furia Rock para
              que el equipo lo procese.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-1">Estado actual del modulo</h3>
            <p className="text-white/70">
              Este Disenador esta en una etapa temprana (MVP). Las medidas de
              impresion ya son reales y configurables, y el envio a
              produccion ya funciona. Funciones como "Abrir diseno guardado",
              exportar PDF, fotografias reales de cada prenda e inteligencia
              artificial para generar disenos todavia estan en desarrollo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
