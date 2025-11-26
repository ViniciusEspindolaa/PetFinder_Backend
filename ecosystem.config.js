module.exports = {
  apps: [{
    name: 'petfinder-api',
    script: './index.ts',
    interpreter: './node_modules/.bin/ts-node',
    instances: 'max', // Usar todos os cores disponíveis
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Configurações de log
    log_file: './logs/pm2.log',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // Configurações de restart
    watch: false, // Não usar watch em produção
    ignore_watch: ['node_modules', 'logs', '.git'],
    restart_delay: 1000,
    max_restarts: 5,
    min_uptime: '10s',
    
    // Configurações de memória
    max_memory_restart: '500M',
    
    // Configurações de saúde
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    
    // Variables de ambiente específicas
    env_vars: {
      'NODE_OPTIONS': '--max-old-space-size=512'
    },
    
    // Configurações adicionais
    merge_logs: true,
    time: true,
    autorestart: true,
    
    // Script de pós-deploy
    post_update: ['npm install', 'npx prisma generate', 'npx prisma migrate deploy'],
    
    // Configuração de cluster
    instance_var: 'INSTANCE_ID',
    
    // Configuração de cron para restart diário (opcional)
    cron_restart: '0 2 * * *' // Restart às 2:00 AM todo dia
  }]
};