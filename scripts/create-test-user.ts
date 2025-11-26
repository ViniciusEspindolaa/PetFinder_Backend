import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

// Carrega variáveis de ambiente do .env
config()

const prisma = new PrismaClient()

async function createTestUser() {
  const email = 'teste@email.com'
  const senha = 'MinhaSenh@123'
  const nome = 'Usuario Teste'
  const telefone = '(11) 99999-9999'

  try {
    // Verifica se usuário já existe
    const existente = await prisma.usuario.findUnique({
      where: { email }
    })

    if (existente) {
      console.log(`⚠️  Usuário ${email} já existe. Atualizando senha...`)
      
      // Atualiza senha
      const salt = bcrypt.genSaltSync(12)
      const hash = bcrypt.hashSync(senha, salt)
      
      const usuario = await prisma.usuario.update({
        where: { email },
        data: { senha: hash }
      })
      
      console.log(`✅ Senha atualizada!`)
      console.log(`ID: ${usuario.id}`)
      console.log(`Nome: ${usuario.nome}`)
      console.log(`Email: ${usuario.email}`)
    } else {
      console.log(`Criando novo usuário: ${email}`)
      
      // Cria hash da senha
      const salt = bcrypt.genSaltSync(12)
      const hash = bcrypt.hashSync(senha, salt)
      
      // Cria usuário
      const usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: hash,
          telefone
        }
      })
      
      console.log(`✅ Usuário criado com sucesso!`)
      console.log(`ID: ${usuario.id}`)
      console.log(`Nome: ${usuario.nome}`)
      console.log(`Email: ${usuario.email}`)
    }
    
    // Verifica se o hash está correto
    const hashAtual = await prisma.usuario.findUnique({
      where: { email },
      select: { senha: true }
    })
    
    if (hashAtual) {
      const confere = bcrypt.compareSync(senha, hashAtual.senha)
      console.log(`\n🔍 Verificação: ${confere ? '✅ Senha válida' : '❌ Senha inválida'}`)
    }
    
    console.log(`\n📝 Use estas credenciais para login:`)
    console.log(`   Email: ${email}`)
    console.log(`   Senha: ${senha}`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()
  .then(() => {
    console.log('\n✅ Concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Falha:', error.message)
    process.exit(1)
  })
