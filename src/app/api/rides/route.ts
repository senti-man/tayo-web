import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { rideCreateSchema } from "@/lib/validation";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const rides = await prisma.rideRequest.findMany({
    where: { status: "OPEN" },
    orderBy: { departAt: "asc" },
    take: 50,
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
    },
  });

  return NextResponse.json({ rides });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "요청을 검증할 수 없습니다." }, { status: 403 });
  }
  if (!rateLimit(`ride-create:${clientKey(request)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = rideCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const { origin, destination, departAt, capacity, note } = parsed.data;

  const ride = await prisma.rideRequest.create({
    data: {
      creatorId: user.id,
      originName: origin.name,
      originLat: origin.lat,
      originLng: origin.lng,
      destName: destination.name,
      destLat: destination.lat,
      destLng: destination.lng,
      departAt,
      capacity,
      note,
      participants: { create: { userId: user.id } },
    },
  });

  return NextResponse.json({ ride }, { status: 201 });
}
