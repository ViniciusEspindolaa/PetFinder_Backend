import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'

dotenv.config()
const prisma = new PrismaClient()

// Worker simples: busca notificações não enviadas com canal 'email' e tenta enviar por SMTP
async function processar() {
  console.info('[worker] iniciando ciclo de envio de notificações')
  const pendentes = await prisma.notificacao.findMany({ where: { enviadaEm: null, canal: 'email' }, take: 20 })
  if (!pendentes.length) {
    console.info('[worker] sem notificações pendentes')
    return
  }

  // configurar transporte nodemailer usando VARs do .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  // small helper to sleep between sends
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

  for (const n of pendentes) {
    // rate-limit: wait a bit between emails to avoid provider throttle
    await sleep(1100)
    try {
      const usuario = await prisma.usuario.findUnique({ where: { id: n.usuarioId } })
      if (!usuario || !usuario.email) {
        console.warn('[worker] sem email para usuario', n.usuarioId)
        continue
      }

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@petfinder.local',
        to: usuario.email,
        subject: n.titulo,
        text: (n.corpo || '').toString(),
        html: `<p>${(n.corpo || '')}</p>`
      })

      await prisma.notificacao.update({ where: { id: n.id }, data: { enviadaEm: new Date(), entregue: true } })
      console.info('[worker] enviado', n.id, info.messageId)
    } catch (err: any) {
      const msg = err?.message || err
      console.error('[worker] erro ao enviar notificacao', n.id, msg)
      // se for erro de rate limit do Mailtrap (550 Too many...), aguarda um pouco e continua
      const isRateLimit = typeof msg === 'string' && msg.includes('Too many emails')
      if (isRateLimit) {
        console.warn('[worker] detectado rate-limit, aguardando 5s antes de continuar')
        await sleep(5000)
      }
      // Não marcamos como enviado; deixamos para tentativas futuras.
    }
  }
}

async function mainLoop() {
  while (true) {
    try {
      await processar()
    } catch (err) {
      console.error('[worker] ciclo falhou', err)
    }
    // esperar 10s entre ciclos
    await new Promise((r) => setTimeout(r, 10000))
  }
}

mainLoop().catch((e) => {
  console.error('worker erro fatal', e)
  process.exit(1)
})
