import { TiposPet, StatusPet, Especies, UnidadeTempo, Portes, Sexos, StatusEvento, TipoServico, StatusAgendamento, FormaPagamento } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../config/prisma';

async function main() {
  console.log('Iniciando o seending...');

  // Criar Usuários
  const senhaHash = await bcrypt.hash('123456', 10);
  
  const usuario1 = await prisma.usuario.create({
    data: {
      nome: 'João Silva',
      email: 'joao.silva@example.com',
      senha: senhaHash,
      telefone: '11999999999',
      latitude: -23.5505,
      longitude: -46.6333,
    },
  });

  const usuario2 = await prisma.usuario.create({
    data: {
      nome: 'Maria Souza',
      email: 'maria.souza@example.com',
      senha: senhaHash,
      telefone: '11888888888',
      latitude: -23.5605,
      longitude: -46.6433,
    },
  });

  console.log('Usuários criados', usuario1.id, usuario2.id);

  // Criar Publicações
  await prisma.publicacao.create({
    data: {
      tipo: TiposPet.PERDIDO,
      status: StatusPet.ATIVO,
      titulo: 'Cachorro Poodle Perdido',
      descricao: 'Meu Poodle sumiu na região central, atende por Rex.',
      fotos_urls: ['https://images.dog.ceo/breeds/poodle-standard/n02113799_2280.jpg'],
      latitude: -23.5515,
      longitude: -46.6343,
      endereco_texto: 'Rua Direita, Centro, SP',
      especie: Especies.CACHORRO,
      raca: 'Poodle',
      nome_pet: 'Rex',
      porte: Portes.PEQUENO,
      cor: 'Branco',
      sexo: Sexos.MACHO,
      idade: 3,
      unidadeIdade: UnidadeTempo.ANOS,
      usuarioId: usuario1.id,
    }
  });

  await prisma.publicacao.create({
    data: {
      tipo: TiposPet.ADOCAO,
      status: StatusPet.ATIVO,
      titulo: 'Gatinhos para adoção',
      descricao: 'Gatinhos resgatados e procurando um novo lar! Dois machos e uma fêmea.',
      fotos_urls: ['https://cdn2.thecatapi.com/images/3m5.jpg'],
      latitude: -23.5615,
      longitude: -46.6443,
      endereco_texto: 'Av. Paulista, Bela Vista, SP',
      especie: Especies.GATO,
      raca: 'Vira-lata (SRD)',
      porte: Portes.PEQUENO,
      sexo: Sexos.INDEFINIDO,
      idade: 2,
      unidadeIdade: UnidadeTempo.MESES,
      usuarioId: usuario2.id,
    }
  });

  console.log('Publicações criadas');

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  
  const naProximaSemana = new Date();
  naProximaSemana.setDate(naProximaSemana.getDate() + 7);

  // Criar Eventos
  await prisma.evento.create({
    data: {
      titulo: 'Feira de Adoção PetFinder',
      descricao: 'Venha adotar seu novo melhor amigo! Teremos vários pets resgatados prontos para ganhar um lar cheio de amor.',
      fotos_urls: ['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=600&auto=format&fit=crop'],
      latitude: -23.5895,
      longitude: -46.6573,
      endereco_texto: 'Parque Ibirapuera, SP',
      data_hora_inicio: amanha,
      status: StatusEvento.AGENDADO,
      capacidade_max: 100,
      vagas_ocupadas: 15,
      usuarioId: usuario1.id,
    }
  });

  await prisma.evento.create({
    data: {
      titulo: 'Mutirão de Vacinação',
      descricao: 'Vacinação contra raiva e V10 a preços populares.',
      fotos_urls: ['https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=600&auto=format&fit=crop'],
      latitude: -23.5595,
      longitude: -46.6373,
      endereco_texto: 'Praça da Sé, SP',
      data_hora_inicio: naProximaSemana,
      status: StatusEvento.AGENDADO,
      capacidade_max: 200,
      vagas_ocupadas: 80,
      usuarioId: usuario2.id,
    }
  });

  console.log('Eventos criados');

  // Criar Serviços
  const servicoTosa = await prisma.servico.create({
    data: {
      nome: 'PetShop Cão Feliz - Banho e Tosa',
      tipo: TipoServico.BANHO_TOSA,
      descricao: 'O melhor banho e tosa da região. Usamos apenas produtos premium.',
      fotos_urls: ['https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=600&auto=format&fit=crop'],
      telefone: '11977777777',
      endereco_texto: 'Rua Augusta, 1000 - Consolação, SP',
      latitude: -23.5555,
      longitude: -46.6555,
      avaliacoes: 4.8,
      total_avaliacoes: 15,
      usuarioId: usuario1.id,
    }
  });

  console.log('Serviços criados');

  // Criar Agendamentos
  await prisma.agendamento.create({
    data: {
      servicoId: servicoTosa.id,
      usuarioId: usuario2.id,
      data_hora: amanha,
      status: StatusAgendamento.CONFIRMADO,
      forma_pagamento: FormaPagamento.PIX,
      valor_simulado: 85.50,
    }
  });

  console.log('Agendamentos criados');

  console.log('Seed realizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });