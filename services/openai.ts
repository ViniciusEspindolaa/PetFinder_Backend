import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const gerarVetorBusca = async (texto: string): Promise<number[] | null> => {
  if (!texto) return null;

  try {
    const resposta = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto,
    });

    return resposta.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar vetor de busca com OpenAI:', error);
    return null;
  }
};
