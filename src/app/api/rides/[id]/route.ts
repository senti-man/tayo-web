import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { verifyCsrf } from "@/lib/csrf";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await ctx.params;
  const ride = await prisma.rideRequest.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!ride) {
    return NextResponse.json({ error: "합승 요청을 찾을 수 없습니다." }, { status: 404 });
  }

  const isParticipant = ride.participants.some((p) => p.userId === user.id);
  return NextResponse.json({
    ride,
    isCreator: ride.creatorId === user.id,
    isParticipant,
  });
}

// Creator can cancel their own open ride request.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { user, response } = await requireUser();
  if (!user) return response;

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.action !== "cancel") {
    return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
  }

  const { id } = await ctx.params;
  const ride = await prisma.rideRequest.findUnique({ where: { id } });
  if (!ride) {
    return NextResponse.json({ error: "합승 요청을 찾을 수 없습니다." }, { status: 404 });
  }
  if (ride.creatorId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (ride.status === "CANCELLED") {
    return NextResponse.json({ ride });
  }

  const updated = await prisma.rideRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ride: updated });
}
