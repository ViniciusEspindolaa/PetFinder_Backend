import { prisma } from "../config/prisma"
import { Router } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { getEmailTemplate } from "../utils/emailTemplate"

const router = Router()

// Schema de validação para eventos
const eventoSchema = z.object({
  usuarioId: z.string().min(1, { message: "ID do usuário é obrigatório" }),
  titulo: z.string().min(5, { message: "Título deve possuir, no mínimo, 5 caracteres" }).max(100),
  descricao: z.string().min(10, { message: "Descrição deve possuir, no mínimo, 10 caracteres" }),
  fotos_urls: z.array(z.string().url()).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  endereco_texto: z.string().min(5).max(100),
  data_hora_inicio: z.string().datetime({ message: "Data e hora de início são obrigatórias" }),
  data_hora_fim: z.string().datetime({ message: "Data e hora de fim são obrigatórias" }).optional(),
  capacidade_max: z.number().min(1).optional()
}).refine(data => {
  if (data.data_hora_fim) {
    return new Date(data.data_hora_fim) > new Date(data.data_hora_inicio)
  }
  return true
}, {
  message: "Data de fim deve ser posterior à data de início",
  path: ["data_hora_fim"]
})

// Função para enviar email de confirmação de evento
async function enviaEmailEvento(nome: string, email: string, evento: any) {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER || "968f0dd8cc78d9",
      pass: process.env.MAILTRAP_PASS || "89ed8bfbf9b7f9"
    }
  });

  const content = `
    <h2>Olá ${nome}!</h2>
    <p>Seu evento foi criado com sucesso no PetFinder:</p>
    
    <div class="info-box">
      <h3>${evento.titulo}</h3>
      <p><strong>Descrição:</strong> ${evento.descricao}</p>
      <p><strong>Local:</strong> ${evento.endereco_texto}</p>
      <p><strong>Data de Início:</strong> ${new Date(evento.data_hora_inicio).toLocaleString('pt-BR')}</p>
      ${evento.data_hora_fim ? `<p><strong>Data de Fim:</strong> ${new Date(evento.data_hora_fim).toLocaleString('pt-BR')}</p>` : ''}
      ${evento.capacidade_max ? `<p><strong>Capacidade Máxima:</strong> ${evento.capacidade_max} pessoas</p>` : ''}
    </div>

    <p>Esperamos que seu evento seja um sucesso!</p>
    
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/eventos/${evento.id}" class="button" style="color: #ffffff;">Ver Evento</a>
    </div>
  `;

  const htmlContent = getEmailTemplate("Evento Criado com Sucesso - PetFinder", content);

  const info = await transporter.sendMail({
    from: 'petfinder@gmail.com',
    to: email,
    subject: "Evento Criado com Sucesso - PetFinder",
    html: htmlContent
  });

  console.log("Email de evento enviado: %s", info.messageId);
}

// GET - Listar todos os eventos
router.get("/", async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      include: {
        usuario: true
      },
      orderBy: { data_hora_inicio: 'asc' }
    })
    res.status(200).json(eventos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// GET - Buscar eventos próximos (próximos 30 dias)
router.get("/proximos", async (req, res) => {
  try {
    const agora = new Date()
    const proximoMes = new Date()
    proximoMes.setDate(agora.getDate() + 30)

    const eventos = await prisma.evento.findMany({
      where: {
        data_hora_inicio: {
          gte: agora,
          lte: proximoMes
        },
        status: 'AGENDADO'
      },
      include: {
        usuario: true
      },
      orderBy: { data_hora_inicio: 'asc' }
    })
    res.status(200).json({
      periodo: "Próximos 30 dias",
      total: eventos.length,
      eventos
    })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// GET - Buscar eventos por usuário
router.get("/usuario/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params
  
  try {
    const eventos = await prisma.evento.findMany({
      where: { usuarioId },
      include: {
        usuario: true
      },
      orderBy: { data_hora_inicio: 'desc' }
    })
    
    res.status(200).json({
      usuario_id: usuarioId,
      total_eventos: eventos.length,
      eventos
    })
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// GET - Buscar eventos por texto
router.get("/buscar/:termo", async (req, res) => {
  const { termo } = req.params
  
  try {
    const eventos = await prisma.evento.findMany({
      where: {
        OR: [
          {
            titulo: {
              contains: termo,
              mode: 'insensitive'
            }
          },
          {
            descricao: {
              contains: termo,
              mode: 'insensitive'
            }
          },
          {
            endereco_texto: {
              contains: termo,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        usuario: true
      },
      orderBy: { data_hora_inicio: 'asc' }
    })
    
    res.status(200).json({
      termo_busca: termo,
      total: eventos.length,
      eventos
    })
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// GET - Buscar evento por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const evento = await prisma.evento.findUnique({
      where: { id: Number(id) },
      include: {
        usuario: true
      }
    })
    
    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }
    
    res.status(200).json(evento)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// POST - Criar novo evento
router.post("/", async (req, res) => {
  const valida = eventoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { usuarioId, titulo, descricao, fotos_urls, latitude, longitude, 
          endereco_texto, data_hora_inicio, data_hora_fim, capacidade_max } = valida.data

  try {
    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    })

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const evento = await prisma.evento.create({
      data: {
        usuarioId,
        titulo,
        descricao,
        fotos_urls: fotos_urls || [],
        latitude,
        longitude,
        endereco_texto,
        data_hora_inicio: new Date(data_hora_inicio),
        data_hora_fim: data_hora_fim ? new Date(data_hora_fim) : null,
        capacidade_max,
        vagas_ocupadas: 0
      },
      include: {
        usuario: true
      }
    })

    // Enviar email de confirmação
    try {
      await enviaEmailEvento(
        evento.usuario.nome,
        evento.usuario.email,
        evento
      );
    } catch (emailError) {
      console.error("Erro ao enviar email de confirmação:", emailError);
    }

    res.status(201).json(evento)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// PUT - Atualizar evento
router.put("/:id", async (req, res) => {
  const { id } = req.params

  const valida = eventoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { usuarioId, titulo, descricao, fotos_urls, latitude, longitude, 
          endereco_texto, data_hora_inicio, data_hora_fim, capacidade_max } = valida.data

  try {
    const evento = await prisma.evento.update({
      where: { id: Number(id) },
      data: {
        usuarioId,
        titulo,
        descricao,
        fotos_urls: fotos_urls || [],
        latitude,
        longitude,
        endereco_texto,
        data_hora_inicio: new Date(data_hora_inicio),
        data_hora_fim: data_hora_fim ? new Date(data_hora_fim) : null,
        capacidade_max
      },
      include: {
        usuario: true
      }
    })
    res.status(200).json(evento)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }
    res.status(400).json({ erro: error })
  }
})

// DELETE - Remover evento
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const evento = await prisma.evento.delete({
      where: { id: Number(id) }
    })
    
    res.status(200).json({
      message: "Evento removido com sucesso",
      evento_removido: evento
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }
    res.status(400).json({ erro: error })
  }
})

// PATCH - Alterar status do evento
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const statusValidos = ['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']
  
  if (!status || !statusValidos.includes(status)) {
    return res.status(400).json({ 
      erro: "Status inválido", 
      status_validos: statusValidos 
    })
  }

  try {
    const evento = await prisma.evento.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        usuario: true
      }
    })
    res.status(200).json(evento)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ erro: "Evento não encontrado" })
    }
    res.status(400).json({ erro: error })
  }
})

export default router