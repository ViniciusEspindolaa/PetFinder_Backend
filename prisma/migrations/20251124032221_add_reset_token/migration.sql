-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "resetToken" VARCHAR(100),
ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);
