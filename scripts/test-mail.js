const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    console.log('Using email config:');
    console.log({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      // pass: '***' // Ocultar senha nos logs
    });

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true para 465, false para outras portas
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // verify connection
    await transporter.verify();
    console.log('SMTP connection verified');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@petfinder.com',
      to: process.env.TEST_EMAIL_RECIPIENT || 'teste@example.com',
      subject: 'Teste SMTP PetFinder (Brevo)',
      text: 'Este é um e-mail de teste do PetFinder enviado via nodemailer usando Brevo.'
    });

    console.log('Message sent:', info.messageId);
    console.log(info);
  } catch (err) {
    console.error('Erro ao enviar teste de email:', err);
    process.exitCode = 1;
  }
})();
