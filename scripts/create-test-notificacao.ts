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
    titulo: 'Notificação de teste',
    corpo: 'Esta é uma notificação criada para testar o worker de email.',
    dados: { teste: true },
    canal: 'email'
  }})

  console.log('Notificação criada:', notif.id)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Erro ao criar notificação de teste', e)
  prisma.$disconnect().finally(() => process.exit(1))
})
