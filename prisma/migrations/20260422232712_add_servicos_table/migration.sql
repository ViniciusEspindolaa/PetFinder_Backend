-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "NivelUrgencia" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "TipoServico" AS ENUM ('VETERINARIO', 'PET_SHOP', 'BANHO_TOSA', 'TREINADOR', 'PASSEADOR', 'HOSPEDAGEM', 'GROOMING', 'OUTROS');

-- AlterTable
ALTER TABLE "publicacoes" ADD COLUMN     "condicao_medica" VARCHAR(255),
ADD COLUMN     "urgencia" "NivelUrgencia",
ADD COLUMN     "vetor_busca" vector(3072);

-- CreateTable
CREATE TABLE "servicos" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "tipo" "TipoServico" NOT NULL,
    "descricao" TEXT NOT NULL,
    "fotos_urls" TEXT[],
    "telefone" VARCHAR(15),
    "email" VARCHAR(100),
    "endereco_texto" VARCHAR(255) NOT NULL,
    "bairro" VARCHAR(60),
    "cidade" VARCHAR(60),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "horario" VARCHAR(100),
    "avaliacoes" DECIMAL(2,1),
    "total_avaliacoes" INTEGER NOT NULL DEFAULT 0,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" VARCHAR(36) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
