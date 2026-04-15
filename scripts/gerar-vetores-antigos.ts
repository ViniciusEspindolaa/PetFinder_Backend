import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  console.log('Iniciando a geração de vetores para as publicações antigas...');

  // Busca todas as publicações
  const publicacoes = await prisma.publicacao.findMany({
    select: {
      id: true,
      tipo: true,
      titulo: true,
      descricao: true,
      especie: true,
      raca: true,
      cor: true,
      endereco_texto: true
    }
  });

  console.log(`Encontradas ${publicacoes.length} publicações no banco.`);

  for (const pub of publicacoes) {
    console.log(`Processando publicação ID: ${pub.id} - ${pub.titulo}`);
    
    // Monta um texto rico com as características do pet para a IA entender o contexto
    const textoParaVetor = `
      Tipo: ${pub.tipo}
      Título: ${pub.titulo}
      Espécie: ${pub.especie || 'Não informada'}
      Raça: ${pub.raca || 'Não informada'}
      Cor: ${pub.cor || 'Não informada'}
      Local: ${pub.endereco_texto || 'Não informado'}
      Descrição: ${pub.descricao}
    `.trim();

    try {
      const resposta = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textoParaVetor,
      });

      const embedding = resposta.data[0].embedding;

      // Atualiza usando query bruta (RAW) porque o Prisma trata vector como Unsupported
      // O pgvector aceita o vetor no formato de array JSON stringificado
      const embeddingString = `[${embedding.join(',')}]`;
      
      await prisma.$executeRawUnsafe(
        `UPDATE publicacoes SET vetor_busca = $1::vector WHERE id = $2`,
        embeddingString,
        pub.id
      );

      console.log(`✅ Vetor gerado e salvo para a publicação ID: ${pub.id}`);
    } catch (error) {
      console.error(`❌ Erro ao gerar vetor para o ID: ${pub.id}`, error);
    }
    
    // Pequeno delay para não sobrecarregar a API da OpenAI (Rate Limit)
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('🎉 Processo concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro fatal no script:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
