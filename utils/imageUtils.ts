/**
 * Utilitários para trabalhar com uploads e URLs de imagens
 */

// Função para validar se uma string é uma URL válida de imagem
export const isValidImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    
    // Verificar se é HTTPS (recomendado para produção)
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      return false;
    }
    
    // Verificar se termina com extensão de imagem
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const pathname = urlObj.pathname.toLowerCase();
    
    return imageExtensions.some(ext => pathname.includes(ext)) || 
           urlObj.hostname.includes('cloudinary.com') || // Cloudinary URLs
           urlObj.hostname.includes('res.cloudinary.com');
           
  } catch {
    return false;
  }
};

// Função para extrair public_id de URL do Cloudinary
export const extractCloudinaryPublicId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('cloudinary.com')) {
      return null;
    }
    
    // Padrão: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.jpg
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Pegar tudo após 'upload' e versão (se houver)
    const afterUpload = pathParts.slice(uploadIndex + 1);
    
    // Remover versão se existir (v123456)
    if (afterUpload[0] && afterUpload[0].startsWith('v')) {
      afterUpload.shift();
    }
    
    // Juntar o resto e remover extensão
    const publicIdWithExt = afterUpload.join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extensão
    
    return publicId;
    
  } catch {
    return null;
  }
};

// Função para formatar tamanho de arquivo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Função para gerar nome único para arquivo
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || '';
  
  return `${timestamp}_${random}.${extension}`;
};

// Função para validar tipo MIME de imagem
export const isValidImageMimeType = (mimeType: string): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  return allowedTypes.includes(mimeType.toLowerCase());
};

// Função para processar array de URLs (misto de URLs e uploads)
export const processImageUrls = (urls: string[]): {
  cloudinaryUrls: string[];
  externalUrls: string[];
  invalidUrls: string[];
} => {
  const cloudinaryUrls: string[] = [];
  const externalUrls: string[] = [];
  const invalidUrls: string[] = [];
  
  urls.forEach(url => {
    if (!isValidImageUrl(url)) {
      invalidUrls.push(url);
    } else if (url.includes('cloudinary.com')) {
      cloudinaryUrls.push(url);
    } else {
      externalUrls.push(url);
    }
  });
  
  return { cloudinaryUrls, externalUrls, invalidUrls };
};

// Configurações padrão para diferentes tipos de imagem
export const imageConfigs = {
  pet_photo: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    transformations: {
      width: 1200,
      height: 1200,
      crop: 'limit',
      quality: 'auto:good'
    }
  },
  
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    transformations: {
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto:good'
    }
  },
  
  event_photo: {
    maxSize: 8 * 1024 * 1024, // 8MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    transformations: {
      width: 1000,
      height: 600,
      crop: 'limit',
      quality: 'auto:good'
    }
  }
};

export default {
  isValidImageUrl,
  extractCloudinaryPublicId,
  formatFileSize,
  generateUniqueFileName,
  isValidImageMimeType,
  processImageUrls,
  imageConfigs
};