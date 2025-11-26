# Documentação da API Google Maps - PetFinder

## Visão Geral

A integração com Google Maps fornece funcionalidades de geocodificação, busca por proximidade e geração de mapas estáticos para ajudar na localização de pets perdidos e encontrados.

## Endpoints Disponíveis

### 1. Geocodificação de Endereço
**POST** `/api/maps/geocode`

Converte um endereço em coordenadas geográficas.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "endereco": "Av. Paulista, 1000, São Paulo, SP"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "endereco": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100, Brasil",
    "coordenadas": {
      "lat": -23.5631954,
      "lng": -46.6558819
    },
    "tipos": ["street_address"],
    "detalhes": {
      "numero": "1000",
      "rua": "Avenida Paulista",
      "bairro": "Bela Vista",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01310-100",
      "pais": "Brasil"
    }
  }
}
```

### 2. Geocodificação Reversa
**POST** `/api/maps/reverse-geocode`

Converte coordenadas em endereço.

**Body:**
```json
{
  "lat": -23.5631954,
  "lng": -46.6558819
}
```

**Resposta:** Mesmo formato da geocodificação normal.

### 3. Busca por Proximidade
**GET** `/api/maps/nearby`

Busca serviços próximos (veterinários, pet shops).

**Query Parameters:**
- `lat` (obrigatório): Latitude
- `lng` (obrigatório): Longitude
- `tipo` (opcional): Tipo do serviço
  - `veterinario` (padrão)
  - `petshop`
  - `hospital_veterinario`
  - `clinica_veterinaria`
  - `pet_shop`
  - `loja_animais`
- `raio` (opcional): Raio em metros (padrão: 5000, máx: 50000)

**Exemplo:**
```
GET /api/maps/nearby?lat=-23.5631954&lng=-46.6558819&tipo=veterinario&raio=3000
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "resultados": [
      {
        "nome": "Clínica Veterinária Pet Care",
        "endereco": "Rua Augusta, 1234",
        "coordenadas": {
          "lat": -23.5641954,
          "lng": -46.6568819
        },
        "tipo": "veterinary_care",
        "distancia": 0.15,
        "rating": 4.5,
        "status": "OPERATIONAL"
      }
    ]
  }
}
```

### 4. Mapa Estático
**GET** `/api/maps/static-map`

Gera URL para mapa estático.

**Query Parameters:**
- `lat` (obrigatório): Latitude
- `lng` (obrigatório): Longitude
- `zoom` (opcional): Nível de zoom (1-20, padrão: 15)
- `tamanho` (opcional): Tamanho da imagem (padrão: "600x400")
- `marcadores` (opcional): JSON com array de marcadores

**Exemplo:**
```
GET /api/maps/static-map?lat=-23.5631954&lng=-46.6558819&zoom=16&tamanho=800x600
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "url": "https://maps.googleapis.com/maps/api/staticmap?center=-23.5631954,-46.6558819&zoom=16&size=800x600&key=API_KEY&markers=color:red|-23.5631954,-46.6558819"
  }
}
```

### 5. Autocompletar Endereços
**GET** `/api/maps/autocomplete`

Fornece sugestões de endereços conforme o usuário digita.

**Query Parameters:**
- `input` (obrigatório): Texto digitado pelo usuário (mín. 2 caracteres)

**Exemplo:**
```
GET /api/maps/autocomplete?input=Av Paul
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "sugestoes": [
      "Avenida Paulista, São Paulo - SP, Brasil",
      "Avenida Paulo Faccini, Guarulhos - SP, Brasil",
      "Rua Paulo Setúbal, São Paulo - SP, Brasil"
    ]
  }
}
```

### 6. Calcular Distância
**POST** `/api/maps/distance`

Calcula a distância entre dois pontos.

**Body:**
```json
{
  "origem": {
    "lat": -23.5631954,
    "lng": -46.6558819
  },
  "destino": {
    "lat": -23.5501954,
    "lng": -46.6338819
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "distancia": 2.85,
    "unidade": "km"
  }
}
```

### 7. Health Check
**GET** `/api/maps/health`

Verifica se a API do Google Maps está funcionando.

**Resposta:**
```json
{
  "success": true,
  "message": "API do Google Maps funcionando normalmente",
  "data": {
    "testResult": "OK",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Configuração

### 1. Obter Chave da API Google Maps

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Ative as seguintes APIs:
   - **Geocoding API**
   - **Places API**
   - **Maps Static API**
   - **Places API (New)**

4. Crie uma chave de API:
   - Vá em "Credenciais" > "Criar credenciais" > "Chave de API"
   - Configure restrições de IP/domínio para segurança
   - Adicione a chave ao arquivo `.env`:

```bash
GOOGLE_MAPS_API_KEY="sua_chave_api_aqui"
```

### 2. Configuração de Segurança

**Importante:** Configure restrições adequadas na sua chave de API:

- **Restrições de aplicativo:** Apenas IPs/domínios específicos
- **Restrições de API:** Apenas as APIs necessárias
- **Cotas:** Configure limites de uso diário

### 3. Custos

- **Geocoding API:** $5.00 por 1.000 solicitações
- **Places API:** Varia conforme o tipo de busca
- **Maps Static API:** $2.00 por 1.000 solicitações

**Cota gratuita:** $200/mês (aproximadamente 40.000 geocodificações)

## Exemplos de Uso no Frontend

### JavaScript/TypeScript

```typescript
// Geocodificar endereço
const geocodificarEndereco = async (endereco: string) => {
  const response = await fetch('/api/maps/geocode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ endereco })
  });
  
  return await response.json();
};

// Buscar veterinários próximos
const buscarVeterinarios = async (lat: number, lng: number) => {
  const response = await fetch(
    `/api/maps/nearby?lat=${lat}&lng=${lng}&tipo=veterinario&raio=5000`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};

// Gerar mapa estático
const gerarMapa = async (lat: number, lng: number, marcadores: any[]) => {
  const response = await fetch(
    `/api/maps/static-map?lat=${lat}&lng=${lng}&zoom=15&marcadores=${JSON.stringify(marcadores)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data.data.url; // URL da imagem do mapa
};
```

### React Hook Personalizado

```typescript
import { useState, useEffect } from 'react';

export const useGeolocalizacao = () => {
  const [posicao, setPosicao] = useState<{lat: number, lng: number} | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const obterPosicaoAtual = () => {
    setCarregando(true);
    
    if (!navigator.geolocation) {
      setErro('Geolocalização não suportada');
      setCarregando(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPosicao({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setCarregando(false);
      },
      (error) => {
        setErro('Erro ao obter localização');
        setCarregando(false);
      }
    );
  };

  return { posicao, erro, carregando, obterPosicaoAtual };
};
```

## Tratamento de Erros

A API retorna os seguintes códigos de status:

- **200:** Sucesso
- **400:** Dados inválidos
- **401:** Token não autorizado
- **404:** Endereço/coordenadas não encontradas
- **429:** Limite de rate exceeded
- **500:** Erro interno do servidor
- **503:** API do Google Maps indisponível

## Limitações

1. **Rate Limiting:** 100 requests por 15 minutos por IP
2. **Autenticação:** Todas as rotas requerem token JWT válido
3. **Região:** Otimizado para endereços brasileiros
4. **Idioma:** Respostas em português brasileiro

## Suporte

Para dúvidas ou problemas:
1. Verifique a configuração da chave API
2. Consulte os logs do servidor
3. Use o endpoint `/api/maps/health` para diagnóstico