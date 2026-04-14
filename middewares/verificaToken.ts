// Este arquivo foi mantido para compatibilidade com código existente
// Para novos recursos, use o middleware em /middleware/auth.ts

import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from 'express'
import { config } from '../config/environment'
import { logger } from '../middleware/logger'

interface TokenI {
  userLogadoId: number
  userLogadoNome: string
  userLogadoNivel: number
}

export function verificaToken(req: Request | any, res: Response, next: NextFunction) {
  const { authorization } = req.headers

  if (!authorization) {
    logger.warn('Token não informado', { 
      ip: req.ip, 
      path: req.path 
    })
    res.status(401).json({ error: "Token não informado" })
    return
  }

  const token = authorization.split(" ")[1]

  try {
    const decode = jwt.verify(token, config.jwtSecret) as TokenI
    const { userLogadoId, userLogadoNome, userLogadoNivel } = decode

    req.userLogadoId    = userLogadoId
    req.userLogadoNome  = userLogadoNome
    req.userLogadoNivel = userLogadoNivel

    logger.debug('Token verificado (legacy)', { 
      userId: userLogadoId,
      path: req.path 
    })

    next()
  } catch (error) {
    logger.warn('Token inválido (legacy)', { 
      ip: req.ip, 
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    res.status(401).json({ error: "Token inválido" })
  }
}