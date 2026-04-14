# 🖼️ **CONFIGURAÇÃO DO CLOUDINARY - PetFinder API**

## 📋 **Visão Geral**

O Cloudinary é um serviço de nuvem para gerenciamento e otimização de imagens/vídeos. Nosso sistema usa para:

- ✅ **Upload automático** de fotos de pets
- ✅ **Otimização** automática de imagens
- ✅ **Transformações** (redimensionamento, qualidade)
- ✅ **CDN global** para carregamento rápido
- ✅ **Backup automático** na nuvem

---

## 🚀 **SETUP RÁPIDO (5 minutos)**

### **1. Criar Conta Gratuita**
1. Acesse: https://cloudinary.com/users/register_free
2. Cadastre-se com email
3. Confirme email
4. Faça login no dashboard

### **2. Obter Credenciais**
No dashboard do Cloudinary, você verá:

```
Cloud name: seu_cloud_name
API Key: 123456789012345
API Secret: sua_chave_secreta_aqui
```

### **3. Configurar no .env**
Edite o arquivo `.env`:

```bash
# Cloudinary (copie exatamente do dashboard)
CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="123456789012345"  
CLOUDINARY_API_SECRET="sua_chave_secreta_aqui"
```

### **4. Reiniciar Servidor**
```bash
npm run dev
```

### **5. Verificar Status**
Acesse: http://localhost:3001/api/upload/health

Deve retornar:
```json
{
  "status": "OK",
  "message": "Serviço de upload funcionando",
  "provider": "Cloudinary",
  "configurado": true
}
```

---

## 📊 **PLANOS E CUSTOS**

### **🆓 Plano Gratuito (Para MVP):**
- ✅ **25.000 transformações/mês**
- ✅ **25 GB storage**
- ✅ **25 GB bandwidth**
- ✅ **Todas as funcionalidades básicas**

**💡 Suficiente para 1000+ usuários no MVP!**

### **💰 Planos Pagos:**
- **Plus ($89/mês)**: 100k transformações, 100GB
- **Advanced ($249/mês)**: 500k transformações, 500GB
- **Custom**: Negociável para volumes altos

---

## 🛠️ **CONFIGURAÇÕES AVANÇADAS**

### **Estrutura de Pastas no Cloudinary:**
```
petfinder/
├── pets/           # Fotos de pets perdidos/encontrados
├── avatars/        # Fotos de perfil dos usuários  
├── eventos/        # Fotos de eventos
└── misc/           # Outras imagens
```

### **Transformações Automáticas:**
```typescript
// Foto de pet - otimizada para web
{
  width: 1200,
  height: 1200, 
  crop: "limit",
  quality: "auto:good",
  format: "auto"
}

// Avatar - circular e pequeno
{
  width: 400,
  height: 400,
  crop: "fill", 
  gravity: "face",
  quality: "auto:good"
}
```

### **URLs Geradas:**
- **Original**: `https://res.cloudinary.com/seu_cloud/image/upload/v1/pets/abc123.jpg`
- **Thumbnail**: `https://res.cloudinary.com/seu_cloud/image/upload/c_fill,h_300,w_300/pets/abc123.jpg`

---

## 🔒 **SEGURANÇA**

### **Configurações Recomendadas:**

1. **Allowed Formats**: JPG, PNG, WebP, GIF
2. **Max File Size**: 10MB
3. **Auto-moderation**: Ativo (para conteúdo impróprio)
4. **Signed URLs**: Para uploads sensíveis

### **Variáveis de Ambiente Seguras:**
```bash
# ❌ NUNCA commitar no Git
CLOUDINARY_API_SECRET="sua_chave_secreta"

# ✅ Pode ser público
CLOUDINARY_CLOUD_NAME="seu_cloud_name"  
CLOUDINARY_API_KEY="123456789012345"
```

---

## 🧪 **TESTANDO O SISTEMA**

### **1. Via Swagger (Recomendado)**
1. Acesse: http://localhost:3001/docs
2. Vá na seção "Upload"
3. Teste endpoint `/api/upload/pets`
4. Envie algumas fotos

### **2. Via Postman/Thunder Client**
```http
POST http://localhost:3001/api/upload/pets
Authorization: Bearer seu_jwt_token
Content-Type: multipart/form-data

fotos: [arquivo1.jpg, arquivo2.png]
```

### **3. Via cURL**
```bash
curl -X POST \
  http://localhost:3001/api/upload/pets \
  -H "Authorization: Bearer seu_token" \
  -F "fotos=@foto1.jpg" \
  -F "fotos=@foto2.jpg"
```

---

## 🔍 **TROUBLESHOOTING**

### **❌ "Cloudinary não configurado"**
**Solução:** Verificar se as 3 variáveis estão no `.env`

### **❌ "Unauthorized"**
**Solução:** API Key ou Secret incorretos - copiar novamente do dashboard

### **❌ "Upload failed"**
**Possíveis causas:**
- Arquivo muito grande (max 10MB)
- Formato não suportado
- Cota do plano gratuito esgotada

### **❌ "Network error"**
**Solução:** Verificar conexão com internet

---

## 📈 **MONITORAMENTO**

### **Dashboard Cloudinary:**
1. **Usage**: Ver quantas transformações usou
2. **Media Library**: Ver todas as imagens
3. **Analytics**: Estatísticas detalhadas

### **Logs da API:**
```bash
# Ver logs de upload
tail -f logs/combined.log | grep "Upload"

# Ver status Cloudinary  
curl http://localhost:3001/api/upload/health
```

---

## 🌟 **OTIMIZAÇÕES**

### **Performance:**
- ✅ **Auto-format**: WebP para navegadores compatíveis
- ✅ **Auto-quality**: Ajuste automático da qualidade
- ✅ **CDN global**: Carregamento rápido mundial

### **Economia:**
- ✅ **Lazy loading** no frontend (carrega só quando visível)
- ✅ **Thumbnails** para listas (menor que foto completa)
- ✅ **Cache headers** para evitar downloads repetidos

---

## 🎯 **MIGRATION STRATEGY**

### **Se já tem imagens em outro lugar:**

```typescript
// Script para migrar URLs antigas para Cloudinary
const migrarImagens = async () => {
  const publicacoes = await prisma.publicacao.findMany()
  
  for (const pub of publicacoes) {
    const novasUrls = []
    
    for (const urlAntiga of pub.fotos_urls) {
      if (!urlAntiga.includes('cloudinary.com')) {
        // Upload para Cloudinary
        const resultado = await cloudinary.uploader.upload(urlAntiga)
        novasUrls.push(resultado.secure_url)
      } else {
        novasUrls.push(urlAntiga)
      }
    }
    
    await prisma.publicacao.update({
      where: { id: pub.id },
      data: { fotos_urls: novasUrls }
    })
  }
}
```

---

## ✅ **CHECKLIST FINAL**

- [ ] Conta Cloudinary criada
- [ ] Credenciais copiadas para `.env`
- [ ] Servidor reiniciado  
- [ ] `/api/upload/health` retorna "OK"
- [ ] Upload teste funcionando
- [ ] Swagger documentação funcionando
- [ ] Imagens aparecendo no dashboard Cloudinary

---

## 🆘 **SUPORTE**

### **Documentação Oficial:**
- https://cloudinary.com/documentation
- https://cloudinary.com/documentation/upload_images

### **Comunidade:**
- Stack Overflow: tag `cloudinary`
- Discord oficial do Cloudinary

### **Suporte Premium:**
- Email: support@cloudinary.com (planos pagos)

---

**🎉 Pronto! Seu sistema PetFinder agora tem upload profissional de imagens!**

**Benefícios imediatos:**
- 📱 **Upload direto** do smartphone
- ⚡ **Carregamento rápido** via CDN
- 🔄 **Otimização automática** de imagens
- 💾 **Backup seguro** na nuvem
- 📊 **Analytics** de uso

**Seu MVP agora tem upload de nível enterprise! 🚀**