ALTER TABLE "usuarios" ADD COLUMN "nivel_verificacao" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "usuarios" ADD COLUMN "selfie_url" VARCHAR(500);
ALTER TABLE "usuarios" ADD COLUMN "doc_url" VARCHAR(500);
ALTER TABLE "usuarios" ADD COLUMN "verificacao_status" VARCHAR(30) NOT NULL DEFAULT 'nao_iniciado';
