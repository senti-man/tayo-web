import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { user: null, response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, studentId: true, name: true },
  });
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  return { user, response: null };
}
