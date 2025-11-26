import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { logger } from './logger'

interface AuthRequest extends Request {
  usuario?: { 
    id: string
    email: string
    tipo?: 'usuario' | 'admin'
  }
}

export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null
  
  if (!token) {
    logger.warn('Tentativa de acesso sem token', { 
      ip: req.ip, 
      path: req.path 
    })
    return res.status(401).json({ erro: "Token de acesso obrigatório" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any
    req.usuario = decoded
    
    logger.info('Token validado com sucesso', { 
      userId: decoded.id,
      path: req.path 
    })
    
    next()
  } catch (error) {
    logger.warn('Token inválido', { 
      ip: req.ip, 
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    res.status(401).json({ erro: "Token inválido ou expirado" })
  }
}

export const verificarAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.usuario) {
    return res.status(401).json({ erro: "Usuário não autenticado" })
  }

  if (req.usuario.tipo !== 'admin') {
    logger.warn('Tentativa de acesso admin sem permissão', { 
      userId: req.usuario.id,
      path: req.path 
    })
    return res.status(403).json({ erro: "Acesso negado. Permissões de administrador necessárias." })
  }

  next()
}

export const verificarProprietario = (req: AuthRequest, res: Response, next: NextFunction) => {
  const { usuarioId } = req.params
  
  if (!req.usuario) {
    return res.status(401).json({ erro: "Usuário não autenticado" })
  }

  if (req.usuario.id !== usuarioId && req.usuario.tipo !== 'admin') {
    logger.warn('Tentativa de acesso a recurso de outro usuário', { 
      userId: req.usuario.id,
      targetUserId: usuarioId,
      path: req.path 
    })
    return res.status(403).json({ erro: "Acesso negado. Você só pode acessar seus próprios recursos." })
  }

  next()
}

export { AuthRequest }