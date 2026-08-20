"use client";

import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";

export default function MyPage() {
  return (
    <RequireAuth>
      <MyPageContent />
    </RequireAuth>
  );
}

function MyPageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <h1 className="text-xl font-bold text-slate-900">마이페이지</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">이름</p>
        <p className="text-base font-semibold text-slate-900">{user?.name}</p>
        <p className="mt-3 text-sm text-slate-500">학번</p>
        <p className="text-base font-semibold text-slate-900">{user?.studentId}</p>
        <p className="mt-3 text-sm text-slate-500">이메일</p>
        <p className="text-base font-semibold text-slate-900">{user?.email}</p>
      </div>

      <button
        onClick={onLogout}
        className="rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600"
      >
        로그아웃
      </button>
    </div>
  );
}
