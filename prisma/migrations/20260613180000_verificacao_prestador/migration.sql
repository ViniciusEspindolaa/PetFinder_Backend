-- Verificação de prestadores (Fase 1 e 2)

CREATE TYPE "StatusVerificacaoPrestador" AS ENUM ('NAO_SOLICITADO', 'PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO');

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "foto_perfil" VARCHAR(500);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefone_verificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "email_verificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefone_codigo_hash" VARCHAR(128);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefone_codigo_expira" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "email_codigo_hash" VARCHAR(128);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "email_codigo_expira" TIMESTAMP(3);

ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "publicado" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "agendamentos" ADD COLUMN IF NOT EXISTS "atendimento_domicilio" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "verificacoes_prestador" (
    "id" VARCHAR(36) NOT NULL,
    "usuarioId" VARCHAR(36) NOT NULL,
    "cpf_hash" VARCHAR(128) NOT NULL,
    "cpf_ultimos4" VARCHAR(4) NOT NULL,
    "doc_frente_url" VARCHAR(500),
    "doc_verso_url" VARCHAR(500),
    "selfie_url" VARCHAR(500),
    "status" "StatusVerificacaoPrestador" NOT NULL DEFAULT 'PENDENTE',
    "motivo_rejeicao" VARCHAR(500),
    "verificado_em" TIMESTAMP(3),
    "verificado_por" VARCHAR(36),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verificacoes_prestador_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "verificacoes_prestador_usuarioId_key" ON "verificacoes_prestador"("usuarioId");

ALTER TABLE "verificacoes_prestador" ADD CONSTRAINT "verificacoes_prestador_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "servicos" SET "publicado" = true WHERE "atende_domicilio" = false;
