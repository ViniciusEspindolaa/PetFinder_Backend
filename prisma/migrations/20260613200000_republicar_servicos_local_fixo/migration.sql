-- Republicar serviços em local fixo que ficaram ocultos após verificação de prestador
UPDATE "servicos" SET "publicado" = true WHERE "atende_domicilio" = false AND "publicado" = false;
