
import { GoogleGenAI } from "@google/genai";
import { QuoteResults, QuoteInputs, ProductReference } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSalesAdvice = async (
  inputs: QuoteInputs,
  results: QuoteResults,
  product: ProductReference
) => {
  try {
    const prompt = `
      Actúa como un experto en ventas de ropa rockera para niños y adultos de la marca "Furia Rock Kids".
      
      Datos de la cotización actual:
      - Producto: ${product.name}
      - Talla: ${inputs.talla} (${inputs.categoria})
      - Precio de Venta: $${results.precioSugerido.toLocaleString()} COP
      - Área de estampado: ${inputs.cmEstampado} cm2
      
      Genera un breve discurso de venta (pitch) persuasivo y con estilo rockero para convencer al cliente de comprar esta prenda. Menciona la calidad y el diseño único. Máximo 3 párrafos. Usa un tono rebelde pero profesional.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating sales advice:", error);
    return "¡Sigue rockeando! Esta prenda es única y el precio es justo para la calidad que entregamos.";
  }
};
