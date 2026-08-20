"use client";

// Minimal ambient typing for the pieces of the Kakao Maps JS SDK this app
// uses. The real SDK ships no official TypeScript types.
export type KakaoMapsNamespace = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => unknown;
  LatLngBounds: new () => { extend: (latlng: unknown) => void };
  Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMap;
  Marker: new (options: { position: unknown; image?: unknown; map?: KakaoMap }) => KakaoMarker;
  MarkerImage: new (src: string, size: unknown, options?: { offset?: unknown }) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  InfoWindow: new (options: { content: string }) => { open: (map: KakaoMap, marker: KakaoMarker) => void };
  event: { addListener: (target: unknown, type: string, handler: () => void) => void };
};

export type KakaoMap = {
  setCenter: (latlng: unknown) => void;
  setLevel: (level: number) => void;
  setBounds: (bounds: unknown) => void;
  relayout: () => void;
};

export type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsNamespace };
  }
}

let loadPromise: Promise<KakaoMapsNamespace> | null = null;

function loadKakaoMapsOnce(): Promise<KakaoMapsNamespace> {
  return new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!key) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다."));
      return;
    }

    if (window.kakao?.maps) {
      resolve(window.kakao.maps);
      return;
    }

    // Drop any script tag left over from a previous failed attempt so this
    // retry actually issues a fresh request instead of reusing a dead one.
    document.querySelectorAll("script[data-kakao-maps-sdk]").forEach((el) => el.remove());

    const script = document.createElement("script");
    script.dataset.kakaoMapsSdk = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao!.maps.load(() => resolve(window.kakao!.maps));
    };
    script.onerror = () => reject(new Error("카카오맵 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export async function loadKakaoMaps(): Promise<KakaoMapsNamespace> {
  if (loadPromise) return loadPromise;

  loadPromise = loadKakaoMapsOnce();
  try {
    return await loadPromise;
  } catch (err) {
    // Don't cache a failed load — the next caller (e.g. after the user
    // fixes their app config) should get a real retry, not the same
    // rejected promise forever.
    loadPromise = null;
    throw err;
  }
}
