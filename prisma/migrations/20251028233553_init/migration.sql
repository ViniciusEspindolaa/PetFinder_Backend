/*
  Warnings:

  - You are about to drop the `admins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `carros` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clientes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fotos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `marcas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `propostas` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TiposPet" AS ENUM ('PERDIDO', 'ENCONTRADO', 'ADOCAO', 'RESGATE');

-- CreateEnum
CREATE TYPE "StatusPet" AS ENUM ('ATIVO', 'RESOLVIDO', 'PENDENTE', 'EM_ANDAMENTO', 'EM_ANALISE', 'RESGATADO');

-- CreateEnum
CREATE TYPE "StatusEvento" AS ENUM ('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Especies" AS ENUM ('CACHORRO', 'GATO', 'OUTRO');

-- CreateEnum
CREATE TYPE "Sexos" AS ENUM ('MACHO', 'FEMEA', 'INDEFINIDO');

-- CreateEnum
CREATE TYPE "Portes" AS ENUM ('PEQUENO', 'MEDIO', 'GRANDE');

-- DropForeignKey
ALTER TABLE "carros" DROP CONSTRAINT "carros_adminId_fkey";

-- DropForeignKey
ALTER TABLE "carros" DROP CONSTRAINT "carros_marcaId_fkey";

-- DropForeignKey
ALTER TABLE "fotos" DROP CONSTRAINT "fotos_carroId_fkey";

-- DropForeignKey
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_adminId_fkey";

-- DropForeignKey
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_carroId_fkey";

-- DropForeignKey
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_clienteId_fkey";

-- DropTable
DROP TABLE "admins";

-- DropTable
DROP TABLE "carros";

-- DropTable
DROP TABLE "clientes";

-- DropTable
DROP TABLE "fotos";

-- DropTable
DROP TABLE "marcas";

-- DropTable
DROP TABLE "propostas";

-- DropEnum
DROP TYPE "Combustiveis";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "telefone" VARCHAR(15) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacoes" (
    "id" SERIAL NOT NULL,
    "tipo" "TiposPet" NOT NULL DEFAULT 'PERDIDO',
    "status" "StatusPet" NOT NULL DEFAULT 'ATIVO',
    "titulo" VARCHAR(100) NOT NULL,
    "descricao" TEXT NOT NULL,
    "fotos_urls" TEXT[],
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "endereco_texto" VARCHAR(100) NOT NULL,
    "especie" "Especies" NOT NULL,
    "raca" VARCHAR(40),
    "porte" "Portes",
    "cor" VARCHAR(20),
    "sexo" "Sexos",
    "idade" SMALLINT,
    "nome_pet" VARCHAR(40),
    "data_evento" TIMESTAMP(3),
    "data_publicacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" VARCHAR(36) NOT NULL,

    CONSTRAINT "publicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "descricao" TEXT NOT NULL,
    "fotos_urls" TEXT[],
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "endereco_texto" VARCHAR(100) NOT NULL,
    "data_hora_inicio" TIMESTAMP(3) NOT NULL,
    "data_hora_fim" TIMESTAMP(3),
    "status" "StatusEvento" NOT NULL DEFAULT 'AGENDADO',
    "capacidade_max" SMALLINT,
    "vagas_ocupadas" SMALLINT NOT NULL DEFAULT 0,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" VARCHAR(36) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avistamentos" (
    "id" SERIAL NOT NULL,
    "observacoes" TEXT,
    "fotos_urls" TEXT[],
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "endereco_texto" VARCHAR(100) NOT NULL,
    "data_avistamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicacaoId" INTEGER NOT NULL,
    "usuarioId" VARCHAR(36) NOT NULL,

    CONSTRAINT "avistamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avistamentos" ADD CONSTRAINT "avistamentos_publicacaoId_fkey" FOREIGN KEY ("publicacaoId") REFERENCES "publicacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avistamentos" ADD CONSTRAINT "avistamentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
