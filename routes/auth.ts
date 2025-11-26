import { Router } from 'express';
import dotenv from 'dotenv';
import { verifyGoogleIdToken, exchangeAppleCode } from '../services/oauth';
import { prisma as prismaClient } from '../config/prisma'
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import { getEmailTemplate } from '../utils/emailTemplate';

dotenv.config();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function findOrCreateUserFromSocial(provider: string, providerId: string, email?: string, name?: string) {
  // try find social account
  const existing = await prismaClient.socialAccount.findUnique({ where: { provider_providerId: { provider, providerId } }, include: { usuario: true } });
  if (existing) return existing.usuario;

  // if not, try find user by email
  let user = null;
  if (email) {
    user = await prismaClient.usuario.findUnique({ where: { email } });
  }

  if (!user) {
    // create a minimal user record
    user = await prismaClient.usuario.create({ data: { nome: name || 'Usuário', email: email || `no-email-${provider}-${providerId}@local`, senha: '', telefone: '' } });
  }

  // create social account
  await prismaClient.socialAccount.create({ data: { provider, providerId, email, userId: user.id } });
  return user;
}

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'Email é obrigatório' });

  try {
    const user = await prismaClient.usuario.findUnique({ where: { email } });
    if (!user) {
      // Security: Don't reveal if user exists
      return res.json({ message: 'Se o email existir, você receberá um link de recuperação.' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await prismaClient.usuario.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires
      }
    });

    // Send email
    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER || "968f0dd8cc78d9",
        pass: process.env.MAILTRAP_PASS || "89ed8bfbf9b7f9"
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const content = `
      <h2>Recuperação de Senha</h2>
      <p>Você solicitou a recuperação de senha para sua conta no PetFinder.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button" style="color: #ffffff;">Redefinir Senha</a>
      </div>
      <p>Se você não solicitou isso, ignore este email.</p>
      <p>O link expira em 1 hora.</p>
    `;

    const html = getEmailTemplate('Recuperação de Senha', content);

    await transporter.sendMail({
      from: 'petfinder@gmail.com',
      to: email,
      subject: 'Recuperação de Senha - PetFinder',
      html
    });

    res.json({ message: 'Se o email existir, você receberá um link de recuperação.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ erro: 'Erro ao processar solicitação' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ erro: 'Token e nova senha são obrigatórios' });

  try {
    const user = await prismaClient.usuario.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ erro: 'Token inválido ou expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prismaClient.usuario.update({
      where: { id: user.id },
      data: {
        senha: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    res.json({ message: 'Senha alterada com sucesso' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ erro: 'Erro ao redefinir senha' });
  }
});

// For SPA/mobile: accept id_token from client (Google) and return project JWT
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ erro: 'idToken é obrigatório' });

  try {
    const payload = await verifyGoogleIdToken(idToken);
    if (!payload) return res.status(401).json({ erro: 'Token inválido' });

    const { sub, email, name, picture } = payload;
    
    const user = await findOrCreateUserFromSocial('google', sub, email, name);
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.nome,
        email: user.email,
        photoUrl: picture, // Google picture
      },
      token
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ erro: 'Falha na autenticação com Google' });
  }
});

// For Apple: exchange authorization code server-side, then create/find user and return JWT
router.post('/apple/token', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ erro: 'code necessário' });

    const tokenResponse = await exchangeAppleCode(code);
    const id_token = tokenResponse.id_token as string | undefined;
    // NOTE: full verification of Apple's id_token (JWKS) is recommended; here we decode payload for pragmatic flow
    const decoded = id_token ? JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString()) : null;
    const provider = 'apple';
    const providerId = decoded?.sub as string;
    const email = decoded?.email as string | undefined;
    const name = decoded?.name || decoded?.email || 'Usuário Apple';

    const user = await findOrCreateUserFromSocial(provider, providerId, email, name);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, user });
  } catch (err: any) {
    console.error('apple/token error', err?.message || err);
    return res.status(500).json({ erro: 'erro ao trocar code apple', details: err?.message });
  }
});

export default router;
