import dotenv from 'dotenv'

// Carrega variáveis de ambiente
dotenv.config()

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  // Email
  email: {
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.MAILTRAP_USER || process.env.EMAIL_USER,
    pass: process.env.MAILTRAP_PASS || process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'petfinder@exemplo.com'
  },
  
  // Admin
  adminSecretKey: process.env.ADMIN_SECRET_KEY || 'change_this_in_production',
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX || '100') // 100 requests por window
  },
  
  // Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  
  // Google Maps API
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ''
}

// Validação de configurações críticas
export const validateConfig = () => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas:', missing)
    console.error('💡 Crie um arquivo .env com as variáveis necessárias')
    
    // Em desenvolvimento, mostra exemplo
    if (config.nodeEnv === 'development') {
      console.log('\n📝 Exemplo de .env:')
      console.log('DATABASE_URL="postgresql://usuario:senha@localhost:5432/petfinder"')
      console.log('JWT_SECRET="sua_chave_secreta_super_forte_aqui"')
      console.log('CLOUDINARY_CLOUD_NAME="seu_cloudinary_cloud_name"')
      console.log('CLOUDINARY_API_KEY="sua_cloudinary_api_key"')
      console.log('CLOUDINARY_API_SECRET="seu_cloudinary_api_secret"')
      console.log('GOOGLE_MAPS_API_KEY="sua_chave_google_maps"')
      console.log('MAILTRAP_USER="seu_usuario"')
      console.log('MAILTRAP_PASS="sua_senha"\n')
    }
    
    if (config.nodeEnv === 'production') {
      process.exit(1)
    }
  }
}