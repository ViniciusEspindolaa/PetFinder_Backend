-- Migration: add social_accounts table and link to usuarios

CREATE TABLE IF NOT EXISTS "social_accounts" (
  "id" varchar(36) PRIMARY KEY,
  "provider" varchar(20) NOT NULL,
  "providerId" varchar(128) NOT NULL,
  "email" varchar(100),
  "accessToken" text,
  "refreshToken" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "userId" varchar(36) NOT NULL
);

-- unique constraint provider + providerId
CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_provider_providerId_key" ON "social_accounts" ("provider", "providerId");

-- FK to usuarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'social_accounts_userId_fkey'
      AND t.relname = 'social_accounts'
  ) THEN
    ALTER TABLE "social_accounts" ADD CONSTRAINT social_accounts_userId_fkey FOREIGN KEY ("userId") REFERENCES "usuarios" ("id") ON DELETE CASCADE;
  END IF;
END$$;
