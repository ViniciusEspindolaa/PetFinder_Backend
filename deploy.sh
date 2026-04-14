#!/bin/bash

# 🚀 Script de Deploy Automatizado - PetFinder API
# Uso: ./deploy.sh [desenvolvimento|producao]

set -e  # Parar execução se houver erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar argumentos
ENVIRONMENT=${1:-development}

if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "producao" ]]; then
    error "Ambiente deve ser 'development' ou 'producao'"
fi

log "🚀 Iniciando deploy para ambiente: $ENVIRONMENT"

# 1. Verificar pré-requisitos
log "📋 Verificando pré-requisitos..."

if ! command -v node &> /dev/null; then
    error "Node.js não está instalado"
fi

if ! command -v npm &> /dev/null; then
    error "npm não está instalado"
fi

NODE_VERSION=$(node --version)
info "Node.js versão: $NODE_VERSION"

# 2. Instalar dependências
log "📦 Instalando dependências..."
if [[ "$ENVIRONMENT" == "producao" ]]; then
    npm ci --only=production
else
    npm install
fi

# 3. Verificar arquivo .env
log "🔧 Verificando configuração..."
if [[ ! -f .env ]]; then
    warning "Arquivo .env não encontrado. Copiando de .env.example..."
    cp .env.example .env
    warning "⚠️  IMPORTANTE: Configure as variáveis no arquivo .env antes de continuar!"
    
    if [[ "$ENVIRONMENT" == "producao" ]]; then
        read -p "Pressione Enter após configurar o .env ou Ctrl+C para cancelar..."
    fi
fi

# 4. Gerar Prisma Client
log "🗃️  Gerando Prisma Client..."
npx prisma generate

# 5. Executar migrações do banco
log "🗄️  Executando migrações do banco..."
if [[ "$ENVIRONMENT" == "producao" ]]; then
    npx prisma migrate deploy
else
    npx prisma migrate dev --name deploy_$(date +%Y%m%d_%H%M%S)
fi

# 6. Verificar saúde do banco
log "🏥 Verificando conexão com banco..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    log "✅ Conexão com banco estabelecida"
else
    error "❌ Não foi possível conectar ao banco de dados"
fi

# 7. Build (se necessário)
if [[ -f "tsconfig.json" ]] && [[ "$ENVIRONMENT" == "producao" ]]; then
    log "🏗️  Executando build..."
    npm run build
fi

# 8. Parar processos existentes
log "⏹️  Parando processos existentes..."
if command -v pm2 &> /dev/null; then
    pm2 stop petfinder-api 2>/dev/null || true
    pm2 delete petfinder-api 2>/dev/null || true
fi

# 9. Criar diretórios necessários
log "📁 Criando diretórios..."
mkdir -p logs temp

# 10. Iniciar aplicação
log "🚀 Iniciando aplicação..."

if [[ "$ENVIRONMENT" == "producao" ]]; then
    # Produção com PM2
    if ! command -v pm2 &> /dev/null; then
        warning "PM2 não encontrado. Instalando..."
        npm install -g pm2
    fi
    
    pm2 start ecosystem.config.js --env production
    pm2 save
    log "✅ Aplicação iniciada com PM2"
    
    # Configurar PM2 para iniciar automaticamente
    pm2 startup || true
    
else
    # Desenvolvimento
    log "🔧 Iniciando em modo desenvolvimento..."
    info "Use 'npm run dev' para iniciar manualmente"
fi

# 11. Aguardar aplicação inicializar
log "⏳ Aguardando aplicação inicializar..."
sleep 5

# 12. Verificar saúde da aplicação
log "🏥 Verificando saúde da aplicação..."
MAX_ATTEMPTS=10
ATTEMPT=1

while [[ $ATTEMPT -le $MAX_ATTEMPTS ]]; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "✅ Aplicação está respondendo!"
        break
    else
        warning "Tentativa $ATTEMPT/$MAX_ATTEMPTS falhou. Aguardando..."
        sleep 3
        ((ATTEMPT++))
    fi
done

if [[ $ATTEMPT -gt $MAX_ATTEMPTS ]]; then
    error "❌ Aplicação não está respondendo após $MAX_ATTEMPTS tentativas"
fi

# 13. Mostrar status
log "📊 Status da aplicação:"
if command -v pm2 &> /dev/null && [[ "$ENVIRONMENT" == "producao" ]]; then
    pm2 status
fi

# 14. Mostrar informações finais
log "🎉 Deploy concluído com sucesso!"
info "📖 Documentação: http://localhost:3001/docs"
info "🏥 Health Check: http://localhost:3001/health"
info "📋 API Info: http://localhost:3001/api"

if [[ "$ENVIRONMENT" == "producao" ]]; then
    info "📊 Monitor PM2: pm2 monit"
    info "📝 Ver logs: pm2 logs petfinder-api"
    info "🔄 Restart: pm2 restart petfinder-api"
fi

# 15. Backup do banco (produção)
if [[ "$ENVIRONMENT" == "producao" ]]; then
    log "💾 Criando backup do banco..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    if command -v pg_dump &> /dev/null; then
        pg_dump $DATABASE_URL > "backups/$BACKUP_FILE" 2>/dev/null || warning "Não foi possível criar backup"
        log "✅ Backup salvo em: backups/$BACKUP_FILE"
    else
        warning "pg_dump não encontrado. Pule o backup automático."
    fi
fi

log "🚀 Deploy finalizado! API PetFinder está rodando em $ENVIRONMENT"