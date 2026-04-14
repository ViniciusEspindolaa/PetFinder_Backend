
export const getEmailTemplate = (title: string, content: string) => {
  const logoUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/logo.png`;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #16a34a; /* green-600 */
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .header img {
      max-height: 50px;
      margin-bottom: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      background-color: #16a34a;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin-top: 20px;
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #16a34a;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    h2 {
      color: #111827;
      margin-top: 0;
    }
    h3 {
      color: #374151;
    }
    p {
      margin-bottom: 15px;
    }
    .highlight {
      color: #16a34a;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="PetFinder Logo" />
      <h1>PetFinder</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PetFinder. Todos os direitos reservados.</p>
      <p>Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
  `;
};
