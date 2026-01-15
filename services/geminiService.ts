
import { GoogleGenAI, Type } from "@google/genai";
import { WineData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeWineLabel = async (base64Image: string): Promise<WineData> => {
  const prompt = `VOCÊ É UM SISTEMA DE OCR E SOMMELIER ESPECIALISTA COM ACESSO À INTERNET.
  
  ETAPA 1: OCR E IDENTIFICAÇÃO VISUAL
  Analise o rótulo e identifique o vinho (Marca, Safra, Região).
  
  ETAPA 2: BUSCA EM TEMPO REAL (GOOGLE SEARCH)
  Use a ferramenta de busca para encontrar o PREÇO ATUALIZADO deste vinho no mercado brasileiro (e-commerces, adegas). 
  Busque também pontuações recentes.
  
  ETAPA 3: FORMATAÇÃO
  Retorne um JSON preciso. No campo 'estimatedPrice', coloque o valor atual encontrado (ex: "R$ 250,00 - R$ 280,00").
  No campo 'about', seja um sommelier elegante.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nome completo do vinho" },
            producer: { type: Type.STRING, description: "Vinícola produtora" },
            vintage: { type: Type.STRING, description: "Ano da safra" },
            region: { type: Type.STRING, description: "Região" },
            country: { type: Type.STRING, description: "País" },
            type: { type: Type.STRING, enum: ["Red", "White", "Rosé", "Sparkling", "Dessert"] },
            grapes: { type: Type.ARRAY, items: { type: Type.STRING } },
            alcoholContent: { type: Type.STRING },
            score: { type: Type.NUMBER },
            scoreSource: { type: Type.STRING },
            pairing: { type: Type.STRING },
            about: { type: Type.STRING },
            estimatedPrice: { type: Type.STRING, description: "Preço real em BRL encontrado na busca" }
          },
          required: ['name', 'producer', 'vintage', 'score', 'about', 'estimatedPrice']
        }
      }
    });

    if (!response.text) {
      throw new Error("A IA não conseguiu processar a imagem.");
    }

    const rawResult = JSON.parse(response.text);
    
    // Extrair fontes da busca (Grounding)
    const sources: { title: string, uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Fonte de Mercado",
            uri: chunk.web.uri
          });
        }
      });
    }

    return {
      ...rawResult,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      image: `data:image/jpeg;base64,${base64Image}`,
      confidenceLevel: 'Alta',
      searchSources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Erro no Gemini Service:", error);
    throw error;
  }
};
