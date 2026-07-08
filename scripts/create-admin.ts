import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
dotenv.config()

import { prisma } from '../config/prisma'

async function main() {
  const nome = process.env.ADMIN_NOME || 'Administrador'
  const email = process.env.ADMIN_EMAIL
  const senha = process.env.ADMIN_SENHA
  const telefone = process.env.ADMIN_TELEFONE || '00000000000'

  if (!email || !senha) {
    console.error('Defina ADMIN_EMAIL e ADMIN_SENHA como variáveis de ambiente.')
    console.error('Exemplo:')
    console.error('  ADMIN_EMAIL=admin@petfinder.com ADMIN_SENHA=SenhaForte123 npx ts-node scripts/create-admin.ts')
    process.exit(1)
  }

  const existente = await prisma.usuario.findFirst({ where: { email } })
  if (existente) {
    // Promove para admin se já existir
    await prisma.$executeRawUnsafe(
      `UPDATE usuarios SET tipo = 'admin' WHERE id = $1`,
      existente.id
    )
    console.log(`Usuário existente promovido a admin: ${email} (id: ${existente.id})`)
    return
  }

  const senhaHash = await bcrypt.hash(senha, 10)

  const usuario = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO usuarios (id, nome, email, senha, telefone, tipo, "createdAt", telefone_verificado, email_verificado)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'admin', NOW(), true, true)
     RETURNING id`,
    nome, email, senhaHash, telefone
  )

  console.log(`Admin criado com sucesso!`)
  console.log(`  ID:    ${usuario[0].id}`)
  console.log(`  Nome:  ${nome}`)
  console.log(`  Email: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
