import { Router } from "express"
import { prisma } from "../config/prisma"
import { z } from "zod"
import nodemailer from "nodemailer"
import { getEmailTemplate } from "../utils/emailTemplate"

const router = Router()

const denunciaSchema = z.object({
  publicacaoId: z.number(),
  usuarioId: z.string().optional(),
  motivo: z.string().min(1),
  descricao: z.string().optional()
})

router.post("/", async (req, res) => {
  const validacao = denunciaSchema.safeParse(req.body)

  if (!validacao.success) {
    return res.status(400).json({ erro: validacao.error })
  }

  const { publicacaoId, usuarioId, motivo, descricao } = validacao.data

  try {
    const denuncia = await prisma.denuncia.create({
      data: {
        publicacaoId,
        usuarioId,
        motivo,
        descricao
      },
      include: {
        publicacao: {
          include: {
            usuario: true
          }
        }
      }
    })

    // Enviar email de confirmação da denúncia para o admin (ou para o usuário que denunciou, se tiver email)
    // Neste caso, vamos simular envio para um admin ou logar
    // Se quisermos enviar para o dono da publicação avisando da denúncia (cuidado com spam/abuso)
    
    // Vamos enviar um email para o dono da publicação informando que houve uma denúncia (opcional, mas pedido pelo usuário "confirmar denuncia")
    // "confirmar denuncia" pode significar confirmar para quem denunciou que a denúncia foi recebida.
    // Como usuarioId é opcional, se tiver usuarioId, buscamos o email dele.
    
    if (usuarioId) {
      const denunciante = await prisma.usuario.findUnique({ where: { id: usuarioId } })
      if (denunciante) {
        await enviaEmailConfirmacaoDenuncia(denunciante.nome, denunciante.email, denuncia)
      }
    }

    res.status(201).json(denuncia)
  } catch (error) {
    console.error("Erro ao criar denúncia:", error)
    res.status(500).json({ erro: "Erro interno ao criar denúncia" })
  }
})

async function enviaEmailConfirmacaoDenuncia(nome: string, email: string, denuncia: any) {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER || "968f0dd8cc78d9",
      pass: process.env.MAILTRAP_PASS || "89ed8bfbf9b7f9"
    }
  });

  const subject = "Denúncia Recebida - PetFinder";
  
  const content = `
    <h2>Olá ${nome}!</h2>
    <p>Recebemos sua denúncia referente à publicação <span class="highlight">"${denuncia.publicacao.titulo}"</span>.</p>
    
    <div class="info-box">
      <h3>Detalhes da Denúncia</h3>
      <p><strong>Motivo:</strong> ${denuncia.motivo}</p>
      ${denuncia.descricao ? `<p><strong>Descrição:</strong> ${denuncia.descricao}</p>` : ''}
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    </div>

    <p>Nossa equipe irá analisar o caso e tomar as medidas necessárias.</p>
    <p>Agradecemos por ajudar a manter a comunidade segura.</p>
    
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet/${denuncia.publicacao.id}" class="button" style="color: #ffffff;">Ver Publicação Denunciada</a>
    </div>
  `;

  const htmlContent = getEmailTemplate(subject, content);

  try {
    await transporter.sendMail({
      from: 'petfinder@gmail.com',
      to: email,
      subject: subject,
      html: htmlContent
    });
    console.log("Email de confirmação de denúncia enviado.");
  } catch (err) {
    console.error('Erro ao enviar email de denúncia:', err);
  }
}

export default router
