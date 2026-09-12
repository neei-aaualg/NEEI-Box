import crypto from 'crypto';
import prisma from '@/lib/db';
import { sendOtpEmail } from './email';

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export async function createAndSendOtp(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Generate random 6-digit OTP
    const code = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing tokens for this email
    await prisma.otpToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // Save token
    await prisma.otpToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    // Send email
    await sendOtpEmail(normalizedEmail, code);

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Falha ao gerar o código.';
    return { success: false, error: message };
  }
}

export async function verifyOtpCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = hashOtp(code);

    const tokenRecord = await prisma.otpToken.findFirst({
      where: {
        email: normalizedEmail,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      return {
        success: false,
        error: 'Código expirado ou inexistente. Pede um novo.',
      };
    }

    if (tokenRecord.attempts >= 5) {
      await prisma.otpToken.delete({ where: { id: tokenRecord.id } });
      return {
        success: false,
        error: 'Demasiadas tentativas falhadas. Pede um novo código.',
      };
    }

    if (tokenRecord.tokenHash !== tokenHash) {
      await prisma.otpToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return { success: false, error: 'Código incorreto.' };
    }

    // Valid code, consume it
    await prisma.otpToken.delete({ where: { id: tokenRecord.id } });
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Falha na verificação.';
    return { success: false, error: message };
  }
}
