import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary, validateCloudinaryConfig } from '../config/cloudinary';
import { Request } from 'express';

// Verificar configuração antes de criar o storage
if (!validateCloudinaryConfig()) {
  console.warn('⚠️  Cloudinary não configurado. Upload será desabilitado.');
}

// Configuração do storage do Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    // Determinar pasta baseada na rota
    let folder = 'petfinder/misc';
    
    if (req.route?.path?.includes('pets') || req.route?.path?.includes('publicacoes')) {
      folder = 'petfinder/pets';
    } else if (req.route?.path?.includes('avatar') || req.route?.path?.includes('usuarios')) {
      folder = 'petfinder/avatars';
    } else if (req.route?.path?.includes('eventos')) {
      folder = 'petfinder/eventos';
    }

    // Gerar nome único
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const publicId = `${timestamp}_${random}`;

    return {
      folder: folder,
      public_id: publicId,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        {
          width: 1200,
          height: 1200,
          crop: 'limit',
          quality: 'auto:good'
        }
      ]
    };
  }
});

// Configuração do Multer
const uploadConfig = {
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 5 // Máximo 5 arquivos
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Verificar se é uma imagem
    if (file.mimetype.startsWith('image/')) {
      // Tipos permitidos
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png', 
        'image/gif',
        'image/webp'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de imagem não suportado: ${file.mimetype}. Use JPG, PNG, GIF ou WebP.`));
      }
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos.'));
    }
  }
};

// Instâncias do multer para diferentes casos
export const uploadSingle = multer(uploadConfig).single('foto');
export const uploadMultiple = multer(uploadConfig).array('fotos', 5);
export const uploadAvatar = multer({
  ...uploadConfig,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB para avatar
    files: 1
  }
}).single('avatar');

// Middleware personalizado para diferentes tipos de upload
export const uploadPetPhotos = multer(uploadConfig).array('fotos', 5);
export const uploadEventPhoto = multer(uploadConfig).single('foto_evento');

// Middleware de tratamento de erros de upload
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          erro: 'Arquivo muito grande',
          detalhes: 'Tamanho máximo: 10MB por imagem',
          codigo: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          erro: 'Muitos arquivos',
          detalhes: 'Máximo 5 imagens por vez',
          codigo: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          erro: 'Campo de arquivo inesperado',
          detalhes: 'Use o campo "fotos" para enviar imagens',
          codigo: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          erro: 'Erro no upload',
          detalhes: error.message,
          codigo: 'UPLOAD_ERROR'
        });
    }
  }
  
  if (error.message.includes('não suportado') || error.message.includes('não permitido')) {
    return res.status(400).json({
      erro: 'Tipo de arquivo inválido',
      detalhes: error.message,
      tipos_aceitos: ['JPG', 'PNG', 'GIF', 'WebP'],
      codigo: 'INVALID_FILE_TYPE'
    });
  }
  
  return res.status(500).json({
    erro: 'Erro interno no upload',
    detalhes: 'Tente novamente em alguns minutos',
    codigo: 'INTERNAL_UPLOAD_ERROR'
  });
};

// Função utilitária para extrair informações do arquivo uploaded
export const extractFileInfo = (file: Express.Multer.File & { path?: string }) => {
  return {
    nome_original: file.originalname,
    tamanho_bytes: file.size,
    tamanho_kb: Math.round(file.size / 1024),
    tipo_mime: file.mimetype,
    url: file.path || '', // Cloudinary retorna a URL em file.path
    public_id: (file as any).filename || '', // Public ID do Cloudinary
    formato: file.mimetype.split('/')[1]
  };
};

export default { 
  uploadSingle, 
  uploadMultiple, 
  uploadAvatar, 
  uploadPetPhotos, 
  uploadEventPhoto,
  handleUploadError,
  extractFileInfo
};