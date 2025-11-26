-- Migration: add latitude and longitude to usuarios
ALTER TABLE "usuarios"
ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);
