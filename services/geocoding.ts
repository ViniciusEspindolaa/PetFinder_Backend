import axios from 'axios';
import { config } from '../config/environment';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  endereco: string;
  coordenadas: Coordenadas;
  tipos: string[];
  detalhes?: {
    numero?: string;
    rua?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    pais?: string;
  };
}

export interface ProximitySearchResult {
  nome: string;
  endereco: string;
  coordenadas: Coordenadas;
  tipo: string;
  distancia?: number;
  rating?: number;
  status?: string;
}

export class GeocodingService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = config.GOOGLE_MAPS_API_KEY;
  }

  private verificarChaveAPI(): void {
    if (!this.apiKey) {
      throw new Error('Google Maps API key não configurada. Configure a variável GOOGLE_MAPS_API_KEY no arquivo .env');
    }
  }

  /**
   * Geocodifica um endereço para coordenadas
   */
  async geocodificarEndereco(endereco: string): Promise<GeocodeResult | null> {
    this.verificarChaveAPI();
    
    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address: endereco,
          key: this.apiKey,
          language: 'pt-BR',
          region: 'BR'
        }
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      // Extrair detalhes do endereço
      const detalhes: any = {};
      result.address_components?.forEach((component: any) => {
        const tipos = component.types;
        if (tipos.includes('street_number')) {
          detalhes.numero = component.long_name;
        } else if (tipos.includes('route')) {
          detalhes.rua = component.long_name;
        } else if (tipos.includes('sublocality') || tipos.includes('neighborhood')) {
          detalhes.bairro = component.long_name;
        } else if (tipos.includes('locality')) {
          detalhes.cidade = component.long_name;
        } else if (tipos.includes('administrative_area_level_1')) {
          detalhes.estado = component.short_name;
        } else if (tipos.includes('postal_code')) {
          detalhes.cep = component.long_name;
        } else if (tipos.includes('country')) {
          detalhes.pais = component.long_name;
        }
      });

      return {
        endereco: result.formatted_address,
        coordenadas: {
          lat: location.lat,
          lng: location.lng
        },
        tipos: result.types,
        detalhes
      };
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      throw new Error('Falha ao geocodificar endereço');
    }
  }

  /**
   * Geocodificação reversa - coordenadas para endereço
   */
  async geocodificacaoReversa(lat: number, lng: number): Promise<GeocodeResult | null> {
    this.verificarChaveAPI();
    
    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
          language: 'pt-BR',
          region: 'BR'
        }
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      // Extrair detalhes do endereço
      const detalhes: any = {};
      result.address_components?.forEach((component: any) => {
        const tipos = component.types;
        if (tipos.includes('street_number')) {
          detalhes.numero = component.long_name;
        } else if (tipos.includes('route')) {
          detalhes.rua = component.long_name;
        } else if (tipos.includes('sublocality') || tipos.includes('neighborhood')) {
          detalhes.bairro = component.long_name;
        } else if (tipos.includes('locality')) {
          detalhes.cidade = component.long_name;
        } else if (tipos.includes('administrative_area_level_1')) {
          detalhes.estado = component.short_name;
        } else if (tipos.includes('postal_code')) {
          detalhes.cep = component.long_name;
        } else if (tipos.includes('country')) {
          detalhes.pais = component.long_name;
        }
      });

      return {
        endereco: result.formatted_address,
        coordenadas: {
          lat: location.lat,
          lng: location.lng
        },
        tipos: result.types,
        detalhes
      };
    } catch (error) {
      console.error('Erro na geocodificação reversa:', error);
      throw new Error('Falha ao obter endereço das coordenadas');
    }
  }

  /**
   * Busca por proximidade (veterinários, pet shops, etc.)
   */
  async buscarProximidade(
    lat: number,
    lng: number,
    tipo: string,
    raio: number = 5000
  ): Promise<ProximitySearchResult[]> {
    this.verificarChaveAPI();
    
    try {
      // Mapear tipos para categorias do Google Places
      const tipoMapeado = this.mapearTipoServico(tipo);
      
      const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, {
        params: {
          location: `${lat},${lng}`,
          radius: raio,
          type: tipoMapeado,
          key: this.apiKey,
          language: 'pt-BR'
        }
      });

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.results.map((place: any) => ({
        nome: place.name,
        endereco: place.vicinity,
        coordenadas: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        tipo: place.types[0],
        rating: place.rating,
        status: place.business_status
      }));
    } catch (error) {
      console.error('Erro na busca por proximidade:', error);
      throw new Error('Falha ao buscar serviços próximos');
    }
  }

  /**
   * Calcula distância entre dois pontos usando a fórmula de Haversine
   */
  calcularDistancia(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Gera URL para mapa estático
   */
  gerarUrlMapaEstatico(
    lat: number,
    lng: number,
    zoom: number = 15,
    tamanho: string = '600x400',
    marcadores?: Array<{ lat: number; lng: number; cor?: string; label?: string }>
  ): string {
    this.verificarChaveAPI();
    
    
    let url = `${this.baseUrl}/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${tamanho}&key=${this.apiKey}`;
    
    if (marcadores && marcadores.length > 0) {
      marcadores.forEach((marcador, index) => {
        const cor = marcador.cor || 'red';
        const label = marcador.label || String.fromCharCode(65 + index); // A, B, C...
        url += `&markers=color:${cor}|label:${label}|${marcador.lat},${marcador.lng}`;
      });
    } else {
      // Marcador padrão no centro
      url += `&markers=color:red|${lat},${lng}`;
    }
    
    return url;
  }

  /**
   * Busca sugestões de autocompletar para endereços
   */
  async autocompletarEndereco(input: string): Promise<string[]> {
    this.verificarChaveAPI();
    
    try {
      const response = await axios.get(`${this.baseUrl}/place/autocomplete/json`, {
        params: {
          input,
          key: this.apiKey,
          language: 'pt-BR',
          components: 'country:BR'
        }
      });

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.predictions.map((prediction: any) => prediction.description);
    } catch (error) {
      console.error('Erro no autocompletar:', error);
      return [];
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private mapearTipoServico(tipo: string): string {
    const mapeamento: { [key: string]: string } = {
      'veterinario': 'veterinary_care',
      'petshop': 'pet_store',
      'hospital_veterinario': 'veterinary_care',
      'clinica_veterinaria': 'veterinary_care',
      'pet_shop': 'pet_store',
      'loja_animais': 'pet_store'
    };

    return mapeamento[tipo.toLowerCase()] || 'veterinary_care';
  }
}

// Instância singleton do serviço
export const geocodingService = new GeocodingService();