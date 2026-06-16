import { Router, Request, Response } from "express"
import { z } from "zod"
import { prisma } from "../config/prisma"
import { verificarToken } from "../middleware/auth"
import {
  contatoBasicoVerificado,
  identidadeVerificada,
  podeAgendarServico,
} from "../utils/prestador"

const router = Router()

const agendamentoSchema = z.object({
  servicoId: z.number(),
  data_hora: z.string().datetime().optional().nullable(),
  horario_agendado: z.string().optional().nullable(),
  turno_agendado: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  forma_pagamento: z.enum(["CARTAO", "PIX", "DINHEIRO"]),
  valor_simulado: z.number().positive(),
  usuarioId: z.string(),
  atendimento_domicilio: z.boolean().optional().default(false),
})

// POST - Criar agendamento
router.post("/", verificarToken, async (req: Request, res: Response) => {
  try {
    const tokenData = (req as any).usuario

    const dados = agendamentoSchema.parse({
      ...req.body,
      usuarioId: tokenData.id,
    })

    // Verificar se serviço existe e prestador está verificado
    const servico = await prisma.servico.findUnique({
      where: { id: dados.servicoId },
      include: {
        usuario: { include: { verificacaoPrestador: true } },
      },
    })

    if (!servico) {
      return res.status(404).json({ erro: "Serviço não encontrado" })
    }

    const prestador = servico.usuario

    if (dados.atendimento_domicilio && !servico.atende_domicilio) {
      return res.status(400).json({ erro: "Este serviço não oferece atendimento em domicílio." })
    }

    if (!podeAgendarServico(prestador, servico, dados.atendimento_domicilio)) {
      if (dados.atendimento_domicilio && !identidadeVerificada(prestador)) {
        return res.status(403).json({
          erro: "Atendimento em domicílio indisponível: o prestador ainda não teve a identidade verificada pela plataforma.",
        })
      }
      return res.status(403).json({
        erro: "O prestador ainda não concluiu a verificação de contato para aceitar agendamentos.",
      })
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        servicoId: dados.servicoId,
        usuarioId: dados.usuarioId,
        data_hora: dados.data_hora ? new Date(dados.data_hora) : new Date(),
        horario_agendado: dados.horario_agendado,
        turno_agendado: dados.turno_agendado,
        observacao: dados.observacao,
        forma_pagamento: dados.forma_pagamento,
        valor_simulado: dados.valor_simulado,
        atendimento_domicilio: dados.atendimento_domicilio,
      },
      include: {
        servico: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    })

    res.status(201).json(agendamento)
  } catch (error: any) {
    console.error("Erro ao criar agendamento:", error)
    res.status(400).json({ erro: error.message })
  }
})

// GET - Listar agendamentos do usuário
router.get("/usuario/:usuarioId", verificarToken, async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params

    const agendamentos = await prisma.agendamento.findMany({
      where: { usuarioId },
      include: {
        servico: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            endereco_texto: true,
            telefone: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: { data_hora: "desc" },
    })

    res.json(agendamentos)
  } catch (error: any) {
    console.error("Erro ao listar agendamentos:", error)
    res.status(400).json({ erro: error.message })
  }
})

// GET - Horários/turnos ocupados em uma data para um serviço (para evitar conflitos no booking)
router.get("/servico/:servicoId/ocupados", async (req: Request, res: Response) => {
  try {
    const { servicoId } = req.params
    const { data } = req.query

    if (!data || typeof data !== 'string') {
      return res.status(400).json({ erro: 'Parâmetro data é obrigatório (YYYY-MM-DD)' })
    }

    const dataInicio = new Date(`${data}T00:00:00.000Z`)
    const dataFim = new Date(`${data}T23:59:59.999Z`)

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        servicoId: parseInt(servicoId),
        status: { not: 'CANCELADO' },
        data_hora: { gte: dataInicio, lte: dataFim },
      },
      select: { horario_agendado: true, turno_agendado: true },
    })

    res.json({
      horarios: agendamentos.map((a) => a.horario_agendado).filter(Boolean) as string[],
      turnos: agendamentos.map((a) => a.turno_agendado).filter(Boolean) as string[],
    })
  } catch (error: any) {
    res.status(500).json({ erro: error.message })
  }
})

// GET - Listar agendamentos do serviço
router.get("/servico/:servicoId", async (req: Request, res: Response) => {
  try {
    const { servicoId } = req.params

    const agendamentos = await prisma.agendamento.findMany({
      where: { servicoId: parseInt(servicoId) },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
      },
      orderBy: { data_hora: "asc" },
    })

    res.json(agendamentos)
  } catch (error: any) {
    console.error("Erro ao listar agendamentos do serviço:", error)
    res.status(400).json({ erro: error.message })
  }
})

// GET - Agendamentos recebidos pelo prestador (agendamentos nos meus serviços)
router.get("/prestador", verificarToken, async (req: Request, res: Response) => {
  try {
    const tokenData = (req as any).usuario

    const agendamentos = await prisma.agendamento.findMany({
      where: { servico: { usuarioId: tokenData.id } },
      include: {
        servico: {
          select: { id: true, nome: true, tipo: true, endereco_texto: true, telefone: true },
        },
        usuario: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
      orderBy: { data_hora: 'asc' },
    })

    res.json(agendamentos)
  } catch (error: any) {
    res.status(500).json({ erro: error.message })
  }
})

// GET - Detalhes do agendamento
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: parseInt(id) },
      include: {
        servico: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
      },
    })

    if (!agendamento) {
      return res.status(404).json({ erro: "Agendamento não encontrado" })
    }

    res.json(agendamento)
  } catch (error: any) {
    console.error("Erro ao buscar agendamento:", error)
    res.status(400).json({ erro: error.message })
  }
})

// PATCH - Confirmar agendamento
router.patch("/:id/confirmar", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario

    // Verificar se agendamento pertence ao usuário do serviço
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: parseInt(id) },
      include: { servico: true },
    })

    if (!agendamento) {
      return res.status(404).json({ erro: "Agendamento não encontrado" })
    }

    if (agendamento.servico.usuarioId !== tokenData.id) {
      return res
        .status(403)
        .json({ erro: "Você não tem permissão para confirmar este agendamento" })
    }

    const atualizado = await prisma.agendamento.update({
      where: { id: parseInt(id) },
      data: { status: "CONFIRMADO" },
      include: {
        servico: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    })

    res.json(atualizado)
  } catch (error: any) {
    console.error("Erro ao confirmar agendamento:", error)
    res.status(400).json({ erro: error.message })
  }
})

// PATCH - Cancelar agendamento
router.patch("/:id/cancelar", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: parseInt(id) },
      include: { servico: true },
    })

    if (!agendamento) {
      return res.status(404).json({ erro: "Agendamento não encontrado" })
    }

    // Pode cancelar se é o usuário que agendou ou o dono do serviço
    if (
      agendamento.usuarioId !== tokenData.id &&
      agendamento.servico.usuarioId !== tokenData.id
    ) {
      return res
        .status(403)
        .json({ erro: "Você não tem permissão para cancelar este agendamento" })
    }

    const atualizado = await prisma.agendamento.update({
      where: { id: parseInt(id) },
      data: { status: "CANCELADO" },
      include: {
        servico: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    })

    res.json(atualizado)
  } catch (error: any) {
    console.error("Erro ao cancelar agendamento:", error)
    res.status(400).json({ erro: error.message })
  }
})

// PATCH - Reagendar agendamento (só PENDENTE, por usuário ou prestador do serviço)
router.patch("/:id/reagendar", verificarToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tokenData = (req as any).usuario
    const { data_hora, horario_agendado, turno_agendado } = req.body

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: parseInt(id) },
      include: { servico: true },
    })

    if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado' })

    if (agendamento.usuarioId !== tokenData.id && agendamento.servico.usuarioId !== tokenData.id) {
      return res.status(403).json({ erro: 'Você não tem permissão para reagendar este agendamento' })
    }

    if (agendamento.status !== 'PENDENTE') {
      return res.status(400).json({ erro: 'Só é possível reagendar agendamentos com status Pendente' })
    }

    const atualizado = await prisma.agendamento.update({
      where: { id: parseInt(id) },
      data: {
        data_hora: data_hora ? new Date(data_hora) : agendamento.data_hora,
        horario_agendado: horario_agendado !== undefined ? horario_agendado : agendamento.horario_agendado,
        turno_agendado: turno_agendado !== undefined ? turno_agendado : agendamento.turno_agendado,
      },
    })

    res.json(atualizado)
  } catch (error: any) {
    res.status(400).json({ erro: error.message })
  }
})

export default router
