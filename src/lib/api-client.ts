"use client";

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )tayo_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch(input: string, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (method !== "GET" && method !== "HEAD") {
    const token = readCsrfCookie();
    if (token) headers.set("x-csrf-token", token);
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
