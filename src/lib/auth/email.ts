import nodemailer from 'nodemailer';

export async function sendOtpEmail(
  email: string,
  code: string
): Promise<boolean> {
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

  // 1. If RESEND_API_KEY is configured, send via Resend transactional API
  if (process.env.RESEND_API_KEY) {
    const resendFrom =
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      'NEEI-Box <no-reply@neei.online>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: email,
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(
        errData.message || 'Falha ao enviar email através do Resend.'
      );
    }

    return true;
  }

  // 2. SMTP Transport (aligned with siteneei)
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  // Default to neei@aaualg.pt to match authenticated user and avoid Office 365 bounce/NDR floods
  const from =
    process.env.SMTP_FROM ||
    (user ? `NEEI – AAUAlg <${user}>` : 'NEEI – AAUAlg <neei@aaualg.pt>');

  // Fail closed: never print OTP codes to logs in production. If SMTP is
  // misconfigured there, sending must fail so the login flow stops instead of
  // exposing codes to anyone with access to the container logs.
  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Serviço de email não configurado.');
    }
    // Fallback for development if SMTP is not yet configured
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

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });

  return true;
}

