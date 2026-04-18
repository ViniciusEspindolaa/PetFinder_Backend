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
  raca: z.string().max(40).optional(),
  porte: z.enum(['PEQUENO', 'MEDIO', 'GRANDE']).optional(),
  cor: z.string().max(20).optional(),
  sexo: z.enum(['MACHO', 'FEMEA', 'INDEFINIDO']).optional(),
  idade: z.number().min(0).optional(),
  unidadeIdade: z.enum(['ANOS', 'MESES']).optional(),
  urgencia: z.enum(['BAIXA', 'MEDIA', 'ALTA']).optional(),
  condicao_medica: z.string().max(255).optional()
});

const d = {
  usuarioId: '123',
  titulo: 'Pet para resgate - auauau',
  descricao: 'ajuda ai galera auauau',
  latitude: -22,
  longitude: -42,
  endereco_texto: 'Rua do Teste',
  tipo: 'RESGATE',
  especie: 'CACHORRO',
  urgencia: 'MEDIA',
  fotos_urls: []
};

const result = petResgateSchema.safeParse(d);
console.log(JSON.stringify(result.success ? 'Valid' : result.error.issues, null, 2));
