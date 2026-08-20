import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { signupStartSchema } from "@/lib/validation";
import { generateCode, hashCode, codeExpiresAt, sendVerificationEmail } from "@/lib/otp";

const BCRYPT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다. 새로고침 후 다시 시도해 주세요." }, { status: 403 });
  }

  if (!rateLimit(`signup-start:${clientKey(request)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = signupStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const { studentId, name, email, password } = parsed.data;

  // Extra guard against spamming a single email with repeated code requests,
  // independent of the per-IP limiter above.
  if (!rateLimit(`signup-start-email:${email}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "해당 이메일로 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const [existingStudent, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { studentId } }),
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (existingStudent) {
    return NextResponse.json({ error: "이미 등록된 학번입니다." }, { status: 409 });
  }
  if (existingEmail) {
    return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 409 });
  }

  // Opportunistic cleanup of stale pending signups so retries don't pile up.
  await prisma.pendingSignup.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const code = generateCode();

  await prisma.pendingSignup.upsert({
    where: { email },
    create: { studentId, name, email, passwordHash, codeHash: hashCode(code), expiresAt: codeExpiresAt() },
    update: { studentId, name, passwordHash, codeHash: hashCode(code), expiresAt: codeExpiresAt(), attempts: 0 },
  });

  try {
    const sendResult = await sendVerificationEmail(email, code);
    return NextResponse.json({ ok: true, devCode: sendResult.devCode });
  } catch (err) {
    console.error("Failed to send verification email:", err);
    // Roll back the pending signup so the user isn't stuck with a code that
    // was never delivered and can't be resent under the email rate limit.
    await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
    return NextResponse.json({ error: "인증코드 이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
