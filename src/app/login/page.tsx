"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await login(studentId, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-8">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-rose-500 text-center text-2xl font-bold leading-[3.5rem] text-white">
          타
        </div>
        <h1 className="text-2xl font-bold text-slate-900">타요</h1>
        <p className="mt-1 text-sm text-slate-500">캠퍼스 택시 합승 매칭</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="학번"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          autoComplete="username"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
          required
        />
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="font-semibold text-rose-500">
          회원가입
        </Link>
      </p>
    </div>
  );
}
