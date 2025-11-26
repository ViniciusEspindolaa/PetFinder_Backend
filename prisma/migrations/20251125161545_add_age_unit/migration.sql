-- CreateEnum
CREATE TYPE "UnidadeTempo" AS ENUM ('ANOS', 'MESES');

-- AlterTable
ALTER TABLE "publicacoes" ADD COLUMN     "unidadeIdade" "UnidadeTempo" DEFAULT 'ANOS';
