import "server-only";
import { createHash, randomInt } from "crypto";
import nodemailer, { type Transporter } from "nodemailer";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(code: string): string {
  const pepper = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${code}:${pepper}`).digest("hex");
}

export function codeExpiresAt(): Date {
  return new Date(Date.now() + CODE_TTL_MS);
}

export const OTP_MAX_ATTEMPTS = MAX_ATTEMPTS;

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

/**
 * Send-verification-code transport. Sends via Gmail SMTP when
 * GMAIL_USER/GMAIL_APP_PASSWORD are configured; otherwise falls back to
 * logging the code and returning it so the demo UI can display it directly.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<{ devCode?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[dev] 이메일 인증코드 (${email}): ${code}`);
    return { devCode: code };
  }

  await transporter.sendMail({
    from: `"타요" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `[타요] 이메일 인증코드: ${code}`,
    text: `타요 회원가입 이메일 인증코드는 ${code} 입니다. 10분 안에 입력해 주세요.`,
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
        <h2 style="color:#f43f5e;">타요 이메일 인증</h2>
        <p>아래 인증코드를 10분 안에 입력해 주세요.</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p style="color:#6b7280; font-size: 13px;">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
      </div>
    `,
  });

  return {};
}
