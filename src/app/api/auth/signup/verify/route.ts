import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { signupVerifySchema } from "@/lib/validation";
import { hashCode, OTP_MAX_ATTEMPTS } from "@/lib/otp";

export async function POST(request: NextRequest) {
  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다. 새로고침 후 다시 시도해 주세요." }, { status: 403 });
  }

  if (!rateLimit(`signup-verify:${clientKey(request)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = signupVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const { email, code } = parsed.data;

  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    return NextResponse.json({ error: "인증 요청을 찾을 수 없습니다. 다시 시도해 주세요." }, { status: 404 });
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
    return NextResponse.json({ error: "인증코드가 만료되었습니다. 다시 요청해 주세요." }, { status: 410 });
  }
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.pendingSignup.delete({ where: { email } }).catch(() => {});
    return NextResponse.json({ error: "시도 횟수를 초과했습니다. 다시 요청해 주세요." }, { status: 429 });
  }

  if (hashCode(code) !== pending.codeHash) {
    await prisma.pendingSignup.update({ where: { email }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "인증코드가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const dupStudent = await tx.user.findUnique({ where: { studentId: pending.studentId } });
      if (dupStudent) throw new ApiError(409, "이미 등록된 학번입니다.");

      const created = await tx.user.create({
        data: {
          studentId: pending.studentId,
          name: pending.name,
          email: pending.email,
          passwordHash: pending.passwordHash,
        },
        select: { id: true, studentId: true, name: true, email: true },
      });
      await tx.pendingSignup.delete({ where: { email } });
      return created;
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
