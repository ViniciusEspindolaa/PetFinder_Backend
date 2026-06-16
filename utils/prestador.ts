import { prisma } from '../config/prisma'

type UsuarioComVerificacao = {
  telefone_verificado: boolean
  email_verificado: boolean
  foto_perfil: string | null
  verificacaoPrestador?: { status: string } | null
}

type ServicoBasico = {
  atende_domicilio: boolean
}

export function contatoBasicoVerificado(usuario: UsuarioComVerificacao): boolean {
  return Boolean(
    usuario.telefone_verificado &&
    usuario.email_verificado &&
    usuario.foto_perfil
  )
}

export function identidadeVerificada(usuario: UsuarioComVerificacao): boolean {
  return usuario.verificacaoPrestador?.status === 'APROVADO'
}

export function podePublicarServico(
  usuario: UsuarioComVerificacao,
  servico: ServicoBasico
): boolean {
  // Serviços em local fixo aparecem no mapa/listagem sem verificação completa
  if (!servico.atende_domicilio) return true
  // Atendimento em domicílio exige contato + identidade verificados
  if (!contatoBasicoVerificado(usuario)) return false
  if (!identidadeVerificada(usuario)) return false
  return true
}

export function podeAgendarServico(
  usuario: UsuarioComVerificacao,
  servico: ServicoBasico,
  atendimentoDomicilio = false
): boolean {
  if (!podePublicarServico(usuario, servico)) return false
  if (!contatoBasicoVerificado(usuario)) return false
  if (atendimentoDomicilio && !identidadeVerificada(usuario)) return false
  return true
}

export function motivoNaoPublicado(
  usuario: UsuarioComVerificacao,
  servico: ServicoBasico
): string | null {
  if (!servico.atende_domicilio) return null
  if (!usuario.telefone_verificado) return 'Telefone não verificado'
  if (!usuario.email_verificado) return 'E-mail não verificado'
  if (!usuario.foto_perfil) return 'Foto de perfil obrigatória'
  if (!identidadeVerificada(usuario)) {
    const status = usuario.verificacaoPrestador?.status
    if (status === 'PENDENTE' || status === 'EM_ANALISE') {
      return 'Verificação de identidade em análise'
    }
    if (status === 'REJEITADO') {
      return 'Verificação de identidade rejeitada — reenvie os documentos'
    }
    return 'Verificação de identidade obrigatória para atendimento em domicílio'
  }
  return null
}

export async function syncServicosPublicacao(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { verificacaoPrestador: true, servicos: true },
  })
  if (!usuario) return

  for (const servico of usuario.servicos) {
    const publicado = podePublicarServico(usuario, servico)
    if (servico.publicado !== publicado) {
      await prisma.servico.update({
        where: { id: servico.id },
        data: { publicado },
      })
    }
  }
}

export function usuarioSelectVerificacao() {
  return {
    id: true,
    nome: true,
    email: true,
    telefone: true,
    foto_perfil: true,
    telefone_verificado: true,
    email_verificado: true,
    verificacaoPrestador: {
      select: { status: true, verificado_em: true },
    },
  }
}

export function isAdminUser(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return adminIds.includes(userId)
}
