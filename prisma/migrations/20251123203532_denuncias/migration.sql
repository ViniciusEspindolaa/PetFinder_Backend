-- CreateEnum
CREATE TYPE "StatusDenuncia" AS ENUM ('PENDENTE', 'EM_ANALISE', 'ACEITA', 'REJEITADA');

-- CreateTable
CREATE TABLE "denuncias" (
    "id" SERIAL NOT NULL,
    "publicacaoId" INTEGER NOT NULL,
    "usuarioId" VARCHAR(36),
    "motivo" VARCHAR(50) NOT NULL,
    "descricao" TEXT,
    "status" "StatusDenuncia" NOT NULL DEFAULT 'PENDENTE',
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "denuncias_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_publicacaoId_fkey" FOREIGN KEY ("publicacaoId") REFERENCES "publicacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
