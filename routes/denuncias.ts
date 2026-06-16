import { Router } from "express"
import { prisma } from "../config/prisma"
import { z } from "zod"
import nodemailer from "nodemailer"
import { getEmailTemplate } from "../utils/emailTemplate"

const router = Router()

const denunciaSchema = z.object({
  publicacaoId: z.number().optional(),
  eventoId: z.number().optional(),
  servicoId: z.number().optional(),
  usuarioId: z.string().optional(),
  motivo: z.string().min(1),
  descricao: z.string().optional()
}).refine(
  (data) => !!(data.publicacaoId || data.eventoId || data.servicoId),
  { message: "Informe publicacaoId, eventoId ou servicoId" }
)

const tipoLabels: Record<string, string> = {
  publicacao: "publicação",
  evento: "evento",
  servico: "serviço",
}

router.post("/", async (req, res) => {
  const validacao = denunciaSchema.safeParse(req.body)

  if (!validacao.success) {
    return res.status(400).json({ erro: validacao.error })
  }

  const { publicacaoId, eventoId, servicoId, usuarioId, motivo, descricao } = validacao.data

  try {
    const denuncia = await prisma.denuncia.create({
      data: {
        publicacaoId,
        eventoId,
        servicoId,
        usuarioId,
        motivo,
        descricao
      },
      include: {
        publicacao: { include: { usuario: true } },
        evento: { include: { usuario: true } },
        servico: { include: { usuario: true } },
      }
    })

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

  let tipo = "publicacao"
  let titulo = ""
  let link = process.env.FRONTEND_URL || 'http://localhost:3000'

  if (denuncia.publicacao) {
    tipo = "publicacao"
    titulo = denuncia.publicacao.titulo
    link = `${link}/pet/${denuncia.publicacao.id}`
  } else if (denuncia.evento) {
    tipo = "evento"
    titulo = denuncia.evento.titulo
    link = `${link}/eventos/${denuncia.evento.id}`
  } else if (denuncia.servico) {
    tipo = "servico"
    titulo = denuncia.servico.nome
    link = `${link}/servicos/${denuncia.servico.id}`
  }

  const subject = "Denúncia Recebida - PetFinder";
  const tipoLabel = tipoLabels[tipo] || "conteúdo";

  const content = `
    <h2>Olá ${nome}!</h2>
    <p>Recebemos sua denúncia referente à ${tipoLabel} <span class="highlight">"${titulo}"</span>.</p>
    
    <div class="info-box">
      <h3>Detalhes da Denúncia</h3>
      <p><strong>Motivo:</strong> ${denuncia.motivo}</p>
      ${denuncia.descricao ? `<p><strong>Descrição:</strong> ${denuncia.descricao}</p>` : ''}
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    </div>

    <p>Nossa equipe irá analisar o caso e tomar as medidas necessárias.</p>
    <p>Agradecemos por ajudar a manter a comunidade segura.</p>
    
    <div style="text-align: center;">
      <a href="${link}" class="button" style="color: #ffffff;">Ver ${tipoLabel} denunciada</a>
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
