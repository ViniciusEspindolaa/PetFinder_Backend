-- AlterTable: tornar publicacaoId opcional e adicionar eventoId/servicoId
ALTER TABLE "denuncias" ALTER COLUMN "publicacaoId" DROP NOT NULL;

ALTER TABLE "denuncias" ADD COLUMN "eventoId" INTEGER;
ALTER TABLE "denuncias" ADD COLUMN "servicoId" INTEGER;

ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
