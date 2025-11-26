import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

// Carrega variáveis de ambiente do .env
config()

const prisma = new PrismaClient()

async function resetPassword(email: string, novaSenha: string) {
  try {
    // Gera hash da nova senha
    const salt = bcrypt.genSaltSync(12)
    const hash = bcrypt.hashSync(novaSenha, salt)
    
    console.log(`Atualizando senha para: ${email}`)
    console.log(`Nova senha: ${novaSenha}`)
    console.log(`Hash gerado: ${hash}`)
    
    // Atualiza no banco
    const usuario = await prisma.usuario.update({
      where: { email },
      data: { senha: hash }
    })
    
    console.log(`✅ Senha atualizada com sucesso!`)
    console.log(`ID: ${usuario.id}`)
    console.log(`Nome: ${usuario.nome}`)
    console.log(`Email: ${usuario.email}`)
    
    // Verifica se o hash está correto
    const confere = bcrypt.compareSync(novaSenha, hash)
    console.log(`\n🔍 Verificação: ${confere ? '✅ Hash válido' : '❌ Hash inválido'}`)
    
  } catch (error) {
    console.error('❌ Erro ao atualizar senha:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Pega argumentos da linha de comando
const email = process.argv[2]
const novaSenha = process.argv[3]

if (!email || !novaSenha) {
  console.log('Uso: npx ts-node scripts/reset-password.ts <email> <nova-senha>')
  console.log('Exemplo: npx ts-node scripts/reset-password.ts teste@email.com MinhaSenh@123')
  process.exit(1)
}

resetPassword(email, novaSenha)
  .then(() => {
    console.log('\n✅ Concluído! Agora você pode fazer login com a nova senha.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Falha:', error.message)
    process.exit(1)
  })
