import crypto from 'crypto'
import bcrypt from 'bcrypt'

export function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export function validarCPF(cpf: string): boolean {
  const nums = limparCPF(cpf)
  if (nums.length !== 11) return false
  if (/^(\d)\1+$/.test(nums)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(nums[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  return resto === parseInt(nums[10])
}

export function hashCPF(cpf: string): string {
  const salt = process.env.CPF_SALT || 'petfinder-cpf-salt'
  return crypto.createHash('sha256').update(limparCPF(cpf) + salt).digest('hex')
}

export function cpfUltimos4(cpf: string): string {
  return limparCPF(cpf).slice(-4)
}

export function gerarCodigo6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function hashCodigo(codigo: string): Promise<string> {
  return bcrypt.hashSync(codigo, 8)
}

export function verificarCodigo(codigo: string, hash: string | null | undefined): boolean {
  if (!hash) return false
  return bcrypt.compareSync(codigo, hash)
}

export function expiraEm15Min(): Date {
  return new Date(Date.now() + 15 * 60 * 1000)
}

export function codigoExpirado(expira: Date | null | undefined): boolean {
  if (!expira) return true
  return new Date() > expira
}
