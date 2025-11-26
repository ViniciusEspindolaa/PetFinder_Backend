# 🚀 DEPLOY GUIDE - PetFinder API

## 📋 Pré-requisitos

### 1. Servidor/VPS
- **Node.js 18+** instalado
- **PostgreSQL 12+** rodando
- **Redis** (opcional, para cache futuro)
- **PM2** ou similar para gerenciar processo

### 2. Variáveis de Ambiente
Certifique-se de configurar todas as variáveis no arquivo `.env`:

```bash
# Produção
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://petfinder.com

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/petfinder_prod"

# JWT (IMPORTANTE: Use chaves seguras!)
JWT_SECRET="sua_chave_jwt_super_secreta_para_producao_aqui"
JWT_EXPIRES_IN="7d"

# Google Maps
GOOGLE_MAPS_API_KEY="sua_chave_google_maps_aqui"

# Cloudinary
CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="sua_api_key"
CLOUDINARY_API_SECRET="seu_api_secret"

# Email
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="seu_email@gmail.com"
EMAIL_PASS="sua_senha_ou_app_password"
EMAIL_FROM="petfinder@seudominio.com"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Admin
ADMIN_SECRET_KEY="chave_admin_super_secreta_producao"
```

## 🛠️ Comandos de Deploy

### Deploy Manual

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/petfinder-api.git
cd petfinder-api

# 2. Instalar dependências
npm install --production

# 3. Configurar ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 4. Configurar banco de dados
npx prisma migrate deploy
npx prisma generate

# 5. Build (se necessário)
npm run build

# 6. Instalar PM2 globalmente
npm install -g pm2

# 7. Iniciar com PM2
pm2 start ecosystem.config.js

# 8. Salvar configuração PM2
pm2 save
pm2 startup
```

### Deploy Automatizado com Script

```bash
# Tornar script executável
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

## 🐳 Deploy com Docker

```bash
# Build da imagem
docker build -t petfinder-api .

# Executar container
docker run -d \
  --name petfinder-api \
  -p 3001:3001 \
  --env-file .env \
  petfinder-api

# Ou usar docker-compose
docker-compose up -d
```

## 🔧 Configurações de Servidor

### Nginx (Proxy Reverso)
```nginx
server {
    listen 80;
    server_name api.petfinder.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL com Certbot
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d api.petfinder.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoramento

### PM2 Monitoring
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs petfinder-api

# Restart
pm2 restart petfinder-api

# Monitor em tempo real
pm2 monit
```

### Health Checks
```bash
# Script de health check
curl -f http://localhost:3001/health || exit 1

# Adicionar ao crontab para monitoramento
*/5 * * * * /path/to/health-check.sh
```

## 🔐 Segurança

### Firewall
```bash
# UFW (Ubuntu)
sudo ufw allow 22        # SSH
sudo ufw allow 80        # HTTP  
sudo ufw allow 443       # HTTPS
sudo ufw enable
```

### Backup do Banco
```bash
# Criar backup
pg_dump petfinder_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Script de backup automático
0 2 * * * /path/to/backup-script.sh
```

## 🚀 Plataformas de Deploy

### Heroku
1. Instalar Heroku CLI
2. `heroku create petfinder-api`
3. `heroku addons:create heroku-postgresql:hobby-dev`
4. `heroku config:set NODE_ENV=production`
5. `git push heroku main`

### Railway
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Deploy automático

### DigitalOcean App Platform
1. Criar novo app
2. Conectar repositório
3. Configurar variáveis de ambiente
4. Deploy automático

### AWS/Azure/GCP
- Use serviços como Elastic Beanstalk, App Service, ou Cloud Run
- Configure RDS/Database para PostgreSQL
- Use CloudWatch/Application Insights para logs

## ✅ Checklist Pré-Deploy

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Banco de dados criado e migrado
- [ ] Chaves de API (Google Maps, Cloudinary) válidas
- [ ] SSL configurado
- [ ] Firewall configurado
- [ ] Backup automático configurado
- [ ] Monitoring configurado
- [ ] Logs configurados
- [ ] Rate limiting adequado para produção
- [ ] Documentação Swagger acessível
- [ ] Health checks funcionando

## 🆘 Troubleshooting

### Problemas Comuns

1. **Erro "EADDRINUSE"**: Porta já em uso
   ```bash
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Erro de conexão com banco**: Verificar `DATABASE_URL`
   ```bash
   npx prisma db push
   ```

3. **Erro 404 nas rotas**: Verificar se todas as rotas estão registradas

4. **Erro de CORS**: Verificar `FRONTEND_URL` no .env

5. **Rate limit muito baixo**: Ajustar `RATE_LIMIT_MAX` para produção

### Logs Importantes
```bash
# PM2 logs
pm2 logs petfinder-api --lines 100

# Sistema
sudo journalctl -u nginx -f
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 📈 Otimizações Pós-Deploy

1. **CDN**: Usar CloudFlare ou similar
2. **Cache**: Implementar Redis
3. **Database**: Otimizar queries e indexação
4. **Monitoring**: New Relic, DataDog, ou Sentry
5. **Analytics**: Implementar métricas de negócio

---

**🎉 Sucesso!** Sua API PetFinder está rodando em produção!

Acesse: `https://api.petfinder.com/docs` para ver a documentação.