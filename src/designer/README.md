# Furia Rock Designer - Modulo Disenador de Camisetas

Este modulo es una primera entrega (MVP) del disenador de camisetas, construido
de forma aditiva dentro del repo Furia-Rock-Costos. No modifica la logica de
negocio existente en App.tsx (cotizador, ventas, compras, inventario, etc).

## Como se accede

Se agrego una pestana "Disenador" en la barra de navegacion principal
(src/components/Navigation.tsx). Al hacer clic, la app navega a la URL con
`#/disenador` y recarga; `index.tsx` detecta ese hash y monta `DesignerApp`
en lugar de `App`. Tambien puedes abrirlo directamente en:
`https://tu-dominio.vercel.app/#/disenador`

## Que incluye esta entrega (MVP)

- Layout de 4 zonas: barra superior, panel izquierdo (prenda/color/talla +
biblioteca por categorias con buscador), lienzo central, panel derecho de
propiedades.
- Editor funcional con Fabric.js v6 (cargado por import map, igual que el
resto de dependencias del proyecto, sin necesidad de `npm install` adicional
en este momento): agregar imagenes y texto, mover, escalar, rotar, duplicar,
eliminar, bloquear, centrar horizontal/vertical, guias de alineacion al
centro del area de impresion.
- Cambio de color de prenda en tiempo real (silueta SVG generada por codigo,
ver "Mockup" abajo) sin afectar el diseno superpuesto.
- Alternar frente/espalda.
- Mas de 60 fuentes curadas (data/fonts.ts), cargadas bajo demanda desde
Google Fonts. Se puede ampliar la lista libremente hasta 100+.
- Catalogo de 7 prendas de ejemplo (data/products.ts) con los 7 tipos
pedidos (unisex, oversize, infantil, hoodie, polo, sudadera, tank top) y
10 colores.
- Biblioteca de ejemplo con las 12 categorias pedidas (data/library.ts),
usando miniaturas de marcador de posicion (placehold.co).
- Autoguardado local cada 8 segundos (localStorage) como respaldo.
- Deshacer/rehacer basado en historial de snapshots del lienzo.
- Exportar PNG, agregar al carrito (en memoria) y "Enviar a produccion"
(llama al mismo backend GAS que usa el resto del sistema).

## Mockup (silueta placeholder)

Como no se recibieron fotografias reales de producto, `utils/garmentArt.ts`
genera una silueta SVG basica (3 formas: camiseta/polo, hoodie/sudadera,
tank top) coloreada segun el color elegido. Esto cumple el requisito de
"cambio de color instantaneo sin afectar el diseno", pero NO es todavia el
mockup hiperrealista con sombras y pliegues fotograficos que pide el
proyecto completo. Siguiente paso sugerido: subir fotografias reales
frente/espalda por color a `Garment.imageFront` / `imageBack` (Storage) y
usarlas como `backgroundImage` en `CanvasStage.tsx` en lugar del SVG.

## Pendiente para siguientes entregas (no incluido en este MVP)

- Autenticacion de usuarios (cliente/admin).
- Panel administrativo (CRUD de prendas, categorias, diseños, precios,
promociones, usuarios, pedidos).
- Historial real de diseños por cliente (fetchSavedDesigns ya esta
declarado en utils/gasApi.ts, falta el endpoint en Apps Script).
- Exportar PDF (se puede reutilizar jsPDF, ya es dependencia del proyecto).
- Eliminar fondo blanco automaticamente al subir imagenes.
- Curvatura/arco de texto (el modelo de datos ya reserva el campo `curve`
en types.ts, falta la implementacion visual con Fabric.js paths).
- Subida real de archivos (input file) conectada a Storage.
- Mockup fotografico de alta resolucion con zoom.

## Integracion con el backend (Google Apps Script)

Este sistema usa Google Sheets + Apps Script como base de datos real (no
Firebase), a traves de la variable `GAS_URL` que ya usa App.tsx. Para que
el disenador quede integrado:

1. Abre `src/designer/config.ts` y reemplaza `GAS_URL` por la MISMA URL que
usa `App.tsx` (busca la constante `GAS_URL` en App.tsx y copiala aqui).
2. En tu proyecto de Apps Script (el que ya publica ese GAS_URL), agrega
manejo para 3 nuevas acciones. Sugerencia de esqueleto (ajusta nombres de
hojas y columnas a tu implementacion real):

```
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
    switch (body.action) {
        case 'guardarDiseno':
              return guardarDiseno(body.diseno);
                  case 'crearPedidoDiseno':
                        return crearPedidoDiseno(body);
                            case 'listarDisenosCliente':
                                  return listarDisenosCliente(body.cliente);
                                      default:
                                            // ... dejar el manejo existente de acciones actuales intacto
                                              }
                                              }

                                              function crearPedidoDiseno(payload) {
                                                // 1) Reservar stock en la hoja de Inventario (restar 1 unidad de
                                                  //    payload.garmentRef / payload.colorId / payload.size)
                                                    // 2) Registrar la venta en la hoja de Ventas (igual que hace la app hoy)
                                                      // 3) Guardar payload.printFileUrl como archivo listo para produccion
                                                        // 4) Devolver ContentService.createTextOutput(JSON.stringify({ok:true}))
                                                        }
                                                        ```

                                                        Este esqueleto NO fue pegado automaticamente en `Codigo_Inventario_Central.gs`
                                                        para evitar modificar tu script en produccion sin tu revision directa.

                                                        ## Notas tecnicas importantes

                                                        - Este codigo fue escrito directamente en el editor web de GitHub (sin
                                                        entorno local de build/test). Antes de fusionar a `main`, ejecuta
                                                        localmente `npm install` (agrega `fabric` a package.json/devDependencies
                                                        si tu flujo de build lo requiere fuera del import map) y `npm run dev`
                                                        para verificar que compila y corre sin errores, y ajustar cualquier
                                                        diferencia de API de Fabric.js v6 (por ejemplo `fabric.FabricImage` vs
                                                        `fabric.Image`, `centerObjectH/V`, `bringObjectToFront`) si tu version
                                                        instalada difiere.
                                                        - El SVG de la silueta y los assets de la biblioteca (placehold.co) son
                                                        solo para poder ver y probar el flujo completo; reemplazalos por tus
                                                        propios activos cuando los tengas listos.
                                                        - Los componentes estan pensados para crecer sin rehacer arquitectura:
                                                        nuevas categorias van en `data/library.ts`, nuevas prendas en
                                                        `data/products.ts`, nuevas fuentes en `data/fonts.ts`.
                                                        
