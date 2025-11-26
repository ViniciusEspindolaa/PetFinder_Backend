import { Router, Request, Response } from 'express';
import { geocodingService } from '../services/geocoding';
import { validationResult, body, query } from 'express-validator';
import { verificarToken } from '../middleware/auth';

const router = Router();

// Middleware de validação
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * /api/maps/geocode:
 *   post:
 *     summary: Geocodificar endereço
 *     description: Converte um endereço em coordenadas geográficas usando a API do Google Maps
 *     tags: [Google Maps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endereco
 *             properties:
 *               endereco:
 *                 type: string
 *                 minLength: 5
 *                 example: "Av. Paulista, 1000, São Paulo, SP"
 *                 description: "Endereço completo para geocodificação"
 *     responses:
 *       200:
 *         description: Geocodificação realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/GeocodeResult'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Endereço não encontrado
 *       401:
 *         description: Token não fornecido ou inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/geocode', [
  verificarToken,
  body('endereco')
    .notEmpty()
    .withMessage('Endereço é obrigatório')
    .isLength({ min: 5 })
    .withMessage('Endereço deve ter pelo menos 5 caracteres'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { endereco } = req.body;
    
    const resultado = await geocodingService.geocodificarEndereco(endereco);
    
    if (!resultado) {
      return res.status(404).json({
        success: false,
        message: 'Endereço não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Erro na geocodificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/maps/reverse-geocode
 * Geocodificação reversa - coordenadas para endereço
 */
router.post('/reverse-geocode', [
  verificarToken,
  body('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude deve estar entre -90 e 90'),
  body('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude deve estar entre -180 e 180'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    
    const resultado = await geocodingService.geocodificacaoReversa(lat, lng);
    
    if (!resultado) {
      return res.status(404).json({
        success: false,
        message: 'Endereço não encontrado para essas coordenadas'
      });
    }
    
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Erro na geocodificação reversa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/maps/nearby
 * Busca serviços próximos (veterinários, pet shops, etc.)
 */
router.get('/nearby', [
  verificarToken,
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude deve estar entre -90 e 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude deve estar entre -180 e 180'),
  query('tipo')
    .optional()
    .isIn(['veterinario', 'petshop', 'hospital_veterinario', 'clinica_veterinaria', 'pet_shop', 'loja_animais'])
    .withMessage('Tipo de serviço inválido'),
  query('raio')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Raio deve estar entre 100m e 50km'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { lat, lng, tipo = 'veterinario', raio = 5000 } = req.query;
    
    const resultados = await geocodingService.buscarProximidade(
      Number(lat),
      Number(lng),
      String(tipo),
      Number(raio)
    );
    
    // Adicionar distância calculada para cada resultado
    const resultadosComDistancia = resultados.map(resultado => ({
      ...resultado,
      distancia: geocodingService.calcularDistancia(
        Number(lat),
        Number(lng),
        resultado.coordenadas.lat,
        resultado.coordenadas.lng
      )
    })).sort((a, b) => a.distancia - b.distancia); // Ordenar por distância
    
    res.json({
      success: true,
      data: {
        total: resultadosComDistancia.length,
        resultados: resultadosComDistancia
      }
    });
  } catch (error) {
    console.error('Erro na busca por proximidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/maps/static-map
 * Gera URL para mapa estático
 */
router.get('/static-map', [
  verificarToken,
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude deve estar entre -90 e 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude deve estar entre -180 e 180'),
  query('zoom')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Zoom deve estar entre 1 e 20'),
  query('tamanho')
    .optional()
    .matches(/^\d{1,4}x\d{1,4}$/)
    .withMessage('Tamanho deve estar no formato "larguraxaltura" (ex: 600x400)'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { lat, lng, zoom = 15, tamanho = '600x400', marcadores } = req.query;
    
    let marcadoresParsed;
    if (marcadores) {
      try {
        marcadoresParsed = JSON.parse(String(marcadores));
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Formato de marcadores inválido. Use JSON válido.'
        });
      }
    }
    
    const urlMapa = geocodingService.gerarUrlMapaEstatico(
      Number(lat),
      Number(lng),
      Number(zoom),
      String(tamanho),
      marcadoresParsed
    );
    
    res.json({
      success: true,
      data: {
        url: urlMapa
      }
    });
  } catch (error) {
    console.error('Erro ao gerar mapa estático:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/maps/autocomplete
 * Autocompletar endereços
 */
router.get('/autocomplete', [
  verificarToken,
  query('input')
    .notEmpty()
    .withMessage('Input é obrigatório')
    .isLength({ min: 2 })
    .withMessage('Input deve ter pelo menos 2 caracteres'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { input } = req.query;
    
    const sugestoes = await geocodingService.autocompletarEndereco(String(input));
    
    res.json({
      success: true,
      data: {
        sugestoes
      }
    });
  } catch (error) {
    console.error('Erro no autocompletar:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/maps/distance
 * Calcula distância entre dois pontos
 */
router.post('/distance', [
  verificarToken,
  body('origem')
    .isObject()
    .withMessage('Origem deve ser um objeto com lat e lng'),
  body('origem.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude de origem deve estar entre -90 e 90'),
  body('origem.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude de origem deve estar entre -180 e 180'),
  body('destino')
    .isObject()
    .withMessage('Destino deve ser um objeto com lat e lng'),
  body('destino.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude de destino deve estar entre -90 e 90'),
  body('destino.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude de destino deve estar entre -180 e 180'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { origem, destino } = req.body;
    
    const distancia = geocodingService.calcularDistancia(
      origem.lat,
      origem.lng,
      destino.lat,
      destino.lng
    );
    
    res.json({
      success: true,
      data: {
        distancia: Math.round(distancia * 100) / 100, // Arredondar para 2 casas decimais
        unidade: 'km'
      }
    });
  } catch (error) {
    console.error('Erro no cálculo de distância:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/maps/health
 * Verifica se a API do Google Maps está funcionando
 */
router.get('/health', [verificarToken], async (req: Request, res: Response) => {
  try {
    // Testa geocodificação de um endereço conhecido
    const teste = await geocodingService.geocodificarEndereco('São Paulo, SP, Brasil');
    
    if (teste) {
      res.json({
        success: true,
        message: 'API do Google Maps funcionando normalmente',
        data: {
          testResult: 'OK',
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'API do Google Maps não está respondendo adequadamente'
      });
    }
  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(503).json({
      success: false,
      message: 'Erro ao verificar API do Google Maps',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;