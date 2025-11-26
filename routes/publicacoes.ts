import { prisma } from "../config/prisma"
import { Router } from "express"
import { z } from 'zod'
import nodemailer from "nodemailer"
import { uploadPetPhotos, handleUploadError, extractFileInfo } from "../middleware/upload"
import { getEmailTemplate } from "../utils/emailTemplate"

const router = Router()

// Schema base
const publicacaoBaseSchema = z.object({
  usuarioId: z.string(),
  titulo: z.string().min(5, { message: "Título deve possuir, no mínimo, 5 caracteres" }),
  descricao: z.string().min(10, { message: "Descrição deve possuir, no mínimo, 10 caracteres" }),
  fotos_urls: z.array(z.string().url()),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  endereco_texto: z.string().min(5).max(100),
  bairro: z.string().min(1).max(60).optional(),
  cidade: z.string().min(1).max(60).optional(),
  telefone_contato: z.string().max(15).optional(),
  tipo: z.enum(["PERDIDO", "ENCONTRADO", "ADOCAO", "RESGATE"])
})

// Schemas específicos por tipo
const petPerdidoSchema = publicacaoBaseSchema.extend({
  especie: z.enum(["CACHORRO", "GATO", "OUTRO"]), // Obrigatório
  nome_pet: z.string().min(1, { message: "Nome do pet é obrigatório" }).max(40),
  raca: z.string().max(40).optional(),
  porte: z.enum(["PEQUENO", "MEDIO", "GRANDE"]).optional(),
  cor: z.string().max(20).optional(),
  sexo: z.enum(["MACHO", "FEMEA", "INDEFINIDO"]).optional(),
  idade: z.number().min(0).optional(),
  unidadeIdade: z.enum(["ANOS", "MESES"]).optional(),
  recompensa: z.number().min(0).nullable().optional(),
  // aceita string ISO ou número (timestamp) e converte para Date
  data_evento: z.preprocess((arg) => {
    if (typeof arg === 'string' || typeof arg === 'number') return new Date(arg as any)
    return arg
  }, z.date({ message: "Data em que o pet se perdeu é obrigatória" }))
})

const petEncontradoSchema = publicacaoBaseSchema.extend({
  especie: z.enum(["CACHORRO", "GATO", "OUTRO"]), 
  raca: z.string().max(40).optional(),
  porte: z.enum(["PEQUENO", "MEDIO", "GRANDE"]).optional(),
  cor: z.string().max(20).optional(),
  sexo: z.enum(["MACHO", "FEMEA", "INDEFINIDO"]).optional(),
  idade: z.number().min(0).optional(),
  unidadeIdade: z.enum(["ANOS", "MESES"]).optional(),
  data_evento: z.preprocess((arg) => {
    if (typeof arg === 'string' || typeof arg === 'number') return new Date(arg as any)
    return arg
  }, z.date({ message: "Data em que o pet foi encontrado é obrigatória" }))
})

const petAdocaoSchema = publicacaoBaseSchema.extend({
  especie: z.enum(["CACHORRO", "GATO", "OUTRO"]),
  nome_pet: z.string().min(1, { message: "Nome do pet é obrigatório" }).max(40),
  raca: z.string().max(40).optional(),
  porte: z.enum(["PEQUENO", "MEDIO", "GRANDE"]).optional(),
  cor: z.string().max(20).optional(),
  sexo: z.enum(["MACHO", "FEMEA", "INDEFINIDO"]).optional(),
  idade: z.number().min(0, { message: "Idade é obrigatória para adoção" }),
  unidadeIdade: z.enum(["ANOS", "MESES"]).optional()
})

const petResgateSchema = publicacaoBaseSchema.extend({
  especie: z.enum(["CACHORRO", "GATO", "OUTRO"]), 
  raca: z.string().max(40).optional(),
  porte: z.enum(["PEQUENO", "MEDIO", "GRANDE"]).optional(),
  cor: z.string().max(20).optional(),
  sexo: z.enum(["MACHO", "FEMEA", "INDEFINIDO"]).optional(),
  idade: z.number().min(0).optional(),
  unidadeIdade: z.enum(["ANOS", "MESES"]).optional()
})

// Função para validar baseada no tipo
function validarPublicacao(dados: any) {
  const { tipo } = dados
  
  switch (tipo) {
    case 'PERDIDO':
      return petPerdidoSchema.safeParse(dados)
    case 'ENCONTRADO':
      return petEncontradoSchema.safeParse(dados)
    case 'ADOCAO':
      return petAdocaoSchema.safeParse(dados)
    case 'RESGATE':
      return petResgateSchema.safeParse(dados)
    default:
      return {  
        success: false as const, 
        error: { 
          issues: [{ message: "Tipo de publicação inválido", path: ['tipo'] }],
          name: "ZodError"
        }
      }
  }
}

// Rota POST corrigida
router.post("/", async (req, res) => {
  const valida = validarPublicacao(req.body)
  
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const dados = valida.data

  try {
    const publicacao = await prisma.publicacao.create({
      data: dados,
      include: {
        usuario: true
      }
    })

    // Email de confirmação (removido parâmetro extra)
    try {
      await enviaEmail(
        publicacao.usuario.nome,
        publicacao.usuario.email,
        'confirmacao',
        publicacao
      );
    } catch (emailError) {
      console.error("Erro ao enviar email de confirmação:", emailError);
    }

    // Notificar usuários próximos (não bloqueante)
    notificarUsuariosProximos(publicacao);

    res.status(201).json(publicacao)
  } catch (error) {
    res.status(400).json(error)
  }
})

async function notificarUsuariosProximos(publicacao: any) {
  try {
    // Raio máximo de busca inicial (para garantir que pegamos usuários com raio personalizado)
    const MAX_SEARCH_RADIUS_KM = 50 
    
    const lat = Number(publicacao.latitude)
    const lng = Number(publicacao.longitude)

    // Cálculo aproximado de graus por km (1 grau ≈ 111km)
    const deltaLat = MAX_SEARCH_RADIUS_KM / 111
    const deltaLng = MAX_SEARCH_RADIUS_KM / (111 * Math.cos(lat * Math.PI / 180))

    // Buscar usuários com localização definida dentro da bbox expandida
    const candidatos = await prisma.usuario.findMany({
      where: {
        AND: [
          { id: { not: publicacao.usuarioId } },
          { latitude: { not: null } },
          { longitude: { not: null } },
          { latitude: { gte: lat - deltaLat, lte: lat + deltaLat } },
          { longitude: { gte: lng - deltaLng, lte: lng + deltaLng } }
        ]
      },
      select: {
        id: true,
        nome: true,
        email: true,
        latitude: true,
        longitude: true,
        configuracoes: true // Importante: buscar as configurações
      }
    })

    // Filtrar por distância real (Haversine) considerando o raio de CADA usuário
    for (const u of candidatos) {
      const distancia = haversineKm(lat, lng, Number(u.latitude), Number(u.longitude))
      
      // Obter raio de alerta do usuário ou usar padrão (10km)
      const userConfig = u.configuracoes as any
      const userRadius = userConfig?.alertRadius ? Number(userConfig.alertRadius) : 10
      
      // Verificar se o usuário quer receber notificações de pets próximos
      const notifyNearby = userConfig?.notifyNearby !== false // Default true

      if (notifyNearby && distancia <= userRadius) {
        // 1. Envia Email
        await enviaEmailNotificacao(u.nome, u.email, publicacao)

        // 2. Cria Notificação no Banco
        await prisma.notificacao.create({
          data: {
            usuarioId: u.id,
            titulo: `Novo pet perdido próximo a você!`,
            corpo: `Um ${publicacao.especie.toLowerCase()} foi perdido a ${distancia.toFixed(1)}km de você. Ajude a encontrar!`,
            lida: false,
            canal: 'APP',
            dados: {
              type: 'nearby',
              petId: String(publicacao.id),
              latitude: publicacao.latitude,
              longitude: publicacao.longitude,
              distancia: distancia
            }
          }
        })
      }
    }
  } catch (err) {
    console.error('Erro ao notificar usuários próximos:', err)
  }
}

async function enviaEmail(nome: string, email: string, tipo: 'confirmacao' | 'avistamento', dados: any) {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER || "968f0dd8cc78d9",
      pass: process.env.MAILTRAP_PASS || "89ed8bfbf9b7f9"
    }
  });

  let subject = "";
  let htmlContent = "";
  let textContent = "";

  if (tipo === 'confirmacao') {
    subject = "Confirmação de Publicação - PetFinder";
    textContent = `Olá ${nome}, sua publicação "${dados.titulo}" foi criada com sucesso!`;
    
    const content = `
      <h2>Olá ${nome}!</h2>
      <p>Sua publicação foi criada com sucesso no PetFinder.</p>
      
      <div class="info-box">
        <h3>${dados.titulo}</h3>
        <p><strong>Descrição:</strong> ${dados.descricao}</p>
        <p><strong>Localização:</strong> ${dados.endereco_texto}</p>
        ${dados.especie ? `<p><strong>Espécie:</strong> ${dados.especie}</p>` : ''}
        ${dados.nome_pet ? `<p><strong>Nome do Pet:</strong> ${dados.nome_pet}</p>` : ''}
      </div>

      <p>Esperamos que você encontre seu pet em breve!</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet/${dados.id}" class="button" style="color: #ffffff;">Ver Publicação</a>
      </div>
    `;
    
    htmlContent = getEmailTemplate(subject, content);

  } else if (tipo === 'avistamento') {
    subject = "Novo Avistamento - PetFinder";
    textContent = `Olá ${nome}, há um novo avistamento relacionado à sua publicação "${dados.publicacao.titulo}"!`;
    
    const content = `
      <h2>Olá ${nome}!</h2>
      <p>Temos boas notícias! Há um novo avistamento relacionado à sua publicação <span class="highlight">"${dados.publicacao.titulo}"</span>.</p>
      
      <div class="info-box">
        <h3>Detalhes do Avistamento</h3>
        <p><strong>Local:</strong> ${dados.publicacao.endereco_texto}</p>
        <p><strong>Data:</strong> ${new Date(dados.data_avistamento).toLocaleString('pt-BR')}</p>
        ${dados.observacoes ? `<p><strong>Observações:</strong> ${dados.observacoes}</p>` : ''}
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;">
        <p><strong>Reportado por:</strong> ${dados.usuario.nome}</p>
        <p><strong>Contato:</strong> ${dados.usuario.email} ${dados.usuario.telefone ? `- ${dados.usuario.telefone}` : ''}</p>
      </div>

      <p>Entre em contato com quem reportou o avistamento para mais informações!</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet/${dados.publicacao.id}" class="button" style="color: #ffffff;">Ver Detalhes</a>
      </div>
    `;

    htmlContent = getEmailTemplate(subject, content);
  }

  const info = await transporter.sendMail({
    from: 'petfinder@gmail.com',
    to: email,
    subject: subject,
    text: textContent,
    html: htmlContent
  });

  console.log("Message sent: %s", info.messageId);
}

// Envia email de notificação para usuários próximos a uma publicação
async function enviaEmailNotificacao(nome: string, email: string, publicacao: any) {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER || "968f0dd8cc78d9",
      pass: process.env.MAILTRAP_PASS || "89ed8bfbf9b7f9"
    }
  });

  const subject = `Novo anúncio próximo a você - ${publicacao.titulo}`;
  
  const content = `
    <h2>Olá ${nome}!</h2>
    <p>Foi publicado um novo anúncio próximo à sua localização que pode te interessar:</p>
    
    <div class="info-box">
      <h3>${publicacao.titulo}</h3>
      <p><strong>Descrição:</strong> ${publicacao.descricao}</p>
      <p><strong>Local:</strong> ${publicacao.endereco_texto}</p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet/${publicacao.id}" class="button" style="color: #ffffff;">Ver Publicação</a>
    </div>
  `;

  const htmlContent = getEmailTemplate(subject, content);

  try {
    const info = await transporter.sendMail({
      from: 'petfinder@gmail.com',
      to: email,
      subject,
      text: `Há um novo anúncio próximo a você: ${publicacao.titulo}`,
      html: htmlContent
    });
    console.log("Email de notificação enviado: %s", info.messageId);
  } catch (err) {
    console.error('Erro ao enviar email de notificação:', err);
  }
}

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const publicacao = await prisma.publicacao.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(publicacao)
  } catch (error) {
    res.status(400).json(error)
  }
})

// Adicionar rota correta para buscar publicações por usuário
router.get("/usuario/:usuarioId", async (req, res) => {
  const { usuarioId } = req.params
  try {
    const publicacoes = await prisma.publicacao.findMany({
      where: { usuarioId },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })
    res.status(200).json(publicacoes)
  } catch (error) {
    res.status(400).json(error)
  }
})


// Rota GET principal - buscar todas as publicações (exceto finalizadas)
router.get("/", async (req, res) => {
  try {
    const publicacoes = await prisma.publicacao.findMany({
      where: {
        status: {
          not: 'RESOLVIDO'
        }
      },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })
    res.status(200).json(publicacoes)
  } catch (error) {
    res.status(400).json(error)
  }
})

// Rota para busca com filtros múltiplos
router.get("/buscar", async (req, res) => {
  try {
    const {
      titulo,
      especie,
      raca,
      porte,
      cor,
      sexo,
      tipo,
      status,
      cidade,
      usuarioId,
      idade_min,
      idade_max
    } = req.query

    // Construir filtros dinamicamente
    const filtros: any = {}

    // Filtro por título (busca parcial, case-insensitive)
    if (titulo) {
      filtros.titulo = {
        contains: titulo as string,
        mode: 'insensitive'
      }
    }

    // Filtros exatos
    if (especie) filtros.especie = especie as string
    if (raca) {
      filtros.raca = {
        contains: raca as string,
        mode: 'insensitive'
      }
    }
    if (porte) filtros.porte = porte as string
    if (cor) {
      filtros.cor = {
        contains: cor as string,
        mode: 'insensitive'
      }
    }
    if (sexo) filtros.sexo = sexo as string
    // Filtro por status
    if (status) {
      filtros.status = status as string
    } else {
      // Se não especificar status, exclui os resolvidos por padrão
      filtros.status = {
        not: 'RESOLVIDO'
      }
    }

    if (usuarioId) filtros.usuarioId = usuarioId as string

    // Filtro por localização (busca no endereço)
    if (cidade) {
      filtros.endereco_texto = {
        contains: cidade as string,
        mode: 'insensitive'
      }
    }

    // Filtro por idade (range)
    if (idade_min || idade_max) {
      filtros.idade = {}
      if (idade_min) filtros.idade.gte = parseInt(idade_min as string)
      if (idade_max) filtros.idade.lte = parseInt(idade_max as string)
    }

    const publicacoes = await prisma.publicacao.findMany({
      where: filtros,
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })

    res.status(200).json({
      total: publicacoes.length,
      filtros_aplicados: filtros,
      publicacoes
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Busca por texto livre (título + descrição)
router.get("/buscar/texto/:termo", async (req, res) => {
  const { termo } = req.params
  
  try {
    const publicacoes = await prisma.publicacao.findMany({
      where: {
        OR: [
          {
            titulo: {
              contains: termo,
              mode: 'insensitive'
            }
          },
          {
            descricao: {
              contains: termo,
              mode: 'insensitive'
            }
          },
          {
            nome_pet: {
              contains: termo,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })
    
    res.status(200).json({
      termo_busca: termo,
      total: publicacoes.length,
      publicacoes
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Busca por localização (proximidade)
router.get("/buscar/proximidade", async (req, res) => {
  try {
    const { latitude, longitude, raio_km } = req.query
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        erro: "Latitude e longitude são obrigatórias" 
      })
    }

    const lat = parseFloat(latitude as string)
    const lng = parseFloat(longitude as string)
    const raio = parseFloat(raio_km as string) || 10 // Default: 10km

    // Cálculo aproximado de graus por km (1 grau ≈ 111km)
    const deltaLat = raio / 111
    const deltaLng = raio / (111 * Math.cos(lat * Math.PI / 180))

    const publicacoes = await prisma.publicacao.findMany({
      where: {
        latitude: {
          gte: lat - deltaLat,
          lte: lat + deltaLat
        },
        longitude: {
          gte: lng - deltaLng,
          lte: lng + deltaLng
        },
        status: {
          not: 'RESOLVIDO'
        }
      },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })

    res.status(200).json({
      centro: { latitude: lat, longitude: lng },
      raio_km: raio,
      total: publicacoes.length,
      publicacoes
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Busca por tipo específico
router.get("/tipo/:tipo", async (req, res) => {
  const { tipo } = req.params
  
  const tiposValidos = ['PERDIDO', 'ENCONTRADO', 'ADOCAO', 'RESGATE']
  
  if (!tiposValidos.includes(tipo.toUpperCase())) {
    return res.status(400).json({ 
      erro: "Tipo inválido", 
      tipos_validos: tiposValidos 
    })
  }
  
  try {
    const publicacoes = await prisma.publicacao.findMany({
      where: { 
        tipo: tipo.toUpperCase() as any 
      },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })
    
    res.status(200).json({
      tipo,
      total: publicacoes.length,
      publicacoes
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Busca por espécie
router.get("/especie/:especie", async (req, res) => {
  const { especie } = req.params
  
  const especiesValidas = ['CACHORRO', 'GATO', 'OUTRO']
  
  if (!especiesValidas.includes(especie.toUpperCase())) {
    return res.status(400).json({ 
      erro: "Espécie inválida", 
      especies_validas: especiesValidas 
    })
  }
  
  try {
    const publicacoes = await prisma.publicacao.findMany({
      where: { 
        especie: especie.toUpperCase() as any 
      },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })
    
    res.status(200).json({
      especie,
      total: publicacoes.length,
      publicacoes
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Busca por status
router.get("/status/:status", async (req, res) => {
  const { status } = req.params
  
  const statusValidos = ['ATIVO', 'RESOLVIDO', 'PENDENTE', 'EM_ANDAMENTO', 'EM_ANALISE', 'RESGATADO']
  
  if (!statusValidos.includes(status.toUpperCase())) {
    return res.status(400).json({ 
      erro: "Status inválido", 
      status_validos: statusValidos 
    })
  }
  
  try {
    const publicacoes = await prisma.publicacao.findMany({
      where: { 
        status: status.toUpperCase() as any 
      },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          }
        }
      },
      orderBy: { data_publicacao: 'desc' }
    })
    
    res.status(200).json({
      status,
      total: publicacoes.length,
      publicacoes
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Busca por ID específico
router.get("/:id", async (req, res) => {
  const { id } = req.params
  
  try {
    const publicacao = await prisma.publicacao.findUnique({
      where: { id: Number(id) },
      include: {
        usuario: true,
        avistamentos: {
          include: {
            usuario: true
          },
          orderBy: { data_avistamento: 'desc' }
        }
      }
    })
    
    if (!publicacao) {
      return res.status(404).json({ erro: "Publicação não encontrada" })
    }
    
    res.status(200).json(publicacao)
  } catch (error) {
    res.status(400).json(error)
  }
})

// Nova rota: Criar publicação com upload de fotos direto
/**
 * @swagger
 * /api/publicacoes/com-fotos:
 *   post:
 *     summary: Criar publicação com upload de fotos
 *     description: Cria uma nova publicação fazendo upload das fotos diretamente
 *     tags: [Publicações]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - descricao
 *               - tipo
 *               - latitude
 *               - longitude
 *               - endereco_texto
 *               - especie
 *               - fotos
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: "Cachorro perdido no Parque Ibirapuera"
 *               descricao:
 *                 type: string
 *                 example: "Golden Retriever, muito dócil, perdido desde ontem"
 *               tipo:
 *                 type: string
 *                 enum: [PERDIDO, ENCONTRADO, ADOCAO, RESGATE]
 *                 example: "PERDIDO"
 *               especie:
 *                 type: string
 *                 enum: [CACHORRO, GATO, OUTRO]
 *                 example: "CACHORRO"
 *               nome_pet:
 *                 type: string
 *                 example: "Rex"
 *               raca:
 *                 type: string
 *                 example: "Golden Retriever"
 *               porte:
 *                 type: string
 *                 enum: [PEQUENO, MEDIO, GRANDE]
 *                 example: "GRANDE"
 *               cor:
 *                 type: string
 *                 example: "Dourado"
 *               sexo:
 *                 type: string
 *                 enum: [MACHO, FEMEA, INDEFINIDO]
 *                 example: "MACHO"
 *               idade:
 *                 type: number
 *                 example: 3
 *               latitude:
 *                 type: number
 *                 example: -23.5875
 *               longitude:
 *                 type: number
 *                 example: -46.6574
 *               endereco_texto:
 *                 type: string
 *                 example: "Av. Paulista, 1000 - São Paulo"
 *               data_evento:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:30:00.000Z"
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Até 5 fotos do pet (JPG, PNG, GIF, WebP)"
 *     responses:
 *       201:
 *         description: Publicação criada com sucesso
 *       400:
 *         description: Dados inválidos ou erro no upload
 *       401:
 *         description: Token não fornecido ou inválido
 */
router.post("/com-fotos", (req, res) => {
  // Fazer upload das fotos primeiro
  uploadPetPhotos(req, res, async (uploadError) => {
    if (uploadError) {
      return handleUploadError(uploadError, req, res, () => {});
    }

    try {
      // Extrair URLs das fotos uploadadas
      let fotos_urls: string[] = [];
      
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const fotosInfo = req.files.map(extractFileInfo);
        fotos_urls = fotosInfo.map(foto => foto.url);
      }

      // Preparar dados da publicação
      const dadosPublicacao = {
        ...req.body,
        fotos_urls: fotos_urls,
        // Converter strings para números
        latitude: parseFloat(req.body.latitude),
        bairro: req.body.bairro || undefined,
        cidade: req.body.cidade || undefined,
        longitude: parseFloat(req.body.longitude),
        idade: req.body.idade ? parseInt(req.body.idade) : undefined,
        unidadeIdade: req.body.unidadeIdade || 'ANOS',
        recompensa: req.body.recompensa ? parseFloat(req.body.recompensa) : undefined,
        // Converter data
        data_evento: req.body.data_evento ? new Date(req.body.data_evento) : new Date()
      };

      // Validar dados
      const resultado = validarPublicacao(dadosPublicacao);
      
      if (!resultado.success) {
        return res.status(400).json({ 
          erro: "Dados inválidos", 
          detalhes: resultado.error.issues 
        });
      }

      // Criar publicação no banco
      const publicacao = await prisma.publicacao.create({
        data: resultado.data,
        include: {
          usuario: true
        }
      });

      // Enviar email de confirmação
      try {
        await enviaEmail(
          publicacao.usuario.nome,
          publicacao.usuario.email,
          'confirmacao',
          publicacao
        );
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
        // Não falhar a criação da publicação por erro de email
      }

      // Notificar usuários próximos (não bloqueante)
      notificarUsuariosProximos(publicacao);

      res.status(201).json({
        ...publicacao,
        fotos_enviadas: req.files?.length || 0,
        message: `Publicação criada com ${fotos_urls.length} foto(s)`
      });

    } catch (error) {
      console.error("Erro ao criar publicação:", error);
      res.status(500).json({ 
        erro: "Erro interno do servidor",
        detalhes: "Tente novamente em alguns instantes"
      });
    }
  });
});

// Nova rota: Atualizar publicação (PUT)
router.put("/:id", (req, res) => {
  const { id } = req.params
  console.log(`[PUT] Atualizando publicação ${id}`);

  // Reutiliza o middleware de upload para processar multipart/form-data
  uploadPetPhotos(req, res, async (uploadError) => {
    if (uploadError) {
      console.error("Erro no upload:", uploadError);
      return handleUploadError(uploadError, req, res, () => {});
    }

    try {
      console.log("[PUT] Body recebido:", req.body);
      // Verificar se a publicação existe
      const existingPub = await prisma.publicacao.findUnique({
        where: { id: Number(id) }
      })

      if (!existingPub) {
        return res.status(404).json({ erro: "Publicação não encontrada" })
      }

      // Extrair URLs das novas fotos (se houver)
      let fotos_urls: string[] = existingPub.fotos_urls; // Mantém as antigas por padrão
      
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const fotosInfo = req.files.map(extractFileInfo);
        // Se enviou novas fotos, substitui as antigas (ou poderia adicionar, dependendo da regra de negócio)
        // Aqui vamos substituir para simplificar a edição
        fotos_urls = fotosInfo.map(foto => foto.url);
      }

      // Preparar dados para atualização
      // O Zod schema espera tipos específicos, então precisamos converter
      const dadosAtualizacao: any = {
        ...req.body,
        fotos_urls: fotos_urls,
      };

      // Conversões de tipos
      if (req.body.latitude) dadosAtualizacao.latitude = parseFloat(req.body.latitude);
      if (req.body.longitude) dadosAtualizacao.longitude = parseFloat(req.body.longitude);
      if (req.body.idade) dadosAtualizacao.idade = parseInt(req.body.idade);
      if (req.body.unidadeIdade) dadosAtualizacao.unidadeIdade = req.body.unidadeIdade;
      
      // Handle reward update (including removal)
      if (req.body.recompensa !== undefined && req.body.recompensa !== null && req.body.recompensa !== '') {
        dadosAtualizacao.recompensa = parseFloat(req.body.recompensa);
      } else if (req.body.recompensa === '') {
        dadosAtualizacao.recompensa = null;
      }

      if (req.body.data_evento) dadosAtualizacao.data_evento = new Date(req.body.data_evento);

      // Sanitize optional fields
      if (!req.body.cidade) dadosAtualizacao.cidade = undefined;
      if (!req.body.bairro) dadosAtualizacao.bairro = undefined;
      
      // Validar dados (reutilizando a função de validação)
      // Nota: validarPublicacao valida TODOS os campos obrigatórios. 
      // Para update parcial, idealmente teríamos um schema parcial, mas como o form envia tudo, ok.
      const resultado = validarPublicacao(dadosAtualizacao);
      
      if (!resultado.success) {
        console.error("[PUT] Erro de validação:", resultado.error);
        return res.status(400).json({ 
          erro: "Dados inválidos", 
          detalhes: resultado.error.issues 
        });
      }

      console.log("[PUT] Dados validados para Prisma:", resultado.data);

      // Atualizar no banco
      const publicacaoAtualizada = await prisma.publicacao.update({
        where: { id: Number(id) },
        data: resultado.data,
        include: {
          usuario: true
        }
      });

      res.status(200).json(publicacaoAtualizada);

    } catch (error) {
      console.error("Erro ao atualizar publicação:", error);
      res.status(500).json({ 
        erro: "Erro interno do servidor",
        detalhes: "Tente novamente em alguns instantes"
      });
    }
  });
});

// Função para enviar email de confirmação de finalização
async function enviaEmailFinalizacao(nome: string, email: string, publicacao: any, motivo: string) {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_USER || "968f0dd8cc78d9",
      pass: process.env.MAILTRAP_PASS || "89ed8bfbf9b7f9"
    }
  });

  const subject = "Publicação Finalizada - PetFinder";
  
  const content = `
    <h2>Olá ${nome}!</h2>
    <p>Sua publicação foi finalizada com sucesso.</p>
    
    <div class="info-box">
      <h3>${publicacao.titulo}</h3>
      <p><strong>Motivo:</strong> ${motivo}</p>
      <p><strong>Data de Finalização:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    </div>

    <p>Ficamos felizes em ajudar! Se precisar de mais alguma coisa, conte conosco.</p>
    
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pet/${publicacao.id}" class="button" style="color: #ffffff;">Ver Publicação</a>
    </div>
  `;

  const htmlContent = getEmailTemplate(subject, content);

  try {
    const info = await transporter.sendMail({
      from: 'petfinder@gmail.com',
      to: email,
      subject: subject,
      html: htmlContent
    });
    console.log("Email de finalização enviado: %s", info.messageId);
  } catch (err) {
    console.error('Erro ao enviar email de finalização:', err);
  }
}

// Rota para finalizar publicação
router.patch("/:id/finalizar", async (req, res) => {
  const { id } = req.params
  const { motivo } = req.body

  if (!motivo) {
    return res.status(400).json({ erro: "Motivo é obrigatório" })
  }

  try {
    const publicacao = await prisma.publicacao.findUnique({
      where: { id: Number(id) }
    })

    if (!publicacao) {
      return res.status(404).json({ erro: "Publicação não encontrada" })
    }

    const publicacaoAtualizada = await prisma.publicacao.update({
      where: { id: Number(id) },
      data: {
        status: 'RESOLVIDO',
        motivo_encerramento: motivo,
        recompensa: null // Remove recompensa se houver, pois foi finalizado
      },
      include: {
        usuario: true
      }
    })

    // Enviar email de confirmação
    try {
      await enviaEmailFinalizacao(
        publicacaoAtualizada.usuario.nome,
        publicacaoAtualizada.usuario.email,
        publicacaoAtualizada,
        motivo
      );
    } catch (emailError) {
      console.error("Erro ao enviar email de finalização:", emailError);
    }

    res.status(200).json(publicacaoAtualizada)
  } catch (error) {
    console.error("Erro ao finalizar publicação:", error)
    res.status(500).json({ erro: "Erro interno ao finalizar publicação" })
  }
})

export default router

// Helper Haversine function
function haversineKm(lat1:number, lon1:number, lat2:number, lon2:number){
  const R = 6371; // km
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}