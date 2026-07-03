-- Adiciona campos para controle de horários bloqueados, capacidade simultânea e vagas (hotel/creche)
ALTER TABLE "servicos" ADD COLUMN "horarios_bloqueados" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "servicos" ADD COLUMN "capacidade_por_slot" INTEGER;
ALTER TABLE "servicos" ADD COLUMN "vagas_disponiveis" INTEGER;
