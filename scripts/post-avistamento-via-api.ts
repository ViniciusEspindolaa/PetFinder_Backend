import fetch from 'node-fetch'
import { config } from 'dotenv'

config()

async function main() {
  const url = process.env.BACKEND_URL || 'http://localhost:3001'

  const publicacaoIdEnv = Number(process.env.TEST_PUBLICACAO_ID || 0)
  let publicacaoId = publicacaoIdEnv
  let usuarioId = process.env.TEST_USER_ID || ''

  // se não fornecer publicacaoId via env, tenta buscar a primeira publicação disponível na API
  if (!publicacaoId) {
    try {
      const listRes = await fetch(`${url}/api/publicacoes`)
      const listData = await listRes.json()
      if (Array.isArray(listData) && listData.length > 0) {
        publicacaoId = listData[0].id
        // usa o dono da publicação como reporter (apenas para teste)
        usuarioId = listData[0].usuarioId || usuarioId
      }
    } catch (err) {
      console.warn('Não foi possível obter publicações via API, usando valores padrões')
    }
  }

  const payload = {
    publicacaoId: publicacaoId || 9,
    usuarioId: usuarioId || '',
    observacoes: 'Avistamento via API - teste de notificacao',
    fotos_urls: [],
    latitude: -23.0,
    longitude: -46.0,
    endereco_texto: 'Local API Teste'
  }

  try {
    const res = await fetch(`${url}/api/avistamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    console.log('status', res.status)
    console.log('response', data)
  } catch (err) {
    console.error('erro ao postar avistamento via api', err)
  }
}

main()
