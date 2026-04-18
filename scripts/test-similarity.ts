import { PrismaClient } from '@prisma/client';
import { gerarVetorBusca } from '../services/openai';
const prisma = new PrismaClient();
async function main() {
  const v = await gerarVetorBusca('gato preto');
  const res: any[] = await prisma.$queryRawUnsafe("SELECT id, titulo, descricao, (vetor_busca <=> $1::vector) as d FROM publicacoes WHERE vetor_busca IS NOT NULL ORDER BY d ASC LIMIT 10", "[]");
  console.log(res);
} main();
