import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다." }, { status: 403 });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
