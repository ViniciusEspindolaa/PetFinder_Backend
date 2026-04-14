import fetch from 'node-fetch'

type Sighting = any

function mapTipo(tipo: string) {
  switch (tipo) {
    case 'PERDIDO': return 'lost'
    case 'ENCONTRADO': return 'found'
    case 'ADOCAO': return 'adoption'
    default: return 'lost'
  }
}

function mapEspecie(especie: string) {
  switch (especie) {
    case 'CACHORRO': return 'dog'
    case 'GATO': return 'cat'
    default: return 'other'
  }
}

function mapPorte(porte?: string) {
  switch (porte) {
    case 'PEQUENO': return 'small'
    case 'MEDIO': return 'medium'
    case 'GRANDE': return 'large'
    default: return 'medium'
  }
}

function mapPublicacaoToPet(pub: any) {
  const fotos = pub.fotos_urls
  let photo = '/placeholder-pet.png'

  if (Array.isArray(fotos) && fotos.length > 0) {
    photo = fotos[0]
  } else if (typeof fotos === 'string' && fotos.length > 0) {
    photo = fotos
  } else if (fotos && typeof fotos === 'object' && Object.keys(fotos).length > 0) {
    const vals = Object.values(fotos)
    if (vals.length > 0) photo = String(vals[0])
  }

  const sightings: Sighting[] = (pub.avistamentos || []).map((a: any) => ({
    id: String(a.id),
    petId: String(pub.id),
    location: {
      lat: Number(a.latitude),
      lng: Number(a.longitude),
      address: a.endereco_texto || '',
      city: '',
      neighborhood: ''
    },
    date: a.data_avistamento ? new Date(a.data_avistamento) : new Date(),
    time: a.data_avistamento ? new Date(a.data_avistamento).toLocaleTimeString() : '',
    description: a.observacoes || '',
    reporterName: a.usuario?.nome || '',
    reporterPhone: a.usuario?.telefone || '',
    createdAt: a.data_avistamento ? new Date(a.data_avistamento) : new Date()
  }))

  return {
    id: String(pub.id),
    userId: pub.usuarioId || (pub.usuario && pub.usuario.id) || '',
    status: mapTipo(pub.tipo),
    name: pub.nome_pet || pub.titulo || undefined,
    type: mapEspecie(pub.especie),
    breed: pub.raca || '',
    size: mapPorte(pub.porte),
    age: pub.idade ? String(pub.idade) : undefined,
    location: {
      lat: Number(pub.latitude),
      lng: Number(pub.longitude),
      address: pub.endereco_texto || '',
      city: '',
      neighborhood: ''
    },
    lastSeenDate: pub.data_evento ? new Date(pub.data_evento) : (pub.data_publicacao ? new Date(pub.data_publicacao) : new Date()),
    description: pub.descricao || '',
    photoUrl: photo,
    reward: undefined,
    contactPhone: pub.usuario?.telefone || '',
    contactName: pub.usuario?.nome || '',
    sightings,
    createdAt: pub.data_publicacao ? new Date(pub.data_publicacao) : new Date()
  }
}

async function main() {
  const loginBody = { email: 'teste@email.com', senha: 'MinhaSenh@123' }
  const loginRes = await fetch('http://localhost:3001/api/login', {
    method: 'POST',
    body: JSON.stringify(loginBody),
    headers: { 'Content-Type': 'application/json' }
  })

  if (!loginRes.ok) {
    console.error('Login failed', await loginRes.text())
    process.exit(1)
  }

  const loginData = await loginRes.json()
  const token = loginData.token
  console.log('Logged in, token length:', token ? token.length : 0)

  const pubsRes = await fetch('http://localhost:3001/api/publicacoes', {
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  })

  if (!pubsRes.ok) {
    console.error('Failed to fetch publicacoes', await pubsRes.text())
    process.exit(1)
  }

  const pubs = await pubsRes.json()
  console.log('Publicacoes count:', pubs.length)

  const mapped = pubs.map(mapPublicacaoToPet)
  for (const p of mapped) {
    console.log(`id=${p.id} name="${p.name}" photoUrl=${p.photoUrl}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
