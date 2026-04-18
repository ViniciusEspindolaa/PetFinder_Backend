import { z } from 'zod';
const publicacaoBaseSchema = z.object({
  usuarioId: z.string(),
  titulo: z.string().min(5),
  descricao: z.string().min(10),
  fotos_urls: z.array(z.string().url()),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  endereco_texto: z.string().min(5).max(100),
  bairro: z.string().min(1).max(60).optional(),
  cidade: z.string().min(1).max(60).optional(),
  telefone_contato: z.string().max(15).optional(),
  tipo: z.enum(['PERDIDO', 'ENCONTRADO', 'ADOCAO', 'RESGATE'])
});
const petResgateSchema = publicacaoBaseSchema.extend({
  especie: z.enum(['CACHORRO', 'GATO', 'OUTRO']),
  nome_pet: z.string().max(40).optional(),
  raca: z.string().max(40).optional(),
  porte: z.enum(['PEQUENO', 'MEDIO', 'GRANDE']).optional(),
  cor: z.string().max(20).optional(),
  sexo: z.enum(['MACHO', 'FEMEA', 'INDEFINIDO']).optional(),
  idade: z.number().min(0).optional(),
  unidadeIdade: z.enum(['ANOS', 'MESES']).optional(),
  urgencia: z.enum(['BAIXA', 'MEDIA', 'ALTA']).optional(),
  condicao_medica: z.string().max(255).optional()
});

const reqBody: any = {
  usuarioId: '244dfc28-e43f-4df6-a98e-dd18e5a19795',
  titulo: 'Pet para resgate - Rex',
  descricao: 'Esse aqui é um teste...',
  latitude: '-22.0',
  longitude: '-46.0',
  endereco_texto: 'Rua Falsa com Nome Muito Longo Mesmo Para Ver Se Estoura O Limite do Zod que é Cem Caracteres Eu Acho',
  tipo: 'RESGATE',
  especie: 'CACHORRO',
  nome_pet: 'Rex',
  porte: 'MEDIO',
  sexo: 'INDEFINIDO',
  data_evento: new Date().toISOString(),
  urgencia: 'MEDIA'
};

const dadosPublicacao = {
  ...reqBody,
  fotos_urls: [],
  latitude: parseFloat(reqBody.latitude),
  bairro: reqBody.bairro || undefined,
  cidade: reqBody.cidade || undefined,
  longitude: parseFloat(reqBody.longitude),
  idade: reqBody.idade ? parseInt(reqBody.idade) : undefined,
  unidadeIdade: reqBody.unidadeIdade || 'ANOS',
  recompensa: reqBody.recompensa ? parseFloat(reqBody.recompensa) : undefined,
  data_evento: reqBody.data_evento ? new Date(reqBody.data_evento) : new Date()
};

const result = petResgateSchema.safeParse(dadosPublicacao);

console.log(JSON.stringify(result.success ? 'Valid' : result.error.issues, null, 2));

