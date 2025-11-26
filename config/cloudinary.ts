import { v2 as cloudinary } from 'cloudinary';
import { config } from './environment';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true
});

// Verificar se as credenciais estão configuradas
export const validateCloudinaryConfig = (): boolean => {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Configuração do Cloudinary incompleta:');
    console.error('   CLOUDINARY_CLOUD_NAME:', cloudName ? '✅' : '❌');
    console.error('   CLOUDINARY_API_KEY:', apiKey ? '✅' : '❌');
    console.error('   CLOUDINARY_API_SECRET:', apiSecret ? '✅' : '❌');
    return false;
  }
  
  return true;
};

// Testar conexão com Cloudinary
export const testCloudinaryConnection = async (): Promise<boolean> => {
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary conectado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão com Cloudinary:', error);
    return false;
  }
};

// Configurações de transformação para diferentes tipos de imagem
export const transformations = {
  // Para fotos de pets - otimizada para web
  pet_photo: {
    width: 800,
    height: 600,
    crop: 'limit',
    quality: 'auto:good',
    format: 'auto',
    fetch_format: 'auto'
  },
  
  // Para thumbnails - pequena e rápida
  pet_thumbnail: {
    width: 300,
    height: 300,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:low',
    format: 'auto'
  },
  
  // Para avatars de usuário
  avatar: {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    format: 'auto'
  }
};

// Função para gerar URLs com transformações
export const getImageUrl = (publicId: string, transformation: keyof typeof transformations = 'pet_photo'): string => {
  return cloudinary.url(publicId, transformations[transformation]);
};

// Função para upload com configurações personalizadas
export const uploadToCloudinary = async (
  filePath: string, 
  options: {
    folder?: string;
    transformation?: keyof typeof transformations;
    publicId?: string;
  } = {}
): Promise<any> => {
  const { folder = 'petfinder', transformation = 'pet_photo', publicId } = options;
  
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      public_id: publicId,
      transformation: transformations[transformation],
      overwrite: true,
      invalidate: true
    });
    
    return result;
  } catch (error) {
    console.error('Erro no upload para Cloudinary:', error);
    throw error;
  }
};

// Função para deletar imagem
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Erro ao deletar do Cloudinary:', error);
    return false;
  }
};

export { cloudinary };
export default cloudinary;