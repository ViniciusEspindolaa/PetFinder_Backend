import fetch from 'node-fetch'

async function main() {
  const res = await fetch('http://localhost:3001/api/publicacoes')
  const data = await res.json()

  console.log(`Found ${data.length} publicacoes`)

  for (const p of data) {
    const fotos = p.fotos_urls
    let hasPhoto = false
    let url = null

    if (Array.isArray(fotos) && fotos.length > 0) {
      hasPhoto = true
      url = fotos[0]
    } else if (typeof fotos === 'string' && fotos.length > 0) {
      hasPhoto = true
      url = fotos
    } else if (fotos && typeof fotos === 'object' && Object.keys(fotos).length > 0) {
      // could be an object-like map
      const vals = Object.values(fotos)
      if (vals.length > 0) {
        hasPhoto = true
        url = String(vals[0])
      }
    }

    console.log(`id=${p.id} titulo="${p.titulo}" -> hasPhoto=${hasPhoto} url=${url || '<none>'}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
