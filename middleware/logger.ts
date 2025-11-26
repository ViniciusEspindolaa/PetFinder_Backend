import winston from 'winston'
import { Request, Response, NextFunction } from 'express'

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
]

// Only write to files in development environment
// Vercel/Serverless environments are read-only and should use Console transport
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  )
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports
})

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      url: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })
  })
  
  next()
}