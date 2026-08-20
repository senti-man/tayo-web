"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import type { MapMarker } from "@/components/CampusMap";
import ChatPanel from "@/components/ChatPanel";

const CampusMap = dynamic(() => import("@/components/CampusMap"), { ssr: false });

type RideDetail = {
  id: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  departAt: string;
  capacity: number;
  note: string;
  status: "OPEN" | "MATCHED" | "CANCELLED";
  creator: { id: string; name: string };
  participants: { userId: string; user: { id: string; name: string } }[];
};

const STATUS_LABEL: Record<RideDetail["status"], string> = {
  OPEN: "모집중",
  MATCHED: "매칭 완료",
  CANCELLED: "취소됨",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RideDetailPage() {
  return (
    <RequireAuth>
      <RideDetailContent />
    </RequireAuth>
  );
}

function RideDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/rides/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "요청을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    setRide(data.ride);
    setIsParticipant(data.isParticipant);
    setIsCreator(data.isCreator);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
  }, [load]);

  async function onJoin() {
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/rides/${id}/join`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "참여에 실패했습니다.");
      return;
    }
    setRide(data.ride);
    setIsParticipant(true);
  }

  async function onCancel() {
    if (!confirm("이 합승 요청을 취소하시겠습니까?")) return;
    setBusy(true);
    const res = await apiFetch(`/api/rides/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) setRide(data.ride);
  }

  if (loading) return <div className="px-5 pt-10 text-sm text-slate-400">불러오는 중...</div>;
  if (!ride) return <div className="px-5 pt-10 text-sm text-rose-500">{error}</div>;

  const markers: MapMarker[] = [
    { id: "origin", name: ride.originName, lat: ride.originLat, lng: ride.originLng, color: "indigo" },
    { id: "dest", name: ride.destName, lat: ride.destLat, lng: ride.destLng, color: "rose" },
  ];
  const midpoint = { lat: (ride.originLat + ride.destLat) / 2, lng: (ride.originLng + ride.destLng) / 2 };
  const full = ride.participants.length >= ride.capacity;

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <button onClick={() => router.back()} className="text-sm text-slate-500">
        ← 뒤로
      </button>

      <div>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
            ride.status === "OPEN"
              ? "bg-emerald-100 text-emerald-700"
              : ride.status === "MATCHED"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-200 text-slate-500"
          }`}
        >
          {STATUS_LABEL[ride.status]}
        </span>
        <h1 className="mt-2 text-lg font-bold text-slate-900">
          {ride.originName} → {ride.destName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{formatDate(ride.departAt)} 출발</p>
      </div>

      <CampusMap center={midpoint} markers={markers} zoom={15} height={200} />

      {ride.note && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{ride.note}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          참여 인원 ({ride.participants.length}/{ride.capacity})
        </p>
        <ul className="flex flex-col gap-1">
          {ride.participants.map((p) => (
            <li key={p.userId} className="text-sm text-slate-600">
              {p.user.name}
              {p.userId === ride.creator.id && <span className="ml-1 text-xs text-rose-500">(방장)</span>}
              {p.userId === user?.id && <span className="ml-1 text-xs text-slate-400">(나)</span>}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {ride.status === "OPEN" && !isParticipant && (
        <button
          onClick={onJoin}
          disabled={busy || full}
          className="rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {full ? "정원이 가득 찼습니다" : busy ? "참여 중..." : "합류하기"}
        </button>
      )}

      {isCreator && ride.status !== "CANCELLED" && (
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-rose-300 py-3 text-sm font-semibold text-rose-500 disabled:opacity-60"
        >
          요청 취소
        </button>
      )}

      {isParticipant && ride.status !== "CANCELLED" && <ChatPanel rideId={ride.id} />}
    </div>
  );
}
