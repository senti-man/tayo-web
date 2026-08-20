import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const { user, response } = await requireUser();
  if (!user) return response;

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다." }, { status: 403 });
  }
  if (!rateLimit(`ride-join:${clientKey(request)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const { id } = await ctx.params;

  try {
    const ride = await prisma.$transaction(async (tx) => {
      const current = await tx.rideRequest.findUnique({
        where: { id },
        include: { _count: { select: { participants: true } } },
      });
      if (!current) throw new ApiError(404, "합승 요청을 찾을 수 없습니다.");
      if (current.status !== "OPEN") throw new ApiError(409, "이미 마감되었거나 취소된 요청입니다.");
      if (current.departAt.getTime() < Date.now()) throw new ApiError(409, "이미 지난 요청입니다.");

      const already = await tx.rideParticipant.findUnique({
        where: { rideRequestId_userId: { rideRequestId: id, userId: user.id } },
      });
      if (already) throw new ApiError(409, "이미 참여 중인 요청입니다.");
      if (current._count.participants >= current.capacity) throw new ApiError(409, "정원이 가득 찼습니다.");

      await tx.rideParticipant.create({ data: { rideRequestId: id, userId: user.id } });

      const newCount = current._count.participants + 1;
      const status = newCount >= current.capacity ? "MATCHED" : "OPEN";

      return tx.rideRequest.update({
        where: { id },
        data: { status },
        include: {
          creator: { select: { id: true, name: true } },
          participants: { include: { user: { select: { id: true, name: true } } } },
        },
      });
    });

    return NextResponse.json({ ride });
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
