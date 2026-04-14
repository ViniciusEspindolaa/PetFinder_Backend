# 🐕 PetFinder API

Sistema backend completo para localização e gerenciamento de pets perdidos, encontrados e adoção com integração Google Maps.

## ✨ **STATUS: MVP COMPLETO (TCC)** ✨

## 🚀 Funcionalidades

- **🔐 Autenticação Avançada**:
  - Login/Cadastro com JWT
  - **Google OAuth 2.0** (Login Social)
  - **Recuperação de Senha** (Token via Email)
- **👥 Usuários**: Cadastro, login e gerenciamento de perfis com JWT
- **📋 Publicações**: Pets perdidos, encontrados, para adoção e resgates
- **👁️ Avistamentos**: Sistema de reportar avistamentos de pets
- **🎉 Eventos**: Criação e gerenciamento de eventos relacionados a pets
- **🗺️ Geolocalização**: 
  - Cálculo de distância (Haversine) e suporte a Google Maps
  - **Geofencing**: Sistema de alertas baseado na localização em tempo real do usuário
- **📊 Dashboard**: Estatísticas e métricas do sistema
- **📧 Email**: Notificações automáticas por email
- **🖼️ Upload Cloudinary**: Sistema profissional de upload com otimização automática
- **📱 Mobile-First**: Upload direto do smartphone com interface otimizada
- **📖 Swagger**: Documentação interativa da API
- **🔒 Segurança**: Rate limiting, validação, logs estruturados

## 🛠️ Tecnologias

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Prisma** - ORM para banco de dados
- **PostgreSQL** (Neon) - Banco de dados em nuvem
- **JWT** - Autenticação e tokens
- **Cloudinary** - Upload e armazenamento de imagens
- **Mailtrap** - Testes de email (desenvolvimento)
- **Google Maps API** (Opcional) - Geolocalização
- **Swagger** - Documentação interativa da API
- **Winston** - Sistema de logs estruturados
- **Helmet** + **Express Rate Limit** - Segurança
- **Zod** + **Express Validator** - Validação de dados
- **Nodemailer** - Envio de emails
- **Bcrypt** - Hash de senhas
- **PM2** - Gerenciamento de processos
- **Docker** - Containerização

## 📦 Instalação

### Pré-requisitos
- Node.js >= 16
- PostgreSQL
- npm ou yarn

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/petfinder-api.git
cd petfinder-api
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

**Obrigatórias:**
```env
# Banco de dados (use Neon.tech para PostgreSQL gratuito em nuvem)
DATABASE_URL="postgresql://usuario:senha@host/database?sslmode=require"

# JWT (gere uma chave forte)
JWT_SECRET="sua_chave_secreta_super_forte_aqui"

# Servidor
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**Opcionais (para funcionalidades completas):**
```env
# Cloudinary - Upload de imagens (grátis: cloudinary.com)
CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="sua_api_key"
CLOUDINARY_API_SECRET="seu_api_secret"

# Mailtrap - Testes de email (grátis: mailtrap.io)
MAILTRAP_USER="seu_username"
MAILTRAP_PASS="sua_senha"
EMAIL_HOST="sandbox.smtp.mailtrap.io"
EMAIL_PORT=2525

# Google OAuth - Login social (opcional)
GOOGLE_CLIENT_ID="seu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu_client_secret"
```

### 4. Configure o banco de dados
```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Configure o Cloudinary (Upload de imagens)
```bash
# Obtenha credenciais em: https://cloudinary.com/users/register_free
# Adicione no .env:
CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="sua_api_key"  
CLOUDINARY_API_SECRET="seu_api_secret"
```

**📖 Guia completo:** [docs/cloudinary-setup.md](docs/cloudinary-setup.md)

### 6. Inicie o servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## � **DOCUMENTAÇÃO SWAGGER**

**🌟 Acesse a documentação interativa completa em:**
### **👉 [http://localhost:3001/docs](http://localhost:3001/docs) 👈**

A documentação Swagger inclui:
- 📋 **Todos os endpoints** com exemplos
- 🧪 **Interface de teste** interativa  
- 🔐 **Autenticação JWT** integrada
- 📝 **Schemas** de dados completos
- 🎯 **Códigos de resposta** detalhados

## �📚 Endpoints da API

### Base URL: `http://localhost:3001/api`

### 🔐 Autenticação
- `POST /login` - Login de usuário

### 👥 Usuários
- `GET /usuarios` - Listar usuários
- `POST /usuarios` - Cadastrar usuário
- `GET /usuarios/:id` - Buscar usuário por ID
- `PUT /usuarios/:id` - Atualizar usuário
- `DELETE /usuarios/:id` - Remover usuário

### 📋 Publicações
- `GET /publicacoes` - Listar todas as publicações
- `POST /publicacoes` - Criar nova publicação
- `GET /publicacoes/:id` - Buscar publicação por ID
- `GET /publicacoes/buscar?...` - Buscar com filtros
- `GET /publicacoes/tipo/:tipo` - Buscar por tipo
- `GET /publicacoes/especie/:especie` - Buscar por espécie

### 👁️ Avistamentos
- `GET /avistamentos` - Listar avistamentos
- `POST /avistamentos` - Reportar avistamento
- `GET /avistamentos/publicacao/:id` - Avistamentos de uma publicação
- `GET /avistamentos/proximidade/buscar` - Buscar por localização

### 🎉 Eventos
- `GET /eventos` - Listar eventos
- `POST /eventos` - Criar evento
- `GET /eventos/proximos` - Eventos próximos
- `GET /eventos/usuario/:id` - Eventos de um usuário
- `GET /eventos/buscar/:termo` - Buscar eventos por texto
- `PUT /eventos/:id` - Atualizar evento
- `DELETE /eventos/:id` - Remover evento
- `PATCH /eventos/:id/status` - Alterar status do evento

### 🖼️ Upload (Cloudinary)
- `POST /upload/pets` - Upload de fotos de pets (até 5 fotos)
- `POST /upload/avatar` - Upload de avatar do usuário
- `POST /upload/evento` - Upload de foto de evento
- `DELETE /upload/delete` - Deletar imagem por public_id
- `GET /upload/health` - Status do serviço de upload
- `POST /publicacoes/com-fotos` - **Criar publicação com upload direto**

### �️ Google Maps
- `POST /maps/geocode` - Geocodificar endereço
- `POST /maps/reverse-geocode` - Geocodificação reversa
- `GET /maps/nearby` - Buscar veterinários/pet shops próximos
- `GET /maps/static-map` - Gerar URL de mapa estático
- `GET /maps/autocomplete` - Autocompletar endereços
- `POST /maps/distance` - Calcular distância entre pontos
- `GET /maps/health` - Status da API Google Maps

### �📊 Dashboard
- `GET /dashboard/gerais` - Estatísticas gerais
- `GET /dashboard/petsPorEspecie` - Distribuição por espécie
- `GET /dashboard/taxaSucesso` - Taxa de pets encontrados

### 🏥 Sistema
- `GET /health` - Status do sistema
- `GET /api` - Informações da API
- `GET /docs` - **Documentação Swagger interativa**

## 🔧 Scripts Disponíveis

### **Desenvolvimento**
```bash
npm run dev              # Desenvolvimento com hot reload
npm run setup            # Setup inicial completo
npm run db:migrate       # Executar migrações do banco
npm run db:generate      # Gerar cliente Prisma
npm run db:studio        # Abrir Prisma Studio
npm run logs:clean       # Limpar arquivos de log
```

### **Produção e Deploy**
```bash
npm run build            # Build para produção
npm run start            # Iniciar em produção
npm run start:prod       # Iniciar versão compilada
npm run deploy:dev       # Deploy desenvolvimento
npm run deploy:prod      # Deploy produção
```

### **Docker**
```bash
npm run docker:build    # Build da imagem Docker
npm run docker:run      # Executar container
npm run docker:up       # Docker Compose up
npm run docker:down     # Docker Compose down
```

### **PM2 (Produção)**
```bash
npm run pm2:start       # Iniciar com PM2
npm run pm2:stop        # Parar PM2
npm run pm2:restart     # Reiniciar PM2
npm run pm2:logs        # Ver logs PM2
npm run pm2:monit       # Monitor PM2
```

## 📊 Monitoramento

### Logs
Os logs são salvos em:
- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas erros

### Health Check
Acesse `GET /health` para verificar o status do sistema:
```json
{
  "status": "OK",
  "timestamp": "2025-10-08T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development"
}
```

## 🔒 Segurança

- **Helmet** - Headers de segurança
- **Rate Limiting** - Proteção contra spam
- **CORS** - Controle de origem
- **JWT** - Autenticação stateless
- **Validação** - Sanitização de entrada
- **Logs** - Monitoramento de atividades

## 🚀 Deploy

### **Deploy Rápido (Script Automatizado)**
```bash
# Deploy desenvolvimento
npm run deploy:dev

# Deploy produção  
npm run deploy:prod
```

### **Deploy Manual**
1. Configure as variáveis de ambiente no `.env`
2. Execute migrações: `npm run db:migrate:prod`
3. Build: `npm run build`
4. Inicie: `npm run pm2:start`

### **Deploy com Docker**
```bash
# Desenvolvimento
npm run docker:up

# Produção
docker build -t petfinder-api .
docker run -p 3001:3001 --env-file .env petfinder-api
```

### **Plataformas de Deploy**
- **Heroku**: `git push heroku main`
- **Railway**: Deploy automático via GitHub
- **DigitalOcean**: App Platform ou Droplet
- **AWS**: Elastic Beanstalk ou ECS
- **Vercel**: Para Next.js (frontend)

📋 **Veja o guia completo em [DEPLOY.md](DEPLOY.md)**

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- 📧 Email: suporte@petfinder.com
- 📱 WhatsApp: (11) 99999-9999
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/petfinder-api/issues)

---

Feito com ❤️ para ajudar pets e seus donos se reencontrarem! 🐕🐱