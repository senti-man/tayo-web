"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import PoiAutocomplete from "@/components/PoiAutocomplete";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import { CAMPUS_CENTER, CampusPoi } from "@/lib/campus";
import type { MapMarker } from "@/components/CampusMap";

const CampusMap = dynamic(() => import("@/components/CampusMap"), { ssr: false });

type RideSummary = {
  id: string;
  originName: string;
  destName: string;
  destLat: number;
  destLng: number;
  departAt: string;
  capacity: number;
  creator: { id: string; name: string };
  _count: { participants: number };
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function minDateTimeLocal() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeContent />
    </RequireAuth>
  );
}

function HomeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [origin, setOrigin] = useState<CampusPoi | null>(null);
  const [destination, setDestination] = useState<CampusPoi | null>(null);
  const [departAt, setDepartAt] = useState(minDateTimeLocal());
  const [capacity, setCapacity] = useState(4);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadRides() {
    setLoading(true);
    const res = await apiFetch("/api/rides");
    const data = await res.json();
    if (res.ok) setRides(data.rides);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    loadRides();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!origin || !destination) {
      setError("출발지와 도착지를 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    const res = await apiFetch("/api/rides", {
      method: "POST",
      body: JSON.stringify({
        origin,
        destination,
        departAt: new Date(departAt).toISOString(),
        capacity,
        note,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "요청 생성에 실패했습니다.");
      return;
    }
    router.push(`/rides/${data.ride.id}`);
  }

  const markers: MapMarker[] = rides.map((r) => ({
    id: r.id,
    name: `${r.originName} → ${r.destName}`,
    lat: r.destLat,
    lng: r.destLng,
    color: "rose",
  }));

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div>
        <p className="text-sm text-slate-500">{user?.name}님, 안녕하세요 👋</p>
        <h1 className="text-xl font-bold text-slate-900">오늘은 어디로 가시나요?</h1>
      </div>

      <CampusMap center={CAMPUS_CENTER} markers={markers} height={220} />

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-sm text-slate-500 shadow-sm"
        >
          어디로 이동하시나요?
        </button>
      ) : (
        <form onSubmit={onCreate} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <PoiAutocomplete placeholder="출발지를 알려 주세요." value={origin} onSelect={setOrigin} />
          <PoiAutocomplete placeholder="도착지를 알려 주세요." value={destination} onSelect={setDestination} />
          <input
            type="datetime-local"
            value={departAt}
            min={minDateTimeLocal()}
            onChange={(e) => setDepartAt(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
            required
          />
          <select
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
          >
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                최대 {n}명 (본인 포함)
              </option>
            ))}
          </select>
          <textarea
            placeholder="메모 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            className="resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
            rows={2}
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "등록 중..." : "합승 요청 등록"}
            </button>
          </div>
        </form>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">진행중인 합승 요청</h2>
        {loading ? (
          <p className="text-sm text-slate-400">불러오는 중...</p>
        ) : rides.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 요청이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rides.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => router.push(`/rides/${r.id}`)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {r.originName} → {r.destName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(r.departAt)} · {r._count.participants}/{r.capacity}명 · {r.creator.name}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
