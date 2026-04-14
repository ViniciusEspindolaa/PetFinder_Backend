
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  // Get a user with sightings
  const user = await prisma.usuario.findFirst({
    where: {
      avistamentos: {
        some: {}
      }
    }
  })

  if (!user) {
    console.log('No user with sightings found')
    return
  }

  console.log(`Testing API logic for user: ${user.id}`)

  const avistamentos = await prisma.avistamento.findMany({
    where: { usuarioId: user.id },
    include: {
      publicacao: {
        include: {
          usuario: true
        }
      }
    },
    orderBy: { data_avistamento: 'desc' }
  })

  console.log(`Found ${avistamentos.length} sightings in DB`)

  // Simulate frontend mapping
  try {
    const mapped = avistamentos.map((s: any) => ({
      id: String(s.id),
      petId: String(s.publicacaoId),
      location: {
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        address: s.endereco_texto,
        city: '', 
      },
      date: new Date(s.data_avistamento),
      time: new Date(s.data_avistamento).toLocaleTimeString(),
      description: s.observacoes || '',
      reporterName: s.usuario?.nome || '', // Note: In the backend query above, we didn't include 'usuario' for the sighting itself, only for publicacao!
      reporterPhone: s.usuario?.telefone || '',
      createdAt: new Date(s.data_avistamento),
      pet: {
        id: String(s.publicacao.id),
        name: s.publicacao.titulo || 'Pet',
        photoUrl: s.publicacao.fotos_urls?.[0] || '/placeholder.svg'
      }
    }))
    console.log('Mapping successful')
    console.log(mapped[0])
  } catch (e) {
    console.error('Mapping failed:', e)
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
