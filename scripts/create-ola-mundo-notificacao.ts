import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config()
const prisma = new PrismaClient()

async function main() {
  const email = 'teste@email.com'

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) {
    console.error(`Usuário de teste não encontrado: ${email}. Rode scripts/create-test-user.ts antes.`)
    process.exit(1)
  }

  const notif = await prisma.notificacao.create({ data: {
    usuarioId: usuario.id,
    titulo: 'Olá Mundo',
    corpo: 'olá mundo',
    dados: { origem: 'manual' },
    canal: 'email'
  }})

  console.log('Notificação criada:', notif.id)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Erro ao criar notificação', e)
  prisma.$disconnect().finally(() => process.exit(1))
})
