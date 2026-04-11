"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BrainCircuit, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password) { setError("이메일과 비밀번호를 입력하세요."); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    // 첫 로그인이면 온보딩으로, 아니면 홈으로
    const onboarded = typeof window !== "undefined" && localStorage.getItem("linker_onboarded") === "true"
    router.push(onboarded ? "/home" : "/onboarding")
  }

  return (
    <div className="min-h-screen bg-background flex animate-in fade-in duration-500">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-primary to-primary/70 p-12 text-primary-foreground justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/20 rounded-xl">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Linker</span>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-bold leading-tight">
            학습 격차를<br />AI로 추적하세요.
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            지식 그래프가 당신의 오답을 분석하고<br />
            근본 원인을 찾아드립니다.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-primary-foreground/70">
          <div className="w-8 h-0.5 bg-primary-foreground/30 rounded-full" />
          AI-Powered Knowledge Graph Learning
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Top bar: mobile logo + back button */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="p-1.5 bg-primary rounded-lg">
                <BrainCircuit className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Linker</span>
            </div>
            <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto">
              <ArrowLeft className="h-3.5 w-3.5" />
              홈으로
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">어서오세요!</h1>
          <p className="text-muted-foreground text-sm mb-8">계정에 로그인하세요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>로그인 <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              회원가입
            </Link>
          </p>

          {/* Demo hint */}
          <div className="mt-8 p-3 bg-muted/50 rounded-xl border border-border">
            <p className="text-xs text-muted-foreground text-center">
              데모 버전 — 아무 이메일/비밀번호로 로그인하세요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
