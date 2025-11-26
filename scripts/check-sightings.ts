import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.usuario.findMany({
    include: {
      avistamentos: true
    }
  })

  console.log('Users and their sightings:')
  users.forEach(user => {
    console.log(`User: ${user.nome} (${user.email}) - ID: ${user.id}`)
    console.log(`Sightings count: ${user.avistamentos.length}`)
    user.avistamentos.forEach(s => {
      console.log(`  - Sighting ID: ${s.id}, Pet ID: ${s.publicacaoId}, Date: ${s.data_avistamento}`)
    })
    console.log('---')
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
