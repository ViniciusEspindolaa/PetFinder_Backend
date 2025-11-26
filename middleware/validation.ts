import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { logger } from './logger'

export const validarResultado = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    logger.warn('Erro de validação', { 
      path: req.path,
      method: req.method,
      errors: errors.array(),
      ip: req.ip
    })
    
    return res.status(400).json({
      erro: "Dados inválidos",
      detalhes: errors.array().map(error => ({
        campo: error.type === 'field' ? error.path : 'unknown',
        mensagem: error.msg,
        valor: error.type === 'field' ? error.value : undefined
      }))
    })
  }
  
  next()
}

export const sanitizarEntrada = (req: Request, res: Response, next: NextFunction) => {
  // Remove campos potencialmente perigosos
  const camposProibidos = ['__proto__', 'constructor', 'prototype']
  
  const limparObjeto = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj
    
    if (Array.isArray(obj)) {
      return obj.map(limparObjeto)
    }
    
    const objLimpo: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (!camposProibidos.includes(key)) {
        objLimpo[key] = limparObjeto(value)
      }
    }
    return objLimpo
  }
  
  req.body = limparObjeto(req.body)
  req.query = limparObjeto(req.query)
  req.params = limparObjeto(req.params)
  
  next()
}