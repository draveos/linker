"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BrainCircuit, Eye, EyeOff, ArrowRight, Check, ArrowLeft, User, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { setUserRole, type UserRole } from "@/lib/graph-store"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [role, setRole] = useState<UserRole>("student")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name || !email || !password) { setError("모든 항목을 입력하세요."); return }
    if (password !== confirm) { setError("비밀번호가 일치하지 않습니다."); return }
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    // 선택한 역할을 저장 → 로그인 페이지에서 auto-select
    setUserRole(role)
    router.push("/login")
  }

  const perks = [
    "AI 오답 원인 분석",
    "개인화 지식 그래프",
    "마이크로 러닝 콘텐츠",
  ]

  return (
    <div className="min-h-screen bg-background flex animate-in fade-in duration-500">
      {/* Left panel — 다크 테마 고정 */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0a0a12] p-12 text-white justify-between relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative flex items-center gap-2.5">
          <div className="p-2 bg-primary/20 border border-primary/30 rounded-xl">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Linker</span>
        </div>

        <div className="relative space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold leading-tight">무엇이 포함되나요?</h2>
            <p className="text-white/60">지금 바로 무료로 시작하세요.</p>
          </div>
          <ul className="space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-white/80">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-sm text-white/40">
          <div className="w-8 h-0.5 bg-white/20 rounded-full" />
          Start Learning Smarter Today
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
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

          <h1 className="text-2xl font-bold text-foreground mb-1">계정 만들기</h1>
          <p className="text-muted-foreground text-sm mb-6">무료로 시작하세요</p>

          {/* Role toggle */}
          <div className="mb-5">
            <label className="text-xs font-medium text-foreground block mb-2">역할 선택</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-xl border-2 transition-all",
                  role === "student"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/10"
                    : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
              >
                <User className="h-4 w-4" />
                학생
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-xl border-2 transition-all",
                  role === "teacher"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/10"
                    : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
              >
                <GraduationCap className="h-4 w-4" />
                교수
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
              />
            </div>

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
                  placeholder="8자 이상"
                  className="w-full px-4 py-3 pr-11 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "w-full px-4 py-3 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder:text-muted-foreground/50",
                  confirm && confirm !== password
                    ? "border-destructive focus:ring-destructive/30"
                    : "border-border focus:ring-primary/30 focus:border-primary"
                )}
              />
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
                <>계정 만들기 <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
