import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function assertParticipant(rideId: string, userId: string) {
  const participant = await prisma.rideParticipant.findUnique({
    where: { rideRequestId_userId: { rideRequestId: rideId, userId } },
  });
  return Boolean(participant);
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await ctx.params;
  if (!(await assertParticipant(id, user.id))) {
    return NextResponse.json({ error: "이 합승 채팅방에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { rideRequestId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { user, response } = await requireUser();
  if (!user) return response;

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다." }, { status: 403 });
  }
  if (!rateLimit(`message:${user.id}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "메시지를 너무 빠르게 보내고 있습니다." }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!(await assertParticipant(id, user.id))) {
    return NextResponse.json({ error: "이 합승 채팅방에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const ride = await prisma.rideRequest.findUnique({ where: { id }, select: { status: true } });
  if (!ride || ride.status === "CANCELLED") {
    return NextResponse.json({ error: "취소된 요청에는 메시지를 보낼 수 없습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "메시지를 입력해 주세요." }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { rideRequestId: id, senderId: user.id, content: parsed.data.content },
    include: { sender: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
