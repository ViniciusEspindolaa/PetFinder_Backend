import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import notificacoesRoutes from './routes/notificacoes'
import pushRoutes from './routes/push'

// Configuração e middlewares
import { config, validateConfig } from './config/environment'
import { logger, loggerMiddleware } from './middleware/logger'
import { sanitizarEntrada } from './middleware/validation'
import { specs, swaggerUi } from './config/swagger'
import { validateCloudinaryConfig, testCloudinaryConnection } from './config/cloudinary'

// Importações das rotas
import routesUsuarios from './routes/usuarios'
import routesPublicacoes from './routes/publicacoes'
import routesAvistamentos from './routes/avistamentos'
import routesEventos from './routes/eventos'
import routesLogin from './routes/login'
import routesDashboard from './routes/dashboard'
import routesMaps from './routes/maps'
import routesUpload from './routes/upload'
import routesAuth from './routes/auth'
import routesDenuncias from './routes/denuncias'
import iaRoutes from './routes/ia'
import routesServicos from './routes/servicos'
import routesAgendamentos from './routes/agendamentos';

// Validar configurações antes de iniciar
validateConfig()

// Verificar Cloudinary (não obrigatório para iniciar)
if (validateCloudinaryConfig()) {
  testCloudinaryConnection().then(connected => {
    if (connected) {
      logger.info('🖼️ Cloudinary configurado e funcionando')
    }
  })
} else {
  logger.warn('⚠️ Cloudinary não configurado - uploads desabilitados')
}

const app = express()
const port = config.port

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // In development, allow any localhost origin
    if (config.nodeEnv === 'development') {
      return callback(null, true)
    }
    
    if (origin === config.frontendUrl) {
      return callback(null, true)
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.'
    return callback(new Error(msg), false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Middlewares de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { 
    erro: "Muitas requisições deste IP. Tente novamente em alguns minutos.",
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000 / 60) + " minutos"
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

// Middlewares básicos
app.use(express.json({ limit: '10mb' }))

// Captura erros de parse do body (JSON inválido) gerados pelo body-parser
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // body-parser lança SyntaxError ou define err.type = 'entity.parse.failed'
  const isBodyParserError = err instanceof SyntaxError || err && (err.type === 'entity.parse.failed' || err.status === 400)

  if (isBodyParserError) {
    logger.warn('JSON inválido no corpo da requisição', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      contentType: req.headers['content-type'],
      message: err.message
    })

    return res.status(400).json({
      erro: 'JSON inválido no corpo da requisição',
      detalhes: err.message
    })
  }

  next(err)
})

// Middlewares de logging e sanitização
app.use(loggerMiddleware)
app.use(sanitizarEntrada)

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PetFinder API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}))

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Verifica se a API está funcionando
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API funcionando normalmente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 environment:
 *                   type: string
 *                   example: development
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv
  })
})

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'API PetFinder - Sistema de Localização de Pets',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      usuarios: '/api/usuarios',
      publicacoes: '/api/publicacoes', 
      avistamentos: '/api/avistamentos',
      eventos: '/api/eventos',
      login: '/api/login',
      dashboard: '/api/dashboard',
      maps: '/api/maps',
      upload: '/api/upload',
      health: '/health',
      docs: '/docs'
    },
    documentation: '/docs'
  })
})

// Rotas da API com prefixo /api
app.use("/api/usuarios", routesUsuarios)
app.use("/api/publicacoes", routesPublicacoes)
app.use("/api/avistamentos", routesAvistamentos)
app.use("/api/eventos", routesEventos)
app.use("/api/login", routesLogin)
app.use("/api/dashboard", routesDashboard)
app.use("/api/maps", routesMaps)
app.use("/api/upload", routesUpload)
app.use('/api/auth', routesAuth)
app.use('/api/denuncias', routesDenuncias)
app.use('/api/notificacoes', notificacoesRoutes)
app.use('/api/push', pushRoutes)
app.use('/api/ia', iaRoutes)
app.use('/api/servicos', routesServicos)
app.use('/api/agendamentos', routesAgendamentos);

// Rota raiz - redireciona para info da API
app.get('/', (req, res) => {
  res.redirect('/api')
})

// Middleware de tratamento de erros global
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Erro não capturado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  })
  
  // Em desenvolvimento, mostra detalhes do erro
  const errorResponse = {
    erro: 'Erro interno do servidor',
    timestamp: new Date().toISOString(),
    ...(config.nodeEnv === 'development' && {
      details: error.message,
      stack: error.stack
    })
  }
  
  res.status(500).json(errorResponse)
})

// 404 Handler
app.use('*', (req, res) => {
  logger.warn('Endpoint não encontrado', { 
    path: req.originalUrl,
    method: req.method,
    ip: req.ip 
  })
  
  res.status(404).json({ 
    erro: 'Endpoint não encontrado',
    path: req.originalUrl,
    message: 'Verifique a documentação da API em /api'
  })
})

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} recebido, iniciando graceful shutdown...`)
  
  // Dá tempo para requisições em andamento terminarem
  setTimeout(() => {
    logger.info('Servidor fechado com sucesso')
    process.exit(0)
  }, 5000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Captura erros não tratados
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejeitada não tratada:', { reason, promise })
  process.exit(1)
})

// Export app for Vercel
export default app

// Only start server if running directly
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`🐕 Servidor PetFinder iniciado com sucesso`, {
      port,
      environment: config.nodeEnv,
      nodeVersion: process.version
    })
    
    console.log(`🚀 PetFinder API rodando em http://localhost:${port}`)
    console.log(`📊 Health check: http://localhost:${port}/health`)
    console.log(`📖 API Info: http://localhost:${port}/api`)
    
    if (config.nodeEnv === 'development') {
      console.log(`🔧 Ambiente: ${config.nodeEnv}`)
      console.log(`📝 Logs: salvos em /logs/`)
    }
  })
}