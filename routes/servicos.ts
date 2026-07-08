import { Router, Request, Response } from "express"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { verificarToken } from "../middleware/auth"
import {
  podePublicarServico,
  motivoNaoPublicado,
  usuarioSelectVerificacao,
  contatoBasicoVerificado,
  identidadeVerificada,
} from "../utils/prestador"

const router = Router()
const prisma = new PrismaClient()

function enriquecerServico(servico: any) {
  const usuario = servico.usuario
  return {
    ...servico,
    prestador_verificado: usuario ? contatoBasicoVerificado(usuario) : false,
    identidade_verificada: usuario ? identidadeVerificada(usuario) : false,
    motivo_nao_publicado: usuario ? motivoNaoPublicado(usuario, servico) : null,
  }
}

const servicoSchema = z.object({
  nome: z.string().min(3).max(100),
  tipo: z.enum([
    "PET_SITTER", "DOG_WALKER", "BANHO_TOSA", "HOSPEDAGEM_CRECHE", "ADESTRADOR",
    "VETERINARIO", "PET_SHOP", "TREINADOR", "PASSEADOR", "HOSPEDAGEM", "GROOMING", "OUTROS"
  ]),
  descricao: z.string().min(10),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  link_rede_social: z.string().optional().or(z.literal('')),
  endereco_texto: z.string().min(5).max(255),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  horario: z.string().optional(),
  oferece_agendamento: z.boolean().optional().default(false),
  tipo_agendamento: z.string().optional().nullable(),
  fotos_urls: z.array(z.string()).optional().default([]),
  usuarioId: z.string(),
  // Novos campos
  valor_base: z.number().optional().nullable(),
  variacoes: z.array(z.object({
    nome: z.string(),
    preco: z.number()
  })).optional().default([]),
  especies_atendidas: z.array(z.enum(["CACHORRO", "GATO", "OUTRO"])).optional().default([]),
  dias_funcionamento: z.array(z.string()).optional().default([]),
  hora_inicio: z.string().optional().nullable(),
  hora_fim: z.string().optional().nullable(),
  duracao_agendamento: z.number().optional().nullable(),
  horarios_bloqueados: z.array(z.string()).optional().default([]),
  capacidade_por_slot: z.number().int().optional().nullable(),
  vagas_disponiveis: z.number().int().optional().nullable(),
  atende_domicilio: z.boolean().optional().default(false),
  taxa_domicilio: z.number().optional().nullable(),
})

// === ROTAS PÚBLICAS ===

// Listar serviços
router.get("/", async (req, res) => {
  try {
    const { categoria, pagina = 1, limite = 10, search, usuario_id } = req.query

    const where: any = {}
    const andConditions: any[] = []

    if (categoria) where.tipo = categoria

    if (req.query.abertoAgora === 'true') {
      const agora = new Date()
      const horaAtual = agora.toTimeString().slice(0, 5)
      andConditions.push({ hora_inicio: { lte: horaAtual } }, { hora_fim: { gte: horaAtual } })
    }

    if (search) {
      andConditions.push({
        OR: [
          { nome: { contains: search as string, mode: "insensitive" } },
          { descricao: { contains: search as string, mode: "insensitive" } },
        ]
      })
    }

    if (req.query.cidade) {
      andConditions.push({
        OR: [
          { cidade: { contains: req.query.cidade as string, mode: 'insensitive' } },
          { bairro: { contains: req.query.cidade as string, mode: 'insensitive' } },
          { endereco_texto: { contains: req.query.cidade as string, mode: 'insensitive' } },
        ]
      })
    }

    if (usuario_id) {
      where.usuarioId = usuario_id
    } else {
      where.publicado = true
      where.usuario = {
        telefone_verificado: true,
        email_verificado: true,
        NOT: { foto_perfil: null },
      }
    }

    if (andConditions.length > 0) where.AND = andConditions

    const skip = (parseInt(pagina as string) - 1) * parseInt(limite as string)

    const servicos = await prisma.servico.findMany({
      where,
      include: {
        usuario: { select: usuarioSelectVerificacao() },
      },
      skip,
      take: parseInt(limite as string),
      orderBy: { data_criacao: "desc" },
    })

    const total = await prisma.servico.count({ where })

    res.json({
      servicos: servicos.map(enriquecerServico),
      total,
      pagina: parseInt(pagina as string),
      limite: parseInt(limite as string),
      totalPages: Math.ceil(total / parseInt(limite as string)),
    })
  } catch (error) {
    console.error("Erro ao listar serviços:", error)
    res.status(500).json({ error: "Erro ao listar serviços" })
  }
})

// Buscar serviços próximos
router.get("/proximos", async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, raio = "10" } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude e longitude são obrigatórias" })
    }

    const lat = parseFloat(latitude as string)
    const lon = parseFloat(longitude as string)
    const raioKm = parseFloat(raio as string)

    // Fórmula de Haversine para distância em km
    const servicos = await prisma.$queryRaw`
      SELECT
        s.*,
        u.id as usuario_id,
        u.nome as usuario_nome,
        u.email as usuario_email,
        u.telefone as usuario_telefone,
        (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) *
         cos(radians(${lon}) - radians(longitude)) +
         sin(radians(${lat})) * sin(radians(latitude)))) AS distancia_km
      FROM servicos s
      JOIN usuarios u ON s."usuarioId" = u.id
      WHERE s.publicado = true
      AND u.telefone_verificado = true
      AND u.email_verificado = true
      AND u.foto_perfil IS NOT NULL
      AND (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) *
         cos(radians(${lon}) - radians(longitude)) +
         sin(radians(${lat})) * sin(radians(latitude)))) <= ${raioKm}
      ORDER BY distancia_km ASC
      LIMIT 20
    `

    res.json(servicos)
  } catch (error) {
    console.error("Erro ao buscar serviços próximos:", error)
    res.status(500).json({ error: "Erro ao buscar serviços próximos" })
  }
})

// GET - Serviços de um usuário específico
router.get("/usuario/:usuarioId", async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params

    const servicos = await prisma.servico.findMany({
      where: { usuarioId },
      include: {
        usuario: { select: usuarioSelectVerificacao() },
      },
      orderBy: { data_criacao: "desc" },
    })

    res.json(servicos.map(enriquecerServico))
  } catch (error) {
    console.error("Erro ao buscar serviços do usuário:", error)
    res.status(500).json({ error: "Erro ao buscar serviços do usuário" })
  }
})

// GET - Detalhe de um serviço
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: { select: usuarioSelectVerificacao() },
      },
    })

    if (!servico) {
      return res.status(404).json({ error: "Serviço não encontrado" })
    }

    res.json(enriquecerServico(servico))
  } catch (error) {
    console.error("Erro ao buscar serviço:", error)
    res.status(500).json({ error: "Erro ao buscar serviço" })
  }
})

// POST - Criar novo serviço
router.post("/", verificarToken, async (req: Request, res: Response) => {
  try {
    const tokenData = (req as any).usuario

    const dados = servicoSchema.parse({
      ...req.body,
      usuarioId: tokenData.id,
    })

    const usuario = await prisma.usuario.findUnique({
      where: { id: tokenData.id },
      include: { verificacaoPrestador: true },
    })
    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    const publicado = podePublicarServico(usuario, { atende_domicilio: dados.atende_domicilio ?? false })

    const servico = await prisma.servico.create({
      data: {
        nome: dados.nome,
        tipo: dados.tipo,
        descricao: dados.descricao,
        telefone: dados.telefone || null,
        email: dados.email || null,
        link_rede_social: dados.link_rede_social || null,
        endereco_texto: dados.endereco_texto,
        bairro: dados.bairro || null,
        cidade: dados.cidade || null,
        latitude: dados.latitude,
        longitude: dados.longitude,
        horario: dados.horario || null,
        oferece_agendamento: dados.oferece_agendamento,
        tipo_agendamento: dados.tipo_agendamento || null,
        fotos_urls: dados.fotos_urls || [],
        usuarioId: dados.usuarioId,
        valor_base: dados.valor_base || null,
        variacoes: dados.variacoes ?? [],
        especies_atendidas: dados.especies_atendidas as any,
        dias_funcionamento: dados.dias_funcionamento,
        hora_inicio: dados.hora_inicio || null,
        hora_fim: dados.hora_fim || null,
        duracao_agendamento: dados.duracao_agendamento || null,
        horarios_bloqueados: dados.horarios_bloqueados ?? [],
        capacidade_por_slot: dados.capacidade_por_slot || null,
        vagas_disponiveis: dados.vagas_disponiveis ?? null,
        atende_domicilio: dados.atende_domicilio,
        taxa_domicilio: dados.taxa_domicilio || null,
        publicado,
      },
      include: {
        usuario: { select: usuarioSelectVerificacao() },
      },
    })

    const resposta = enriquecerServico(servico)
    res.status(201).json({
      ...resposta,
      aviso: publicado
        ? null
        : motivoNaoPublicado(usuario, servico) || 'Complete a verificação para publicar seu serviço',
    })
  } catch (error: any) {
    console.error("Erro ao criar serviço:", error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    res.status(500).json({ error: "Erro ao criar serviço" })
  }
})

// PUT - Atualizar serviço
router.put("/:id", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
    })

    if (!servico) {
      return res.status(404).json({ error: "Serviço não encontrado" })
    }

    if (servico.usuarioId !== tokenData.id) {
      return res.status(403).json({ error: "Você não tem permissão para editar este serviço" })
    }

    const dados = servicoSchema.partial().parse(req.body)

    const usuario = await prisma.usuario.findUnique({
      where: { id: tokenData.id },
      include: { verificacaoPrestador: true },
    })
    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    const atendeDomicilio = dados.atende_domicilio ?? servico.atende_domicilio
    const publicado = podePublicarServico(usuario, { atende_domicilio: atendeDomicilio })

    const servicoAtualizado = await prisma.servico.update({
      where: { id: parseInt(id) },
      data: {
        ...dados,
        especies_atendidas: dados.especies_atendidas as any,
        publicado,
        usuarioId: undefined,
      },
      include: {
        usuario: { select: usuarioSelectVerificacao() },
      },
    })

    res.json(enriquecerServico(servicoAtualizado))
  } catch (error: any) {
    console.error("Erro ao atualizar serviço:", error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    res.status(500).json({ error: "Erro ao atualizar serviço" })
  }
})

// PATCH - Ativar/desativar publicação do serviço
router.patch("/:id/toggle-publicado", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { include: { verificacaoPrestador: true } } },
    })

    if (!servico) return res.status(404).json({ error: "Serviço não encontrado" })
    if (servico.usuarioId !== tokenData.id) return res.status(403).json({ error: "Sem permissão" })

    let novoStatus: boolean
    if (servico.publicado) {
      novoStatus = false
    } else {
      novoStatus = podePublicarServico(servico.usuario, { atende_domicilio: servico.atende_domicilio })
      if (!novoStatus) {
        return res.status(400).json({
          error: motivoNaoPublicado(servico.usuario, servico) || "Complete a verificação para publicar o serviço",
        })
      }
    }

    const atualizado = await prisma.servico.update({
      where: { id: parseInt(id) },
      data: { publicado: novoStatus },
      include: { usuario: { select: usuarioSelectVerificacao() } },
    })

    res.json(enriquecerServico(atualizado))
  } catch (error) {
    console.error("Erro ao alternar publicação:", error)
    res.status(500).json({ error: "Erro ao alternar publicação do serviço" })
  }
})

// DELETE - Deletar serviço
router.delete("/:id", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
    })

    if (!servico) {
      return res.status(404).json({ error: "Serviço não encontrado" })
    }

    if (servico.usuarioId !== tokenData.id) {
      return res.status(403).json({ error: "Você não tem permissão para deletar este serviço" })
    }

    const agendamentosAtivos = await prisma.agendamento.count({
      where: { servicoId: parseInt(id), status: { not: "CANCELADO" } },
    })

    if (agendamentosAtivos > 0) {
      return res.status(400).json({
        error: `Não é possível excluir: há ${agendamentosAtivos} agendamento(s) ativo(s). Cancele-os primeiro na página de Agendamentos.`,
      })
    }

    await prisma.servico.delete({
      where: { id: parseInt(id) },
    })

    res.json({ message: "Serviço excluído com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar serviço:", error)
    res.status(500).json({ error: "Erro ao deletar serviço" })
  }
})

// PATCH - Atualizar avaliação
router.patch("/:id/avaliar", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { avaliacao } = req.body

    if (typeof avaliacao !== "number" || avaliacao < 0 || avaliacao > 5) {
      return res.status(400).json({ error: "Avaliação deve ser um número entre 0 e 5" })
    }

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
    })

    if (!servico) {
      return res.status(404).json({ error: "Serviço não encontrado" })
    }

    const media = servico.avaliacoes && servico.total_avaliacoes > 0
      ? ((servico.avaliacoes as any) * servico.total_avaliacoes + avaliacao) / (servico.total_avaliacoes + 1)
      : avaliacao

    const servicoAtualizado = await prisma.servico.update({
      where: { id: parseInt(id) },
      data: {
        avaliacoes: media,
        total_avaliacoes: servico.total_avaliacoes + 1,
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
    })

    res.json(servicoAtualizado)
  } catch (error) {
    console.error("Erro ao avaliar serviço:", error)
    res.status(500).json({ error: "Erro ao avaliar serviço" })
  }
})

export default router
