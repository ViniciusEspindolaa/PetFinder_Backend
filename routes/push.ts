import { Router } from 'express'
import { prisma } from "../config/prisma"
import { verificarToken, AuthRequest } from '../middleware/auth'

const router = Router()

// Salvar inscrição push do navegador
router.post('/subscribe', verificarToken, async (req: AuthRequest, res) => {
  try {
    const subscription = req.body
    if (!subscription || !subscription.endpoint) return res.status(400).json({ erro: 'subscription inválida' })

    const data = {
      usuarioId: req.usuario!.id,
      endpoint: subscription.endpoint,
      keys: subscription.keys || {}
    }

    // upsert
    const existing = await prisma.inscricaoPush.findUnique({ where: { endpoint: data.endpoint } })
    if (existing) {
      await prisma.inscricaoPush.update({ where: { endpoint: data.endpoint }, data })
    } else {
      await prisma.inscricaoPush.create({ data })
    }

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('POST /push/subscribe error', err)
    return res.status(500).json({ erro: 'erro ao salvar assinatura push' })
  }
})

export default router
