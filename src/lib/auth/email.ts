import nodemailer from 'nodemailer';

export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'NEEI-Box <no-reply@neei.online>';

  // Fallback for development if SMTP is not yet configured
  if (!host || !user || !pass) {
    console.log(`\n==============================================`);
    console.log(`[AUTH-DEV] Código de Acesso OTP para ${email}: ${code}`);
    console.log(`==============================================\n`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const subject = `${code} é o teu código de acesso ao NEEI-Box`;
  const text = `O teu código de acesso ao NEEI-Box é: ${code}\n\nEste código expira em 10 minutos.\nSe não solicitaste este código, podes ignorar esta mensagem.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-bottom: 8px;">NEEI-Box</h2>
      <p style="color: #52525b; font-size: 14px; margin-bottom: 24px;">Código de confirmação de acesso à plataforma de materiais de estudo da UAlg.</p>
      
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #09090b;">${code}</span>
      </div>

      <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
        Este código é válido durante 10 minutos. Se não solicitaste este acesso, podes ignorar com segurança este email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });

  return true;
}
