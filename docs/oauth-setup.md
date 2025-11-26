# Guia rápido: instalar dependências e testar OAuth (Google) — PetFinder

Use este guia quando estiver em uma rede sem restrições (internet aberta). Executar os passos abaixo prepara o backend e testa o endpoint `/api/auth/google/token`.

Pré-requisitos
- Node.js (>=16) e npm
- Acesso ao registry npm (internet) e ao banco definido em `DATABASE_URL` (.env)
- Variáveis de ambiente configuradas em `.env`:
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET (opcional, para fluxo server-side)
  - APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (se for usar Apple)
  - JWT_SECRET

Passos (PowerShell)

1) Instalar dependências (inclui `google-auth-library`):

```powershell
cd C:\Users\vinic.VINICIUS\Documents\PetFinder\back
npm install
```

Se quiser instalar apenas a lib do Google (mais rápido) rode:

```powershell
npm install google-auth-library
```

2) Gerar Prisma Client

```powershell
npx prisma generate
```

3) Aplicar migrations (ambiente dev)

```powershell
npx prisma migrate dev --name add_social_account
# ou em produção (aplica migrations já geradas):
# npx prisma migrate deploy
```

4) Iniciar servidor (desenvolvimento)

```powershell
npm run dev
```

Testando o endpoint `/api/auth/google/token` (exemplo com id_token obtido via Google Identity Services)

- Obtenha um `id_token` real (use Google Identity Services no cliente ou o OAuth2 Playground para gerar um `id_token`).
- Faça POST para o backend:

```powershell
$body = @{ id_token = "SEU_ID_TOKEN_AQUI" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/auth/google/token -Body $body -ContentType 'application/json'
```

Resposta esperada (JSON):
- `{ token, user }` — `token` é o JWT do PetFinder que você pode usar nos endpoints autenticados.

Notas de debug
- Se `npm install` falhar com "No matching version found for jose@..." ou erros de registry:
  - Verifique se a rede permite acesso ao `registry.npmjs.org`.
  - Se você usa um registry privado/proxy, rode `npm view google-auth-library versions --json` para verificar versões disponíveis.
  - Como alternativa temporária, instale apenas `google-auth-library` e deixe `jose` para quando estiver em rede aberta (o `jose` é usado para Apple server-side JWT). Para instalar só o Google:
    ```powershell
    npm install google-auth-library
    ```

- Se `npx prisma migrate dev` falhar com `P1001` (can't reach the database): verifique conexão com o banco, firewall, allow-list do Neon ou execute as migrations em uma máquina que tenha acesso à DB.

Teste offline alternativo (sem id_token real)
- Você pode testar rota `/api/auth/google/token` sem verificar o id_token modificando temporariamente `services/oauth.ts` para retornar um payload fake; porém NÃO faça isso em produção.

Próximos passos que posso executar por você
- Assim que disser "vai", eu tento rodar `npm install` e aplicar migrations neste ambiente (se a rede permitir). Se preferir, posso apenas aplicar as alterações no `package.json` para contornar versões incompatíveis e re-tentar.

Se quiser que eu rode os comandos agora (tentar `npm install` novamente), diga "execute agora" — lembra que, nesta rede restrita, pode falhar; eu reportarei o resultado e ajudo a corrigir.
