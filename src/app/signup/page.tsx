"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const { startSignup, verifySignup } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err, devCode: dev } = await startSignup(studentId, name, email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDevCode(dev ?? null);
    setStep("verify");
  }

  async function onResend() {
    setError(null);
    setSubmitting(true);
    const { error: err, devCode: dev } = await startSignup(studentId, name, email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDevCode(dev ?? null);
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await verifySignup(email, code);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  }

  if (step === "verify") {
    return (
      <div className="flex min-h-screen flex-col justify-center px-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">이메일 인증</h1>
          <p className="mt-1 text-sm text-slate-500">
            {email}로 전송된 6자리 인증코드를 입력해 주세요
          </p>
        </div>

        {devCode && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">[데모 모드] 실제 이메일 발송 서비스가 연결되지 않아 화면에 코드를 표시합니다.</p>
            <p className="mt-1">
              인증코드: <span className="font-mono text-base font-bold">{devCode}</span>
            </p>
          </div>
        )}

        <form onSubmit={onSubmitCode} className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            placeholder="6자리 인증코드"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.5em] outline-none focus:border-rose-400"
            required
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="mt-2 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "확인 중..." : "인증하고 가입 완료"}
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={submitting}
            className="rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 disabled:opacity-60"
          >
            코드 재전송
          </button>
          <button
            type="button"
            onClick={() => setStep("form")}
            className="text-sm text-slate-400"
          >
            ← 정보 다시 입력하기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
        <p className="mt-1 text-sm text-slate-500">학번으로 간편하게 시작하세요</p>
      </div>

      <form onSubmit={onSubmitForm} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="학번 (영문/숫자 6~20자)"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          autoComplete="username"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
          required
        />
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
          required
        />
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
          required
        />
        <input
          type="password"
          placeholder="비밀번호 (영문+숫자 8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-rose-400"
          required
        />
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "전송 중..." : "인증코드 받기"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-semibold text-rose-500">
          로그인
        </Link>
      </p>
    </div>
  );
}
