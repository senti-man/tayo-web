import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { ensureCsrfCookie } from "@/lib/csrf";

export async function GET() {
  const csrfToken = await ensureCsrfCookie();
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ user: null, csrfToken });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, studentId: true, name: true, email: true },
  });
  return NextResponse.json({ user, csrfToken });
}
