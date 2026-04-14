
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  // Get a user
  const user = await prisma.usuario.findFirst()
  if (!user) {
    console.log('No user found')
    return
  }

  // Get a publication (not from this user, ideally, but it doesn't matter for the test)
  const pub = await prisma.publicacao.findFirst()
  if (!pub) {
    console.log('No publication found')
    return
  }

  console.log(`Creating sighting for user ${user.nome} (${user.id}) on publication ${pub.titulo} (${pub.id})`)

  try {
    const sighting = await prisma.avistamento.create({
      data: {
        publicacaoId: pub.id,
        usuarioId: user.id,
        observacoes: 'Avistado via script de teste',
        latitude: -23.5505,
        longitude: -46.6333,
        endereco_texto: 'Rua de Teste, 123'
      }
    })
    console.log('Sighting created:', sighting)
  } catch (e) {
    console.error('Error creating sighting:', e)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
