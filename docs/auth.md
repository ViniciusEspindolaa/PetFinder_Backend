# Autenticação Social (Google & Apple)

Este documento explica como usar os endpoints backend para autenticação via Google e Apple (login/cadastro) e também contém exemplos de frontend (web SPA) e mobile (PKCE).

## Variáveis de ambiente necessárias

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET (apenas para fluxo server-side se usar code exchange)
- APPLE_CLIENT_ID (ex: com.bundle.id ou service id)
- APPLE_TEAM_ID
- APPLE_KEY_ID
- APPLE_PRIVATE_KEY (conteúdo PEM, com quebras de linha como `\\n` se necessário)
- JWT_SECRET (já existente)

> Não versionar essas variáveis. Mantenha-as no `.env` seguro.

## Endpoints implementados

- POST /api/auth/google/token
  - Body: { id_token }
  - Uso: ideal para SPAs / mobile que obtêm `id_token` do Google client e enviam ao backend.
  - Retorno: { token, user }

- POST /api/auth/apple/token
  - Body: { code }
  - Uso: exchange server-side do `authorization code` do Apple Sign In. O backend gera `client_secret` e troca o code por tokens.
  - Retorno: { token, user }

> Nota: Implementação atual faz verificação de id_token do Google com a biblioteca oficial. Para Apple o id_token é decodificado; recomenda-se validar o id_token usando o JWKS do Apple para produção.

## Fluxos recomendados

- Web (redirect): o frontend obtém um `code` (Google ou Apple) e envia para o backend, que troca por tokens e cria/associa o usuário.
- SPA/mobile (Google): usar Google Sign-In para obter um `id_token` no cliente e enviar para `/api/auth/google/token`.
- Mobile (Apple): usar Sign in with Apple para obter `code` e enviar para `/api/auth/apple/token`.

## Exemplo: frontend (Google, SPA)

1. No cliente, use Google Identity Services para obter `id_token`.
2. POST `/api/auth/google/token` com body JSON { id_token }.
3. Receba `{ token }` (JWT do PetFinder) e armazene em secure storage.

## Exemplo: web/mobile (Apple) - Authorization Code

1. Redirecione o usuário para a URL de autorização da Apple (com seu `client_id` e `redirect_uri`).
2. Após consentimento, receba `code` no `redirect_uri` do frontend.
3. Envie `code` ao backend POST `/api/auth/apple/token`.
4. Backend troca `code` por `id_token`, cria usuário e retorna seu JWT.

## Mobile: PKCE (recomendações)

- Use PKCE para aplicativos públicos (mobile). Fluxo:
  1. Gerar `code_verifier` e `code_challenge` no cliente.
  2. Redirecionar para provedor (Google/Apple) com `code_challenge`/`code_challenge_method=S256`.
  3. Receber `code` no cliente e enviar para backend (ou trocar server-side se preferir server-side client secret).

## Segurança e produção

- Valide id_token contra o `aud` (client_id) e `iss` (issuer).
- Para Apple, valide a assinatura do id_token usando a JWKS em https://appleid.apple.com/auth/keys.
- Implemente deduplicação/checagens: se email já existir, associe contas em vez de criar duplicados.
- Considere criar um modelo `SocialAccount` (já criado) para reunir provedores por usuário.
- Proteja endpoints com rate-limiting e CAPTCHA se necessário.

## Pontos futuros

- Implementar verificação completa do id_token do Apple via JWKS.
- Implementar endpoints para desconectar/associar contas sociais.
- Frontend: mostrar opção de linkar conta social ao perfil e fluxo de desfazer.

