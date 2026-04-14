import { prisma } from "../config/prisma"
import { Router } from "express"
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { logger } from '../middleware/logger'

const router = Router()

const usuarioSchema = z.object({
  nome: z.string().min(10, { message: "Nome deve possuir, no mínimo, 10 caracteres" }).max(60, { message: "Nome deve possuir, no máximo, 60 caracteres" }),
  email: z.string().email().max(40, { message: "Email deve possuir, no máximo, 40 caracteres" }),
  senha: z.string(),
  telefone: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
})

const usuarioUpdateSchema = z.object({
  nome: z.string().min(10, { message: "Nome deve possuir, no mínimo, 10 caracteres" }).optional(),
  email: z.string().email().optional(),
  senha: z.string().optional(),
  telefone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
})

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Listar todos os usuários
 *     description: Retorna uma lista de todos os usuários cadastrados
 *     tags: [Usuários]
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Erro na consulta
 *       401:
 *         description: Token não fornecido ou inválido
 */
router.get("/", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany()
    res.status(200).json(usuarios)
  } catch (error) {
    res.status(400).json(error)
  }
})

function validaSenha(senha: string) {

  const mensa: string[] = []

  // .length: retorna o tamanho da string (da senha)
  if (senha.length < 8) {
    mensa.push("Erro... senha deve possuir, no mínimo, 8 caracteres")
  }

  // contadores
  let pequenas = 0
  let grandes = 0
  let numeros = 0
  let simbolos = 0

  // senha = "abc123"
  // letra = "a"

  // percorre as letras da variável senha
  for (const letra of senha) {
    // expressão regular
    if ((/[a-z]/).test(letra)) {
      pequenas++
    }
    else if ((/[A-Z]/).test(letra)) {
      grandes++
    }
    else if ((/[0-9]/).test(letra)) {
      numeros++
    } else {
      simbolos++
    }
  }

  if (pequenas == 0) {
    mensa.push("Erro... senha deve possuir letra(s) minúscula(s)")
  }

  if (grandes == 0) {
    mensa.push("Erro... senha deve possuir letra(s) maiúscula(s)")
  }

  if (numeros == 0) {
    mensa.push("Erro... senha deve possuir número(s)")
  }

  if (simbolos == 0) {
    mensa.push("Erro... senha deve possuir símbolo(s)")
  }

  return mensa
}

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Criar novo usuário
 *     description: Cadastra um novo usuário no sistema
 *     tags: [Usuários]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *               - telefone
 *             properties:
 *               nome:
 *                 type: string
 *                 minLength: 10
 *                 example: "João Silva Santos"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               senha:
 *                 type: string
 *                 minLength: 8
 *                 example: "MinhaSenh@123"
 *                 description: "Deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos"
 *               telefone:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *               endereco:
 *                 type: string
 *                 example: "Rua das Flores, 123 - São Paulo"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Dados inválidos ou usuário já existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: "E-mail já cadastrado"
 */
router.post("/", async (req, res) => {

  const valida = usuarioSchema.safeParse(req.body)
  if (!valida.success) {
    // Loga corpo recebido com senha mascarada para facilitar depuração
    try {
      const bodyCopy = { ...req.body }
      if (bodyCopy.senha) bodyCopy.senha = '***masked***'
      logger.warn('Validação de usuário falhou', { body: bodyCopy, errors: valida.error.format ? valida.error.format() : valida.error })
    } catch (e) {
      logger.warn('Falha ao logar corpo inválido (possivelmente não serializável)')
    }

    res.status(400).json({ erro: valida.error })
    return
  }

  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join("; ") })
    return
  }

  // 12 é o número de voltas (repetições) que o algoritmo faz
  // para gerar o salt (sal/tempero)
  const salt = bcrypt.genSaltSync(12)
  // gera o hash da senha acrescida do salt
  const hash = bcrypt.hashSync(valida.data.senha, salt)

  const { nome, email, telefone, latitude, longitude } = valida.data

  // para o campo senha, atribui o hash gerado
  try {
    const usuario = await prisma.usuario.create({
      data: { 
        nome, 
        email, 
        senha: hash, 
        telefone,
        latitude,
        longitude
      }
    })
    res.status(201).json(usuario)
  } catch (error: any) {
    logger.error('Erro ao criar usuário', { error })
    if (error.code === 'P2002') {
      res.status(400).json({ erro: "E-mail já cadastrado no sistema." })
    } else {
      res.status(400).json({ erro: error.message || "Erro ao criar usuário" })
    }
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const usuario = await prisma.usuario.findFirst({
      where: { id }
    })
    res.status(200).json(usuario)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params
  const valida = usuarioUpdateSchema.safeParse(req.body)
  
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const dataToUpdate: any = { ...valida.data }

  if (dataToUpdate.senha) {
    const erros = validaSenha(dataToUpdate.senha)
    if (erros.length > 0) {
      res.status(400).json({ erro: erros.join("; ") })
      return
    }
    const salt = bcrypt.genSaltSync(12)
    dataToUpdate.senha = bcrypt.hashSync(dataToUpdate.senha, salt)
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: dataToUpdate
    })
    res.status(200).json(usuario)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.patch("/:id/password", async (req, res) => {
  const { id } = req.params
  const { senhaAtual, novaSenha } = req.body

  if (!senhaAtual || !novaSenha) {
    res.status(400).json({ erro: "Senha atual e nova senha são obrigatórias" })
    return
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) {
      res.status(404).json({ erro: "Usuário não encontrado" })
      return
    }

    const senhaCorreta = bcrypt.compareSync(senhaAtual, usuario.senha)
    if (!senhaCorreta) {
      res.status(400).json({ erro: "Senha atual incorreta" })
      return
    }

    const erros = validaSenha(novaSenha)
    if (erros.length > 0) {
      res.status(400).json({ erro: erros.join("; ") })
      return
    }

    const salt = bcrypt.genSaltSync(12)
    const hash = bcrypt.hashSync(novaSenha, salt)

    await prisma.usuario.update({
      where: { id },
      data: { senha: hash }
    })

    res.status(200).json({ mensagem: "Senha atualizada com sucesso" })
  } catch (error) {
    logger.error('Erro ao atualizar senha', { error })
    res.status(500).json({ erro: "Erro interno ao atualizar senha" })
  }
})

router.patch("/:id/config", async (req, res) => {
  const { id } = req.params
  const { configuracoes } = req.body

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { configuracoes }
    })
    res.status(200).json(usuario)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router