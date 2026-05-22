import { Router, Request, Response } from "express"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { verificarToken } from "../middleware/auth"

const router = Router()
const prisma = new PrismaClient()

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
  atende_domicilio: z.boolean().optional().default(false),
  taxa_domicilio: z.number().optional().nullable(),
})

// === ROTAS PÚBLICAS ===

// Listar serviços
router.get("/", async (req, res) => {
  try {
    const { categoria, pagina = 1, limite = 10, search, usuario_id } = req.query

    const where: any = {}

    if (categoria) where.tipo = categoria
    if (req.query.cidade) where.cidade = { contains: req.query.cidade, mode: 'insensitive' }
    if (req.query.abertoAgora === 'true') { 
      const agora = new Date(); 
      const horaAtual = agora.toTimeString().slice(0, 5); 
      where.AND = [ { hora_inicio: { lte: horaAtual } }, { hora_fim: { gte: horaAtual } } ] 
    }
    if (search) {
      where.OR = [
        { nome: { contains: search as string, mode: "insensitive" } },
        { descricao: { contains: search as string, mode: "insensitive" } },
      ]
    }
    if (usuario_id) {
      where.usuarioId = usuario_id
    }

    const skip = (parseInt(pagina as string) - 1) * parseInt(limite as string)

    const servicos = await prisma.servico.findMany({
      where,
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
      skip,
      take: parseInt(limite as string),
      orderBy: { data_criacao: "desc" },
    })

    const total = await prisma.servico.count({ where })

    res.json({
      servicos,
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
      return res.status(400).json({ error: "Latitude e longitude sÃ£o obrigatÃ³rias" })
    }

    const lat = parseFloat(latitude as string)
    const lon = parseFloat(longitude as string)
    const raioKm = parseFloat(raio as string)

    // FÃ³rmula de Haversine para distÃ¢ncia em km
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
      WHERE (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) * 
         cos(radians(${lon}) - radians(longitude)) + 
         sin(radians(${lat})) * sin(radians(latitude)))) <= ${raioKm}
      ORDER BY distancia_km ASC
      LIMIT 20
    `

    res.json(servicos)
  } catch (error) {
    console.error("Erro ao buscar serviÃ§os prÃ³ximos:", error)
    res.status(500).json({ error: "Erro ao buscar serviÃ§os prÃ³ximos" })
  }
})

// GET - ServiÃ§os de um usuÃ¡rio especÃ­fico
router.get("/usuario/:usuarioId", async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params

    const servicos = await prisma.servico.findMany({
      where: { usuarioId },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
      orderBy: { data_criacao: "desc" },
    })

    res.json(servicos)
  } catch (error) {
    console.error("Erro ao buscar serviÃ§os do usuÃ¡rio:", error)
    res.status(500).json({ error: "Erro ao buscar serviÃ§os do usuÃ¡rio" })
  }
})

// GET - Detalhe de um serviÃ§o
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
    })

    if (!servico) {
      return res.status(404).json({ error: "ServiÃ§o nÃ£o encontrado" })
    }

    res.json(servico)
  } catch (error) {
    console.error("Erro ao buscar serviÃ§o:", error)
    res.status(500).json({ error: "Erro ao buscar serviÃ§o" })
  }
})

// POST - Criar novo serviÃ§o
router.post("/", verificarToken, async (req: Request, res: Response) => {
  try {
    const tokenData = (req as any).usuario

    const dados = servicoSchema.parse({
      ...req.body,
      usuarioId: tokenData.id,
    })

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
        especies_atendidas: dados.especies_atendidas as any,
        dias_funcionamento: dados.dias_funcionamento,
        hora_inicio: dados.hora_inicio || null,
        hora_fim: dados.hora_fim || null,
        duracao_agendamento: dados.duracao_agendamento || null,
        atende_domicilio: dados.atende_domicilio,
        taxa_domicilio: dados.taxa_domicilio || null,
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
    })

    res.status(201).json(servico)
  } catch (error: any) {
    console.error("Erro ao criar serviÃ§o:", error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    res.status(500).json({ error: "Erro ao criar serviÃ§o" })
  }
})

// PUT - Atualizar serviÃ§o
router.put("/:id", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
    })

    if (!servico) {
      return res.status(404).json({ error: "ServiÃ§o nÃ£o encontrado" })
    }

    if (servico.usuarioId !== tokenData.id) {
      return res.status(403).json({ error: "VocÃª nÃ£o tem permissÃ£o para editar este serviÃ§o" })
    }

    const dados = servicoSchema.partial().parse(req.body)

    const servicoAtualizado = await prisma.servico.update({
      where: { id: parseInt(id) },
      data: {
        ...dados,
        especies_atendidas: dados.especies_atendidas as any,
        usuarioId: undefined, // NÃ£o permite mudar usuÃ¡rio
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
    })

    res.json(servicoAtualizado)
  } catch (error: any) {
    console.error("Erro ao atualizar serviÃ§o:", error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    res.status(500).json({ error: "Erro ao atualizar serviÃ§o" })
  }
})

// DELETE - Deletar serviÃ§o
router.delete("/:id", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
    })

    if (!servico) {
      return res.status(404).json({ error: "ServiÃ§o nÃ£o encontrado" })
    }

    if (servico.usuarioId !== tokenData.id) {
      return res.status(403).json({ error: "VocÃª nÃ£o tem permissÃ£o para deletar este serviÃ§o" })
    }

    await prisma.servico.delete({
      where: { id: parseInt(id) },
    })

    res.json({ message: "ServiÃ§o deletado com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar serviÃ§o:", error)
    res.status(500).json({ error: "Erro ao deletar serviÃ§o" })
  }
})

// PATCH - Atualizar avaliaÃ§Ã£o
router.patch("/:id/avaliar", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { avaliacao } = req.body

    if (typeof avaliacao !== "number" || avaliacao < 0 || avaliacao > 5) {
      return res.status(400).json({ error: "AvaliaÃ§Ã£o deve ser um nÃºmero entre 0 e 5" })
    }

    const servico = await prisma.servico.findUnique({
      where: { id: parseInt(id) },
    })

    if (!servico) {
      return res.status(404).json({ error: "ServiÃ§o nÃ£o encontrado" })
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
    console.error("Erro ao avaliar serviÃ§o:", error)
    res.status(500).json({ error: "Erro ao avaliar serviÃ§o" })
  }
})

export default router
