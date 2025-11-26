
import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';
import { getEmailTemplate } from '../utils/emailTemplate';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    console.log('Configurando envio de email...');
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER || process.env.EMAIL_USER || "968f0dd8cc78d9",
        pass: process.env.MAILTRAP_PASS || process.env.EMAIL_PASS || "89ed8bfbf9b7f9"
      }
    });

    // verify connection
    await transporter.verify();
    console.log('Conexão SMTP verificada');

    const subject = "Teste de Novo Template - PetFinder";
    const content = `
      <h2>Olá Usuário de Teste!</h2>
      <p>Este é um email de teste para verificar o novo layout dos emails do PetFinder.</p>
      
      <div class="info-box">
        <h3>Detalhes do Teste</h3>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Status:</strong> Sucesso</p>
        <p><strong>Descrição:</strong> O novo template inclui cabeçalho, rodapé e estilos responsivos.</p>
      </div>

      <p>Se você está vendo este email formatado corretamente, o teste foi bem sucedido!</p>
      
      <div style="text-align: center;">
        <a href="http://localhost:3000" class="button" style="color: #ffffff;">Acessar PetFinder</a>
      </div>
    `;

    const htmlContent = getEmailTemplate(subject, content);

    const info = await transporter.sendMail({
      from: 'petfinder@gmail.com',
      to: 'teste@example.com',
      subject: subject,
      text: 'Este é um email de teste (versão texto).',
      html: htmlContent
    });

    console.log('Email enviado com sucesso!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

  } catch (err) {
    console.error('Erro ao enviar teste de email:', err);
    process.exitCode = 1;
  }
})();
