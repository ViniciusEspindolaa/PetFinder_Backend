import { Router } from 'express'
import { prisma } from "../config/prisma"
import { verificarToken, AuthRequest } from '../middleware/auth'

const router = Router()

// Lista notificações do usuário autenticado (paginação simples)
router.get('/', verificarToken, async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page || 1)
    const limit = Math.min(50, Number(req.query.limit || 20))
    const skip = (page - 1) * limit

    const notifications = await prisma.notificacao.findMany({
      where: { usuarioId: req.usuario!.id },
      orderBy: { criadaEm: 'desc' },
      skip,
      take: limit,
    })

    const total = await prisma.notificacao.count({ where: { usuarioId: req.usuario!.id } })
    return res.json({ data: notifications, page, limit, total })
  } catch (err: any) {
    console.error('GET /notificacoes error', err)
    return res.status(500).json({ erro: 'erro ao listar notificações' })
  }
})

// Marcar notificações como lidas
router.post('/marcar-lidas', verificarToken, async (req: AuthRequest, res) => {
  try {
    const ids: string[] = req.body.ids || []
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ erro: 'ids necessários' })

    await prisma.notificacao.updateMany({
      where: { id: { in: ids }, usuarioId: req.usuario!.id },
      data: { lida: true }
    })
    return res.json({ ok: true })
  } catch (err: any) {
    console.error('POST /notificacoes/marcar-lidas error', err)
    return res.status(500).json({ erro: 'erro ao marcar notificações' })
  }
})

// Criar notificação (uso interno/serviço). Se não for admin, apenas permite criar para si.
router.post('/', verificarToken, async (req: AuthRequest, res) => {
  try {
    const { usuarioId, titulo, corpo, dados, canal = 'inapp', prioridade = 0 } = req.body
    if (!titulo) return res.status(400).json({ erro: 'titulo necessário' })

    // se usuário não admin, só permite criar para ele mesmo
    if (req.usuario!.tipo !== 'admin' && usuarioId && usuarioId !== req.usuario!.id) {
      return res.status(403).json({ erro: 'Acesso negado para criar notificação para outro usuário' })
    }

    const targetUserId = usuarioId || req.usuario!.id

    const created = await prisma.notificacao.create({ data: {
      usuarioId: targetUserId,
      titulo,
      corpo,
      dados: dados ?? null,
      canal,
      prioridade
    }})

    return res.json({ ok: true, notificacao: created })
  } catch (err: any) {
    console.error('POST /notificacoes error', err)
    return res.status(500).json({ erro: 'erro ao criar notificação' })
  }
})

export default router
