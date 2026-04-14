import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from "../config/prisma"
import { Router } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { getEmailTemplate } from "../utils/emailTemplate"

const router = Router()

// Schema de validação para avistamentos
const avistamentoSchema = z.object({
  publicacaoId: z.number({ message: "ID da publicação é obrigatório" }),
  usuarioId: z.string().min(1, { message: "ID do usuário é obrigatório" }),
  observacoes: z.string().max(500, { message: "Observações devem ter no máximo 500 caracteres" }).optional(),
  fotos_urls: z.array(z.string().url({ message: "URLs de fotos devem ser válidas" })).optional(),
  latitude: z.number().min(-90).max(90, { message: "Latitude deve estar entre -90 e 90" }),
  longitude: z.number().min(-180).max(180, { message: "Longitude deve estar entre -180 e 180" }),
  endereco_texto: z.string().min(5, { message: "Endereço deve ter no mínimo 5 caracteres" }).max(100, { message: "Endereço deve ter no máximo 100 caracteres" }),
  data_avistamento: z.string().datetime({ message: "Data do avistamento deve ser uma data válida" }).optional()
})

// Função para enviar email de notificação de avistamento
async function enviaEmailAvistamento(nome: string, email: string, avistamento: any) {
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
    <p>Temos boas notícias! Há um novo avistamento relacionado à sua publicação <span class="highlight">"${avistamento.publicacao.titulo}"</span>.</p>
    
    <div class="info-box">
      <h3>Detalhes do Avistamento</h3>
      <p><strong>Local:</strong> ${avistamento.endereco_texto}</p>
      <p><strong>Data:</strong> ${new Date(avistamento.data_avistamento).toLocaleString('pt-BR')}</p>
      ${avistamento.observacoes ? `<p><strong>Observações:</strong> ${avistamento.observacoes}</p>` : ''}
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;">
      <p><strong>Reportado por:</strong> ${avistamento.usuario.nome}</p>
      <p><strong>Contato:</strong> ${avistamento.usuario.email}</p>
    </div>

    <p>Entre em contato com quem reportou o avistamento para mais informações!</p>
    
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet/${avistamento.publicacao.id}" class="button" style="color: #ffffff;">Ver Detalhes</a>
    </div>
  `;

  const htmlContent = getEmailTemplate("Novo Avistamento - PetFinder", content);

  const info = await transporter.sendMail({
    from: 'petfinder@gmail.com',
    to: email,
    subject: "Novo Avistamento - PetFinder",
    text: `Olá ${nome}, há um novo avistamento relacionado à sua publicação "${avistamento.publicacao.titulo}"!`,
    html: htmlContent
  });

  console.log("Email de avistamento enviado: %s", info.messageId);
}

// GET - Listar todos os avistamentos
router.get("/", async (req, res) => {
  try {
    const avistamentos = await prisma.avistamento.findMany({
      include: {
        publicacao: {
          include: {
            usuario: true
          }
        },
        usuario: true
      },
      orderBy: { data_avistamento: 'desc' }
    })
    res.status(200).json(avistamentos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// GET - Buscar avistamentos por publicação
router.get("/publicacao/:publicacaoId", async (req, res) => {
  const { publicacaoId } = req.params
  
  try {
    const avistamentos = await prisma.avistamento.findMany({
      where: { publicacaoId: Number(publicacaoId) },
      include: {
        usuario: true,
        publicacao: {
          select: {
            titulo: true,
            tipo: true
          }
        }
      },
      orderBy: { data_avistamento: 'desc' }
    })
    
    res.status(200).json({
      publicacao_id: Number(publicacaoId),
      total_avistamentos: avistamentos.length,
      avistamentos
    })
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// GET - Buscar avistamentos por usuário
router.get("/usuario/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params
  
  try {
    const avistamentos = await prisma.avistamento.findMany({
      where: { usuarioId },
      include: {
        publicacao: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_avistamento: 'desc' }
    })
    
    res.status(200).json({
      usuario_id: usuarioId,
      total_avistamentos: avistamentos.length,
      avistamentos
    })
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// GET - Buscar avistamento por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params
  
  try {
    const avistamento = await prisma.avistamento.findUnique({
      where: { id: Number(id) },
      include: {
        publicacao: {
          include: {
            usuario: true
          }
        },
        usuario: true
      }
    })
    
    if (!avistamento) {
      return res.status(404).json({ erro: "Avistamento não encontrado" })
    }
    
    res.status(200).json(avistamento)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// POST - Criar novo avistamento
router.post("/", async (req, res) => {
  const valida = avistamentoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { publicacaoId, usuarioId, observacoes, fotos_urls, latitude, longitude, endereco_texto, data_avistamento } = valida.data

  try {
    // Verificar se a publicação existe
    const publicacao = await prisma.publicacao.findUnique({
      where: { id: publicacaoId },
      include: { usuario: true }
    })

    if (!publicacao) {
      return res.status(404).json({ erro: "Publicação não encontrada" })
    }

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    })

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    const avistamento = await prisma.avistamento.create({
      data: {
        publicacaoId,
        usuarioId,
        observacoes,
        fotos_urls: fotos_urls || [],
        latitude,
        longitude,
        endereco_texto,
        data_avistamento: data_avistamento ? new Date(data_avistamento) : undefined
      },
      include: {
        publicacao: {
          include: {
            usuario: true
          }
        },
        usuario: true
      }
    })

    // Persistir uma Notificação para que o worker envie o email e a notificação in-app
    try {
      const titulo = `Novo avistamento: ${avistamento.publicacao.titulo}`
      const corpo = `Há um novo avistamento relacionado à sua publicação. Local: ${avistamento.endereco_texto}`

      await prisma.notificacao.create({
        data: {
          usuarioId: avistamento.publicacao.usuario.id,
          titulo,
          corpo,
          dados: {
            tipo: 'avistamento',
            avistamentoId: avistamento.id,
            publicacaoId: avistamento.publicacaoId
          },
          canal: 'email'
        }
      })

      // Observação: mantemos a função de envio síncrono comentada como fallback.
      // Em produção, o worker deve ser responsável pelo envio para maior robustez.
      try { 
        await enviaEmailAvistamento(avistamento.publicacao.usuario.nome, avistamento.publicacao.usuario.email, avistamento); 
      } catch(e) { 
        console.error('Erro ao enviar email de avistamento:', e) 
      }
    } catch (notifError) {
      console.error('Erro ao criar notificacao de avistamento:', notifError)
    }

    res.status(201).json(avistamento)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// PATCH - Atualizar observações do avistamento
router.patch("/:id", async (req, res) => {
  const { id } = req.params
  const { observacoes } = req.body

  if (!observacoes || observacoes.trim().length === 0) {
    return res.status(400).json({ erro: "Observações são obrigatórias" })
  }

  if (observacoes.length > 500) {
    return res.status(400).json({ erro: "Observações devem ter no máximo 500 caracteres" })
  }

  try {
    const avistamento = await prisma.avistamento.update({
      where: { id: Number(id) },
      data: { observacoes },
      include: {
        publicacao: {
          include: {
            usuario: true
          }
        },
        usuario: true
      }
    })
    res.status(200).json(avistamento)
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ erro: "Avistamento não encontrado" })
    }
    res.status(400).json({ erro: error })
    res.status(400).json({ erro: error })
  }
})

// DELETE - Remover avistamento
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const avistamento = await prisma.avistamento.delete({
      where: { id: Number(id) }
    })
    
    res.status(200).json({ 
      avistamento_removido: avistamento
    })
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ erro: "Avistamento não encontrado" })
    }
    res.status(400).json({ erro: error })
    res.status(400).json({ erro: error })
  }
})

// GET - Buscar avistamentos próximos por localização
router.get("/proximidade/buscar", async (req, res) => {
  try {
    const { latitude, longitude, raio_km } = req.query
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        erro: "Latitude e longitude são obrigatórias" 
      })
    }

    const lat = parseFloat(latitude as string)
    const lng = parseFloat(longitude as string)
    const raio = parseFloat(raio_km as string) || 5 // Default: 5km

    // Cálculo aproximado de graus por km (1 grau ≈ 111km)
    const deltaLat = raio / 111
    const deltaLng = raio / (111 * Math.cos(lat * Math.PI / 180))

    const avistamentos = await prisma.avistamento.findMany({
      where: {
        latitude: {
          gte: lat - deltaLat,
          lte: lat + deltaLat
        },
        longitude: {
          gte: lng - deltaLng,
          lte: lng + deltaLng
        }
      },
      include: {
        publicacao: {
          include: {
            usuario: true
          }
        },
        usuario: true
      },
      orderBy: { data_avistamento: 'desc' }
    })

    res.status(200).json({
      centro: { latitude: lat, longitude: lng },
      raio_km: raio,
      total_avistamentos: avistamentos.length,
      avistamentos
    })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
