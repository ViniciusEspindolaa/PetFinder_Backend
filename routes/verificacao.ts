import { Router, Request, Response } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { prisma } from '../config/prisma'
import { verificarToken, verificarAdmin, AuthRequest } from '../middleware/auth'
import {
  validarCPF,
  hashCPF,
  cpfUltimos4,
  gerarCodigo6,
  hashCodigo,
  verificarCodigo,
  expiraEm15Min,
  codigoExpirado,
} from '../utils/cpf'
import {
  contatoBasicoVerificado,
  identidadeVerificada,
  syncServicosPublicacao,
} from '../utils/prestador'
import { getEmailTemplate } from '../utils/emailTemplate'
import { logger } from '../middleware/logger'

const router = Router()

async function enviarEmailCodigo(email: string, codigo: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER || process.env.SMTP_USER,
      pass: process.env.MAILTRAP_PASS || process.env.SMTP_PASS,
    },
  })

  const content = `
    <h2>Verificação de E-mail</h2>
    <p>Use o código abaixo para verificar seu e-mail no PetFinder:</p>
    <div style="text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0;">${codigo}</div>
    <p>O código expira em 15 minutos.</p>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'petfinder@noreply.local',
    to: email,
    subject: 'Código de verificação - PetFinder',
    html: getEmailTemplate('Verificação de E-mail', content),
  })
}

function statusResponse(usuario: any) {
  return {
    telefone_verificado: usuario.telefone_verificado,
    email_verificado: usuario.email_verificado,
    foto_perfil: usuario.foto_perfil,
    contato_verificado: contatoBasicoVerificado(usuario),
    identidade_verificada: identidadeVerificada(usuario),
    verificacao: usuario.verificacaoPrestador
      ? {
          status: usuario.verificacaoPrestador.status,
          cpf_ultimos4: usuario.verificacaoPrestador.cpf_ultimos4,
          motivo_rejeicao: usuario.verificacaoPrestador.motivo_rejeicao,
          verificado_em: usuario.verificacaoPrestador.verificado_em,
          doc_frente_url: usuario.verificacaoPrestador.doc_frente_url,
          doc_verso_url: usuario.verificacaoPrestador.doc_verso_url,
          selfie_url: usuario.verificacaoPrestador.selfie_url,
        }
      : null,
  }
}

async function getUsuarioCompleto(userId: string) {
  return prisma.usuario.findUnique({
    where: { id: userId },
    include: { verificacaoPrestador: true },
  })
}

// GET status da verificação do usuário logado
router.get('/status', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await getUsuarioCompleto(req.usuario!.id)
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })
    res.json(statusResponse(usuario))
  } catch (error) {
    logger.error('Erro ao buscar status de verificação', { error })
    res.status(500).json({ erro: 'Erro ao buscar status de verificação' })
  }
})

// POST enviar código SMS (simulado — log em dev)
router.post('/telefone/enviar', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } })
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    const codigo = gerarCodigo6()
    const hash = await hashCodigo(codigo)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        telefone_codigo_hash: hash,
        telefone_codigo_expira: expiraEm15Min(),
      },
    })

    logger.info(`[SIMULADO] Código telefone para ${usuario.telefone}: ${codigo}`)

    res.json({
      mensagem: `Código enviado para ${usuario.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) *****-$3')}`,
      codigo_dev: codigo,
    })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao enviar código de telefone' })
  }
})

// POST confirmar código telefone
router.post('/telefone/confirmar', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const { codigo } = z.object({ codigo: z.string().length(6) }).parse(req.body)
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } })
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    if (codigoExpirado(usuario.telefone_codigo_expira)) {
      return res.status(400).json({ erro: 'Código expirado. Solicite um novo.' })
    }
    if (!verificarCodigo(codigo, usuario.telefone_codigo_hash)) {
      return res.status(400).json({ erro: 'Código inválido' })
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        telefone_verificado: true,
        telefone_codigo_hash: null,
        telefone_codigo_expira: null,
      },
    })

    await syncServicosPublicacao(usuario.id)
    const atualizado = await getUsuarioCompleto(usuario.id)
    res.json({ mensagem: 'Telefone verificado com sucesso', ...statusResponse(atualizado) })
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ erro: error.errors })
    res.status(500).json({ erro: 'Erro ao confirmar telefone' })
  }
})

// POST enviar código e-mail
router.post('/email/enviar', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } })
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    const codigo = gerarCodigo6()
    const hash = await hashCodigo(codigo)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        email_codigo_hash: hash,
        email_codigo_expira: expiraEm15Min(),
      },
    })

    try {
      await enviarEmailCodigo(usuario.email, codigo)
    } catch (emailErr) {
      logger.warn(`[EMAIL] Falha ao enviar e-mail para ${usuario.email}, use codigo_dev`)
    }

    res.json({
      mensagem: `Código enviado para ${usuario.email}`,
      codigo_dev: codigo,
    })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao enviar código de e-mail' })
  }
})

// POST confirmar código e-mail
router.post('/email/confirmar', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const { codigo } = z.object({ codigo: z.string().length(6) }).parse(req.body)
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } })
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    if (codigoExpirado(usuario.email_codigo_expira)) {
      return res.status(400).json({ erro: 'Código expirado. Solicite um novo.' })
    }
    if (!verificarCodigo(codigo, usuario.email_codigo_hash)) {
      return res.status(400).json({ erro: 'Código inválido' })
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        email_verificado: true,
        email_codigo_hash: null,
        email_codigo_expira: null,
      },
    })

    await syncServicosPublicacao(usuario.id)
    const atualizado = await getUsuarioCompleto(usuario.id)
    res.json({ mensagem: 'E-mail verificado com sucesso', ...statusResponse(atualizado) })
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ erro: error.errors })
    res.status(500).json({ erro: 'Erro ao confirmar e-mail' })
  }
})

// PUT foto de perfil
router.put('/foto-perfil', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const { foto_url } = z.object({ foto_url: z.string().url() }).parse(req.body)

    await prisma.usuario.update({
      where: { id: req.usuario!.id },
      data: { foto_perfil: foto_url },
    })

    await syncServicosPublicacao(req.usuario!.id)
    const atualizado = await getUsuarioCompleto(req.usuario!.id)
    res.json({ mensagem: 'Foto de perfil atualizada', ...statusResponse(atualizado) })
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ erro: error.errors })
    res.status(500).json({ erro: 'Erro ao atualizar foto de perfil' })
  }
})

// POST solicitar verificação de identidade (Fase 2)
router.post('/prestador', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const dados = z.object({
      cpf: z.string().min(11).max(14),
      doc_frente_url: z.string().url(),
      doc_verso_url: z.string().url(),
      selfie_url: z.string().url(),
    }).parse(req.body)

    const cpfValido = validarCPF(dados.cpf)
    if (!cpfValido && process.env.NODE_ENV !== 'development') {
      return res.status(400).json({ erro: 'CPF inválido' })
    }
    if (!cpfValido && process.env.NODE_ENV === 'development') {
      logger.warn(`[DEV] CPF inválido aceito em modo desenvolvimento: ${dados.cpf}`)
    }

    const usuario = await getUsuarioCompleto(req.usuario!.id)
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    if (!contatoBasicoVerificado(usuario)) {
      return res.status(400).json({
        erro: 'Complete a verificação de telefone, e-mail e foto de perfil antes de enviar documentos.',
      })
    }

    const cpfHash = hashCPF(dados.cpf)
    const ultimos4 = cpfUltimos4(dados.cpf)

    const existente = await prisma.verificacaoPrestador.findUnique({
      where: { usuarioId: usuario.id },
    })

    if (existente?.status === 'APROVADO') {
      return res.status(400).json({ erro: 'Sua identidade já está verificada.' })
    }

    const payload = {
      cpf_hash: cpfHash,
      cpf_ultimos4: ultimos4,
      doc_frente_url: dados.doc_frente_url,
      doc_verso_url: dados.doc_verso_url,
      selfie_url: dados.selfie_url,
      status: 'EM_ANALISE' as const,
      motivo_rejeicao: null,
      verificado_em: null,
      verificado_por: null,
    }

    if (existente) {
      await prisma.verificacaoPrestador.update({
        where: { usuarioId: usuario.id },
        data: payload,
      })
    } else {
      await prisma.verificacaoPrestador.create({
        data: { ...payload, usuarioId: usuario.id },
      })
    }

    const atualizado = await getUsuarioCompleto(usuario.id)
    res.status(201).json({
      mensagem: 'Documentos enviados. Análise em até 48 horas.',
      ...statusResponse(atualizado),
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ erro: error.errors })
    logger.error('Erro ao solicitar verificação prestador', { error })
    res.status(500).json({ erro: 'Erro ao enviar documentos' })
  }
})

// === ADMIN ===

router.get('/admin/pendentes', verificarToken, verificarAdmin, async (_req, res) => {
  try {
    const pendentes = await prisma.verificacaoPrestador.findMany({
      where: { status: { in: ['PENDENTE', 'EM_ANALISE'] } },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true,
            telefone_verificado: true,
            email_verificado: true,
          },
        },
      },
      orderBy: { criado_em: 'asc' },
    })
    res.json(pendentes)
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao listar verificações pendentes' })
  }
})

router.patch('/admin/:id/aprovar', verificarToken, verificarAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const verificacao = await prisma.verificacaoPrestador.findUnique({
      where: { id },
      include: { usuario: true },
    })
    if (!verificacao) return res.status(404).json({ erro: 'Verificação não encontrada' })

    await prisma.verificacaoPrestador.update({
      where: { id },
      data: {
        status: 'APROVADO',
        motivo_rejeicao: null,
        verificado_em: new Date(),
        verificado_por: req.usuario!.id,
      },
    })

    await syncServicosPublicacao(verificacao.usuarioId)
    res.json({ mensagem: 'Prestador aprovado com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao aprovar prestador' })
  }
})

router.patch('/admin/:id/rejeitar', verificarToken, verificarAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { motivo } = z.object({ motivo: z.string().min(10).max(500) }).parse(req.body)

    const verificacao = await prisma.verificacaoPrestador.findUnique({ where: { id } })
    if (!verificacao) return res.status(404).json({ erro: 'Verificação não encontrada' })

    await prisma.verificacaoPrestador.update({
      where: { id },
      data: {
        status: 'REJEITADO',
        motivo_rejeicao: motivo,
        verificado_em: null,
        verificado_por: req.usuario!.id,
      },
    })

    await syncServicosPublicacao(verificacao.usuarioId)
    res.json({ mensagem: 'Verificação rejeitada' })
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ erro: error.errors })
    res.status(500).json({ erro: 'Erro ao rejeitar prestador' })
  }
})

export default router
