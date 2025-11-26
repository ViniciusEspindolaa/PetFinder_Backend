import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config()
const prisma = new PrismaClient()

async function main() {
  const email = process.env.TEST_EMAIL || 'teste@email.com'

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) {
    console.log('Usuário não encontrado:', email)
    process.exit(0)
  }

  const nots = await prisma.notificacao.findMany({ where: { usuarioId: usuario.id }, orderBy: { criadaEm: 'desc' }, take: 10 })

  console.log(`Notificações para ${usuario.email} (últimas ${nots.length}):`)
  nots.forEach(n => console.log(`${n.id} | ${n.titulo} | criadaEm: ${n.criadaEm} | enviadaEm: ${n.enviadaEm} | entregue: ${n.entregue}`))

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
