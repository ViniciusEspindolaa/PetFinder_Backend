import { Router, Request, Response } from 'express';
import { uploadPetPhotos, uploadAvatar, uploadEventPhoto, handleUploadError, extractFileInfo } from '../middleware/upload';
import { validateCloudinaryConfig, getImageUrl, deleteFromCloudinary } from '../config/cloudinary';
import { verificarToken } from '../middleware/auth';
import { logger } from '../middleware/logger';
import { body, validationResult } from 'express-validator';

const router = Router();

// Verificar se Cloudinary está configurado
const cloudinaryConfigured = validateCloudinaryConfig();

// Middleware para verificar configuração
const checkCloudinaryConfig = (req: Request, res: Response, next: any) => {
  if (!cloudinaryConfigured) {
    return res.status(503).json({
      erro: 'Serviço de upload não disponível',
      detalhes: 'Cloudinary não está configurado. Configure as variáveis CLOUDINARY_* no arquivo .env',
      codigo: 'UPLOAD_SERVICE_UNAVAILABLE'
    });
  }
  next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadResponse:
 *       type: object
 *       properties:
 *         sucesso:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "2 foto(s) enviada(s) com sucesso"
 *         fotos:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nome_original:
 *                 type: string
 *                 example: "cachorro.jpg"
 *               tamanho_kb:
 *                 type: number
 *                 example: 245
 *               url:
 *                 type: string
 *                 example: "https://res.cloudinary.com/petfinder/image/upload/v1/pets/abc123.jpg"
 *               public_id:
 *                 type: string
 *                 example: "petfinder/pets/1634567890_abc123"
 *         fotos_urls:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://res.cloudinary.com/petfinder/image/upload/v1/pets/abc123.jpg"]
 */

/**
 * @swagger
 * /api/upload/pets:
 *   post:
 *     summary: Upload de fotos de pets
 *     description: Faz upload de até 5 fotos de pets para o Cloudinary
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Até 5 imagens (JPG, PNG, GIF, WebP) de até 10MB cada"
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Erro na validação dos arquivos
 *       401:
 *         description: Token não fornecido ou inválido
 *       503:
 *         description: Serviço de upload não disponível
 */
router.post('/pets', 
  verificarToken,
  checkCloudinaryConfig,
  (req: Request, res: Response) => {
    uploadPetPhotos(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, () => {});
      }

      try {
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
          return res.status(400).json({
            erro: 'Nenhuma foto foi enviada',
            detalhes: 'Envie pelo menos uma imagem usando o campo "fotos"',
            exemplo: 'FormData: fotos = [arquivo1.jpg, arquivo2.png]'
          });
        }

        // Extrair informações dos arquivos
        const fotosInfo = files.map(extractFileInfo);
        const fotosUrls = fotosInfo.map(foto => foto.url);

        logger.info(`Upload de pets realizado: ${files.length} fotos`, {
          usuario_id: (req as any).usuario?.id,
          arquivos: fotosInfo.map(f => f.nome_original),
          tamanho_total_kb: fotosInfo.reduce((acc, f) => acc + f.tamanho_kb, 0),
          public_ids: fotosInfo.map(f => f.public_id)
        });

        res.status(200).json({
          sucesso: true,
          message: `${files.length} foto(s) de pet enviada(s) com sucesso`,
          fotos: fotosInfo,
          fotos_urls: fotosUrls,
          total_arquivos: files.length,
          tamanho_total_kb: fotosInfo.reduce((acc, f) => acc + f.tamanho_kb, 0)
        });

      } catch (error) {
        logger.error('Erro no processamento do upload de pets:', error);
        res.status(500).json({
          erro: 'Erro interno no processamento',
          codigo: 'PROCESSING_ERROR'
        });
      }
    });
  }
);

/**
 * @swagger
 * /api/upload/avatar:
 *   post:
 *     summary: Upload de avatar do usuário
 *     description: Faz upload de uma foto de perfil do usuário
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: "Imagem para avatar (JPG, PNG, GIF, WebP) de até 5MB"
 *     responses:
 *       200:
 *         description: Avatar enviado com sucesso
 *       400:
 *         description: Erro na validação do arquivo
 *       401:
 *         description: Token não fornecido ou inválido
 */
router.post('/avatar',
  verificarToken,
  checkCloudinaryConfig,
  (req: Request, res: Response) => {
    uploadAvatar(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, () => {});
      }

      try {
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({
            erro: 'Nenhuma foto de avatar foi enviada',
            detalhes: 'Envie uma imagem usando o campo "avatar"'
          });
        }

        const avatarInfo = extractFileInfo(file);
        
        logger.info('Upload de avatar realizado', {
          usuario_id: (req as any).usuario?.id,
          arquivo: avatarInfo.nome_original,
          tamanho_kb: avatarInfo.tamanho_kb,
          public_id: avatarInfo.public_id
        });

        res.status(200).json({
          sucesso: true,
          message: 'Avatar enviado com sucesso',
          avatar: avatarInfo,
          avatar_url: avatarInfo.url
        });

      } catch (error) {
        logger.error('Erro no processamento do upload de avatar:', error);
        res.status(500).json({
          erro: 'Erro interno no processamento',
          codigo: 'PROCESSING_ERROR'
        });
      }
    });
  }
);

/**
 * @swagger
 * /api/upload/evento:
 *   post:
 *     summary: Upload de foto de evento
 *     description: Faz upload de uma foto para evento
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               foto_evento:
 *                 type: string
 *                 format: binary
 *                 description: "Imagem do evento (JPG, PNG, GIF, WebP) de até 10MB"
 *     responses:
 *       200:
 *         description: Foto do evento enviada com sucesso
 *       400:
 *         description: Erro na validação do arquivo
 *       401:
 *         description: Token não fornecido ou inválido
 */
router.post('/evento',
  verificarToken,
  checkCloudinaryConfig,
  (req: Request, res: Response) => {
    uploadEventPhoto(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, () => {});
      }

      try {
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({
            erro: 'Nenhuma foto de evento foi enviada',
            detalhes: 'Envie uma imagem usando o campo "foto_evento"'
          });
        }

        const eventoInfo = extractFileInfo(file);
        
        logger.info('Upload de foto de evento realizado', {
          usuario_id: (req as any).usuario?.id,
          arquivo: eventoInfo.nome_original,
          tamanho_kb: eventoInfo.tamanho_kb,
          public_id: eventoInfo.public_id
        });

        res.status(200).json({
          sucesso: true,
          message: 'Foto do evento enviada com sucesso',
          evento: eventoInfo,
          foto_url: eventoInfo.url
        });

      } catch (error) {
        logger.error('Erro no processamento do upload de evento:', error);
        res.status(500).json({
          erro: 'Erro interno no processamento',
          codigo: 'PROCESSING_ERROR'
        });
      }
    });
  }
);

/**
 * @swagger
 * /api/upload/delete:
 *   delete:
 *     summary: Deletar imagem do Cloudinary
 *     description: Remove uma imagem do Cloudinary usando o public_id
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - public_id
 *             properties:
 *               public_id:
 *                 type: string
 *                 example: "petfinder/pets/1634567890_abc123"
 *                 description: "ID público da imagem no Cloudinary"
 *     responses:
 *       200:
 *         description: Imagem deletada com sucesso
 *       400:
 *         description: public_id não fornecido ou inválido
 *       401:
 *         description: Token não fornecido ou inválido
 */
router.delete('/delete',
  verificarToken,
  checkCloudinaryConfig,
  [
    body('public_id')
      .notEmpty()
      .withMessage('public_id é obrigatório')
      .isString()
      .withMessage('public_id deve ser uma string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          erro: 'Dados inválidos',
          detalhes: errors.array()
        });
      }

      const { public_id } = req.body;
      
      logger.info('Tentativa de deletar imagem', {
        usuario_id: (req as any).usuario?.id,
        public_id
      });

      const sucesso = await deleteFromCloudinary(public_id);
      
      if (sucesso) {
        logger.info('Imagem deletada com sucesso', { public_id });
        res.status(200).json({
          sucesso: true,
          message: 'Imagem deletada com sucesso',
          public_id
        });
      } else {
        logger.warn('Falha ao deletar imagem', { public_id });
        res.status(400).json({
          erro: 'Não foi possível deletar a imagem',
          detalhes: 'Verifique se o public_id está correto',
          public_id
        });
      }

    } catch (error) {
      logger.error('Erro ao deletar imagem:', error);
      res.status(500).json({
        erro: 'Erro interno ao deletar imagem'
      });
    }
  }
);

/**
 * @swagger
 * /api/upload/health:
 *   get:
 *     summary: Status do serviço de upload
 *     description: Verifica se o Cloudinary está configurado e funcionando
 *     tags: [Upload]
 *     responses:
 *       200:
 *         description: Serviço funcionando normalmente
 *       503:
 *         description: Serviço não disponível
 */
router.get('/health', (req: Request, res: Response) => {
  if (cloudinaryConfigured) {
    res.status(200).json({
      status: 'OK',
      message: 'Serviço de upload funcionando',
      provider: 'Cloudinary',
      configurado: true,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'UNAVAILABLE',
      message: 'Serviço de upload não configurado',
      provider: 'Cloudinary',
      configurado: false,
      detalhes: 'Configure as variáveis CLOUDINARY_* no arquivo .env',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;