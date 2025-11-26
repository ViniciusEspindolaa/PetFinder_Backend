import { prisma } from "../config/prisma"
import { Router } from "express"

const router = Router()

// Estatísticas gerais do sistema
router.get("/gerais", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.count()
    const publicacoes = await prisma.publicacao.count()
    const avistamentos = await prisma.avistamento.count()
    
    // Contadores por tipo de publicação
    const publicacoesPorTipo = await prisma.publicacao.groupBy({
      by: ['tipo'],
      _count: { tipo: true }
    })
    
    // Contadores por status
    const publicacoesPorStatus = await prisma.publicacao.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    res.status(200).json({ 
      usuarios, 
      publicacoes, 
      avistamentos,
      publicacoes_por_tipo: publicacoesPorTipo,
      publicacoes_por_status: publicacoesPorStatus
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Distribuição de pets por espécie
router.get("/petsPorEspecie", async (req, res) => {
  try {
    const especies = await prisma.publicacao.groupBy({
      by: ['especie'],
      _count: { especie: true }
    })

    const especies2 = especies.map((item: any) => ({
      especie: item.especie,
      total: item._count.especie
    }))

    res.status(200).json(especies2)
  } catch (error) {
    res.status(400).json(error)
  }
})

// Distribuição geográfica das publicações
router.get("/publicacoesPorCidade", async (req, res) => {
  try {
    // Extrai cidade do campo endereco_texto (assumindo formato padrão)
    const publicacoes = await prisma.publicacao.findMany({
      select: {
        endereco_texto: true
      }
    })

    // Agrupa por cidade (lógica simplificada - pode ser melhorada)
    const cidadesCount: { [key: string]: number } = {}
    
    publicacoes.forEach((pub: any) => {
      // Tenta extrair cidade do endereço (última parte após vírgula)
      const partes = pub.endereco_texto.split(',')
      const cidade = partes[partes.length - 1].trim()
      
      cidadesCount[cidade] = (cidadesCount[cidade] || 0) + 1
    })

    const resultado = Object.entries(cidadesCount)
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total)

    res.status(200).json(resultado)
  } catch (error) {
    res.status(400).json(error)
  }
})

// Estatísticas de avistamentos
router.get("/avistamentos", async (req, res) => {
  try {
    const totalAvistamentos = await prisma.avistamento.count()
    
    // Publicações com mais avistamentos
    const publicacoesComAvistamentos = await prisma.publicacao.findMany({
      select: {
        id: true,
        titulo: true,
        tipo: true,
        _count: {
          select: { avistamentos: true }
        }
      },
      where: {
        avistamentos: {
          some: {}
        }
      },
      orderBy: {
        avistamentos: {
          _count: 'desc'
        }
      },
      take: 10
    })

    res.status(200).json({
      total_avistamentos: totalAvistamentos,
      publicacoes_mais_avistadas: publicacoesComAvistamentos
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Atividade por período (últimos 30 dias)
router.get("/atividadeRecente", async (req, res) => {
  try {
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 30)

    const publicacoesRecentes = await prisma.publicacao.count({
      where: {
        data_publicacao: {
          gte: dataLimite
        }
      }
    })

    const avistamentosRecentes = await prisma.avistamento.count({
      where: {
        data_avistamento: {
          gte: dataLimite
        }
      }
    })

    const usuariosRecentes = await prisma.usuario.count({
      where: {
        createdAt: {
          gte: dataLimite
        }
      }
    })

    res.status(200).json({
      periodo: "Últimos 30 dias",
      novas_publicacoes: publicacoesRecentes,
      novos_avistamentos: avistamentosRecentes,
      novos_usuarios: usuariosRecentes
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

// Taxa de sucesso (pets encontrados)
router.get("/taxaSucesso", async (req, res) => {
  try {
    const totalPerdidos = await prisma.publicacao.count({
      where: { tipo: 'PERDIDO' }
    })

    const petsPerdidosResolvidos = await prisma.publicacao.count({
      where: { 
        tipo: 'PERDIDO',
        status: 'RESOLVIDO'
      }
    })

    const taxaSucesso = totalPerdidos > 0 ? 
      ((petsPerdidosResolvidos / totalPerdidos) * 100).toFixed(2) : 0

    res.status(200).json({
      total_pets_perdidos: totalPerdidos,
      pets_encontrados: petsPerdidosResolvidos,
      taxa_sucesso_percentual: parseFloat(taxaSucesso as string)
    })
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router