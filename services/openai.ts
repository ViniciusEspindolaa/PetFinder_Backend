import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const gerarVetorBusca = async (texto: string): Promise<number[] | null> => {
  if (!texto) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(texto);
    
    return result.embedding.values;
  } catch (error) {
    console.error('Erro ao gerar vetor de busca com Gemini:', error);
    return null;
  }
};
