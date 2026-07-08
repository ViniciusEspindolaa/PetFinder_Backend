import * as dotenv from 'dotenv'
dotenv.config()
import { prisma } from '../config/prisma'

async function main() {
  const [
    usuarios,
    publicacoes,
    perdidos,
    encontrados,
    adocao,
    servicos,
    eventos,
    agendamentos,
    avistamentos,
    notificacoes,
    verificacoes,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.publicacao.count(),
    prisma.publicacao.count({ where: { tipo: 'PERDIDO' } }),
    prisma.publicacao.count({ where: { tipo: 'ENCONTRADO' } }),
    prisma.publicacao.count({ where: { tipo: 'ADOCAO' } }),
    prisma.servico.count(),
    prisma.evento.count(),
    prisma.agendamento.count(),
    prisma.avistamento.count(),
    prisma.notificacao.count(),
    prisma.verificacaoPrestador.count(),
  ])

  const hoje = new Date().toLocaleDateString('pt-BR')

  console.log(`\n========================================`)
  console.log(`  MÉTRICAS DE PRODUÇÃO — PetFinder`)
  console.log(`  Data de extração: ${hoje}`)
  console.log(`========================================\n`)
  console.log(`Usuários cadastrados:        ${usuarios}`)
  console.log(`Pets publicados (total):     ${publicacoes}`)
  console.log(`  Perdidos:                  ${perdidos}`)
  console.log(`  Encontrados:               ${encontrados}`)
  console.log(`  Para adoção:               ${adocao}`)
  console.log(`Serviços cadastrados:        ${servicos}`)
  console.log(`Eventos/Feiras:              ${eventos}`)
  console.log(`Agendamentos realizados:     ${agendamentos}`)
  console.log(`Avistamentos registrados:    ${avistamentos}`)
  console.log(`Notificações geradas:        ${notificacoes}`)
  console.log(`Verificações de prestador:   ${verificacoes}`)
  console.log(`\n========================================\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
