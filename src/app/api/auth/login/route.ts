import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

const GENERIC_ERROR = "학번 또는 비밀번호가 올바르지 않습니다.";

export async function POST(request: NextRequest) {
  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다. 새로고침 후 다시 시도해 주세요." }, { status: 403 });
  }

  // Brute-force guard: limited per-IP AND the request body isn't parsed yet,
  // so this also caps how many bodies we bother parsing per IP.
  if (!rateLimit(`login:${clientKey(request)}`, 5, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }
  const { studentId, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { studentId } });
  // Always run bcrypt.compare, even for a missing user, against a fixed
  // dummy hash — this keeps response timing from revealing whether the
  // student ID exists.
  const hashToCheck = user?.passwordHash ?? "$2a$12$C6UzMDM.H6dfI/f/IKcEeO0Wk9YQfE0T8XA0i8j8u5m9e1e2n4t6a";
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!user || !valid) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, studentId: user.studentId, name: user.name, email: user.email } });
}
