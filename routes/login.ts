import jwt from "jsonwebtoken"
import { prisma } from "../config/prisma"
import { Router } from "express"
import bcrypt from 'bcrypt'

const router = Router()

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Fazer login
 *     description: Autentica um usuário e retorna um token JWT
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@email.com"
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 nome:
 *                   type: string
 *                   example: "João Silva"
 *                 email:
 *                   type: string
 *                   example: "joao@email.com"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Dados inválidos ou credenciais incorretas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: "Login ou senha incorretos"
 *       500:
 *         description: Erro interno do servidor
 */
router.post("/", async (req, res) => {
  const { email, senha } = req.body

  // em termos de segurança, o recomendado é exibir uma mensagem padrão
  // a fim de evitar de dar "dicas" sobre o processo de login para hackers
  const mensaPadrao = "Login ou senha incorretos"

  if (!email || !senha) {
    res.status(400).json({ erro: mensaPadrao })
    return
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { email }
    })

    if (usuario == null) {
      // Em desenvolvimento, log mais detalhado
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Login] Usuário não encontrado: ${email}`)
      }
      res.status(400).json({ erro: mensaPadrao })
      return
    }

    // se o e-mail existe, faz-se a comparação dos hashs
    if (bcrypt.compareSync(senha, usuario.senha)) {
      // se confere, gera e retorna o token (usando JWT_SECRET para compatibilidade com middleware)
      const token = jwt.sign({
        id: usuario.id,
        email: usuario.email,
        usuarioLogadoId: usuario.id,
        usuarioLogadoNome: usuario.nome
      },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" }
      )

      res.status(200).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        latitude: usuario.latitude,
        longitude: usuario.longitude,
        token
      })
    } else {
      // Em desenvolvimento, log mais detalhado
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Login] Senha incorreta para: ${email}`)
      }
      res.status(400).json({ erro: mensaPadrao })
    }
  } catch (error) {
    // Em desenvolvimento, retorna detalhes do erro
    if (process.env.NODE_ENV === 'development') {
      console.error('[Login] Erro:', error)
      res.status(500).json({ 
        erro: "Erro interno do servidor",
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } else {
      res.status(500).json({ erro: "Erro interno do servidor" })
    }
  }
})

export default router