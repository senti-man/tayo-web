"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps, type KakaoMap, type KakaoMarker } from "@/lib/kakaoMaps";

export type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color?: "rose" | "indigo" | "slate";
};

const COLORS: Record<NonNullable<MapMarker["color"]>, string> = {
  rose: "#f43f5e",
  indigo: "#6366f1",
  slate: "#64748b",
};

function pinDataUri(color: NonNullable<MapMarker["color"]> = "slate") {
  const fill = COLORS[color];
  const svg = `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${fill}"/>
    <circle cx="14" cy="14" r="5.5" fill="white"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Kakao's zoom "level" runs the opposite way from the Leaflet-style zoom
// this component used to take (higher = more zoomed in), so translate.
function levelForZoom(zoom: number) {
  return Math.min(13, Math.max(1, 21 - zoom));
}

export default function CampusMap({
  center,
  zoom = 16,
  markers = [],
  height = 260,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerObjsRef = useRef<KakaoMarker[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new kakao.Map(containerRef.current, {
          center: new kakao.LatLng(center.lat, center.lng),
          level: levelForZoom(zoom),
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "지도를 불러오지 못했습니다.");
      });

    return () => {
      cancelled = true;
    };
    // Only the initial mount creates the map instance; center/zoom updates
    // for an existing map are handled in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    loadKakaoMaps().then((kakao) => {
      if (!mapRef.current) return;
      mapRef.current.setCenter(new kakao.LatLng(center.lat, center.lng));
      mapRef.current.setLevel(levelForZoom(zoom));
    });
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps().then((kakao) => {
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;

      markerObjsRef.current.forEach((m) => m.setMap(null));
      markerObjsRef.current = [];

      markers.forEach((m) => {
        const position = new kakao.LatLng(m.lat, m.lng);
        const image = new kakao.MarkerImage(pinDataUri(m.color), new kakao.Size(28, 36), {
          offset: new kakao.Point(14, 36),
        });
        const marker = new kakao.Marker({ position, image, map });
        const infoWindow = new kakao.InfoWindow({ content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${m.name}</div>` });
        kakao.event.addListener(marker, "click", () => infoWindow.open(map, marker));
        markerObjsRef.current.push(marker);
      });

      if (markers.length >= 2) {
        const bounds = new kakao.LatLngBounds();
        markers.forEach((m) => bounds.extend(new kakao.LatLng(m.lat, m.lng)));
        map.setBounds(bounds);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [markers]);

  if (error) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-center text-xs text-rose-500"
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-slate-200">
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
