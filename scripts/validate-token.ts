import { config } from 'dotenv'
import jwt from 'jsonwebtoken'

// Carrega variáveis de ambiente
config()

const token = process.argv[2]

if (!token) {
  console.log('Uso: npx ts-node scripts/validate-token.ts <SEU_TOKEN>')
  console.log('\nExemplo:')
  console.log('npx ts-node scripts/validate-token.ts eyJhbGciOiJIUzI1NiIsInR5cCI6...')
  process.exit(1)
}

console.log('🔍 Validando token...\n')
console.log('Token fornecido:', token.substring(0, 50) + '...')
console.log('JWT_SECRET configurado:', process.env.JWT_SECRET ? '✅ Sim' : '❌ Não')
console.log()

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')
  console.log('✅ Token VÁLIDO!\n')
  console.log('Payload decodificado:')
  console.log(JSON.stringify(decoded, null, 2))
  console.log()
  
  // Verifica se tem os campos esperados
  const payload = decoded as any
  if (payload.id) console.log('✅ Campo "id" presente:', payload.id)
  if (payload.email) console.log('✅ Campo "email" presente:', payload.email)
  if (payload.usuarioLogadoId) console.log('✅ Campo "usuarioLogadoId" presente:', payload.usuarioLogadoId)
  if (payload.usuarioLogadoNome) console.log('✅ Campo "usuarioLogadoNome" presente:', payload.usuarioLogadoNome)
  
  if (payload.exp) {
    const expDate = new Date(payload.exp * 1000)
    const now = new Date()
    console.log(`\n⏰ Expira em: ${expDate.toLocaleString('pt-BR')}`)
    console.log(`   ${expDate > now ? '✅ Ainda válido' : '❌ EXPIRADO'}`)
  }
  
} catch (error) {
  console.log('❌ Token INVÁLIDO!\n')
  if (error instanceof Error) {
    console.log('Erro:', error.message)
    
    if (error.message.includes('invalid signature')) {
      console.log('\n💡 Possível causa: Token foi gerado com um JWT_SECRET diferente do atual.')
      console.log('   Solução: Faça login novamente para obter um novo token.')
    } else if (error.message.includes('jwt expired')) {
      console.log('\n💡 Token expirou. Faça login novamente.')
    } else if (error.message.includes('jwt malformed')) {
      console.log('\n💡 Token está malformado. Verifique se copiou corretamente.')
    }
  }
  process.exit(1)
}
