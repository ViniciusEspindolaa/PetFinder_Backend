import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function main() {
  try {
    console.log("Testando chave do Gemini...");
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent('teste');
    
    console.log("Sucesso! Vetor gerado de tamanho:", result.embedding.values.length);
  } catch (error: any) {
    console.error("Erro do Gemini:");
    console.error(error.message);
  }
}

main();