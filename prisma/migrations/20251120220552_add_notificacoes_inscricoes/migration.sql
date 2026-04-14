-- CreateTable
CREATE TABLE "notificacoes" (
    "id" VARCHAR(36) NOT NULL,
    "usuarioId" VARCHAR(36) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "corpo" TEXT,
    "dados" JSONB,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "canal" VARCHAR(20) NOT NULL,
    "prioridade" INTEGER DEFAULT 0,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaEm" TIMESTAMP(3),
    "entregue" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricoes_push" (
    "id" VARCHAR(36) NOT NULL,
    "usuarioId" VARCHAR(36),
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscricoes_push_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_push_endpoint_key" ON "inscricoes_push"("endpoint");

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes_push" ADD CONSTRAINT "inscricoes_push_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
