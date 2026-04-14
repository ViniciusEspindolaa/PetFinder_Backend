import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config()
const prisma = new PrismaClient()

async function main() {
  const email = 'teste@email.com'

  // garante que usuário de teste exista (se não existir, cria um com senha placeholder)
  let usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) {
    usuario = await prisma.usuario.create({
      data: {
        nome: 'Usuario Teste',
        email,
        senha: 'placeholder',
        telefone: '(00) 00000-0000'
      }
    })
    console.log('Usuário de teste criado:', usuario.id)
  }

  // tenta encontrar uma publicação do usuário; se não existir cria uma
  let publicacao = await prisma.publicacao.findFirst({ where: { usuarioId: usuario.id } })
  if (!publicacao) {
    publicacao = await prisma.publicacao.create({
      data: {
        titulo: 'Publicação de teste para notificações',
        descricao: 'Descrição teste',
        fotos_urls: [],
        latitude: 0.0 as any,
        longitude: 0.0 as any,
        endereco_texto: 'Local de teste',
        especie: 'OUTRO',
        usuarioId: usuario.id
      }
    })
    console.log('Publicação de teste criada:', publicacao.id)
  }

  // cria um avistamento apontando para a publicação
  const avistamento = await prisma.avistamento.create({
    data: {
      publicacaoId: publicacao.id,
      usuarioId: usuario.id,
      observacoes: 'Avistamento de teste para validar notificações',
      fotos_urls: [],
      latitude: 0.0 as any,
      longitude: 0.0 as any,
      endereco_texto: 'Rua Teste, 123'
    },
    include: {
      publicacao: true,
      usuario: true
    }
  })

  console.log('Avistamento criado:', avistamento.id)

  // buscar notificações criadas para o dono da publicação
  const notificacoes = await prisma.notificacao.findMany({
    where: { usuarioId: publicacao.usuarioId },
    orderBy: { criadaEm: 'desc' },
    take: 5
  })

  console.log('Notificações recentes do dono da publicação:')
  notificacoes.forEach((n) => {
    console.log(`- ${n.id} | ${n.titulo} | enviadaEm: ${n.enviadaEm} | entregue: ${n.entregue}`)
  })

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
