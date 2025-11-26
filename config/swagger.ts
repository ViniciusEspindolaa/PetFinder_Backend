import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './environment';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PetFinder API',
      version: '1.0.0',
      description: `
        ## 🐕 API para Sistema de Localização de Pets
        
        API completa para ajudar na localização de pets perdidos, encontrados e adoção.
        
        ### Funcionalidades principais:
        - 👤 **Gestão de usuários** com autenticação JWT
        - 🐕 **Publicações** de pets perdidos, encontrados e para adoção
        - 👁️ **Avistamentos** para reportar pets vistos
        - 🎉 **Eventos** relacionados a pets
        - 🗺️ **Integração Google Maps** para geolocalização
        - 📊 **Dashboard** com estatísticas
        - 📧 **Notificações** por email
        - 🖼️ **Upload** de fotos via Cloudinary
        
        ### Autenticação:
        A maioria dos endpoints requer autenticação JWT. Use o endpoint \`/api/login\` para obter o token.
        
        ### Códigos de Status:
        - **200**: Sucesso
        - **201**: Criado com sucesso
        - **400**: Dados inválidos
        - **401**: Não autorizado
        - **403**: Proibido
        - **404**: Não encontrado
        - **429**: Muitas requisições
        - **500**: Erro interno do servidor
      `,
      contact: {
        name: 'PetFinder Support',
        email: 'support@petfinder.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://api.petfinder.com',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do endpoint /api/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Mensagem de erro'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operação realizada com sucesso'
            },
            data: {
              type: 'object',
              description: 'Dados retornados pela operação'
            }
          }
        },
        Usuario: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            nome: {
              type: 'string',
              example: 'João Silva'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'joao@email.com'
            },
            telefone: {
              type: 'string',
              example: '(11) 99999-9999'
            },
            endereco: {
              type: 'string',
              example: 'Rua das Flores, 123'
            },
            dataCriacao: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        Publicacao: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            titulo: {
              type: 'string',
              example: 'Cachorro perdido no Parque Ibirapuera'
            },
            descricao: {
              type: 'string',
              example: 'Golden Retriever, macho, 3 anos, muito dócil'
            },
            status: {
              type: 'string',
              enum: ['perdido', 'encontrado', 'adocao'],
              example: 'perdido'
            },
            animal: {
              type: 'string',
              enum: ['cachorro', 'gato', 'outros'],
              example: 'cachorro'
            },
            raca: {
              type: 'string',
              example: 'Golden Retriever'
            },
            cor: {
              type: 'string',
              example: 'Dourado'
            },
            idade: {
              type: 'string',
              example: '3 anos'
            },
            genero: {
              type: 'string',
              enum: ['macho', 'femea'],
              example: 'macho'
            },
            localizacao: {
              type: 'string',
              example: 'Parque Ibirapuera, São Paulo'
            },
            latitude: {
              type: 'number',
              format: 'float',
              example: -23.5875
            },
            longitude: {
              type: 'number',
              format: 'float',
              example: -46.6574
            },
            fotos: {
              type: 'array',
              items: {
                type: 'string',
                format: 'url'
              },
              example: ['https://res.cloudinary.com/petfinder/image/upload/v1/pets/abc123.jpg']
            },
            dataCriacao: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            usuario: {
              $ref: '#/components/schemas/Usuario'
            }
          }
        },
        Avistamento: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            descricao: {
              type: 'string',
              example: 'Vi o cachorro próximo à padaria da esquina'
            },
            localizacao: {
              type: 'string',
              example: 'Rua Augusta, 1000'
            },
            latitude: {
              type: 'number',
              format: 'float',
              example: -23.5631
            },
            longitude: {
              type: 'number',
              format: 'float',
              example: -46.6559
            },
            foto: {
              type: 'string',
              format: 'url',
              example: 'https://res.cloudinary.com/petfinder/image/upload/v1/sightings/def456.jpg'
            },
            dataAvistamento: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T14:30:00.000Z'
            },
            publicacaoId: {
              type: 'integer',
              example: 1
            },
            usuarioId: {
              type: 'integer',
              example: 2
            }
          }
        },
        Coordenadas: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              format: 'float',
              example: -23.5631
            },
            lng: {
              type: 'number',
              format: 'float',
              example: -46.6559
            }
          }
        },
        GeocodeResult: {
          type: 'object',
          properties: {
            endereco: {
              type: 'string',
              example: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, Brasil'
            },
            coordenadas: {
              $ref: '#/components/schemas/Coordenadas'
            },
            tipos: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['street_address']
            },
            detalhes: {
              type: 'object',
              properties: {
                numero: { type: 'string', example: '1000' },
                rua: { type: 'string', example: 'Avenida Paulista' },
                bairro: { type: 'string', example: 'Bela Vista' },
                cidade: { type: 'string', example: 'São Paulo' },
                estado: { type: 'string', example: 'SP' },
                cep: { type: 'string', example: '01310-100' },
                pais: { type: 'string', example: 'Brasil' }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.ts', './index.ts'] // Caminhos para os arquivos com documentação
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };