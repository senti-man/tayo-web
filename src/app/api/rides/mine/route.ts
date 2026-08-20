import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const rides = await prisma.rideRequest.findMany({
    where: {
      OR: [{ creatorId: user.id }, { participants: { some: { userId: user.id } } }],
    },
    orderBy: { departAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
    },
  });

  return NextResponse.json({ rides });
}
