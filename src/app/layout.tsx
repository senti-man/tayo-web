import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "타요 | 캠퍼스 택시 합승",
  description: "목포대학교 학생들을 위한 캠퍼스 택시 합승 매칭 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-200">
        <AuthProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-xl">
            <div className="flex-1 pb-20">{children}</div>
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
