"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { apiFetch } from "@/lib/api-client";

type RideSummary = {
  id: string;
  originName: string;
  destName: string;
  departAt: string;
  status: "OPEN" | "MATCHED" | "CANCELLED";
  capacity: number;
  creator: { id: string; name: string };
  _count: { participants: number };
};

const STATUS_LABEL: Record<RideSummary["status"], string> = {
  OPEN: "모집중",
  MATCHED: "매칭 완료",
  CANCELLED: "취소됨",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MyRidesPage() {
  return (
    <RequireAuth>
      <MyRidesContent />
    </RequireAuth>
  );
}

function MyRidesContent() {
  const router = useRouter();
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/rides/mine")
      .then((res) => res.json())
      .then((data) => setRides(data.rides ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <h1 className="text-xl font-bold text-slate-900">내 합승</h1>
      {loading ? (
        <p className="text-sm text-slate-400">불러오는 중...</p>
      ) : rides.length === 0 ? (
        <p className="text-sm text-slate-400">아직 참여한 합승 요청이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rides.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => router.push(`/rides/${r.id}`)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    {r.originName} → {r.destName}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "OPEN"
                        ? "bg-emerald-100 text-emerald-700"
                        : r.status === "MATCHED"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(r.departAt)} · {r._count.participants}/{r.capacity}명
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
