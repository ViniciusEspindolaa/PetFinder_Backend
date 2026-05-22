import { Router, Request, Response } from "express"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { verificarToken } from "../middleware/auth"

const router = Router()
const prisma = new PrismaClient()

const agendamentoSchema = z.object({
  servicoId: z.number(),
  data_hora: z.string().datetime().optional().nullable(),
  horario_agendado: z.string().optional().nullable(),
  turno_agendado: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  forma_pagamento: z.enum(["CARTAO", "PIX", "DINHEIRO"]),
  valor_simulado: z.number().positive(),
  usuarioId: z.string(),
})

// POST - Criar agendamento
router.post("/", verificarToken, async (req: Request, res: Response) => {
  try {
    const tokenData = (req as any).usuario

    const dados = agendamentoSchema.parse({
      ...req.body,
      usuarioId: tokenData.id,
    })

    // Verificar se serviço existe
    const servico = await prisma.servico.findUnique({
      where: { id: dados.servicoId },
    })

    if (!servico) {
      return res.status(404).json({ erro: "Serviço não encontrado" })
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

export default router
