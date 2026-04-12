"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BrainCircuit, Eye, EyeOff, ArrowRight, ArrowLeft, User, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserRole, setUserRole, type UserRole } from "@/lib/graph-store"

// ── Login Graph Animation ─────────────────────────────────────
// 7초 루프: 노드 등장 → 엣지 연결 → 결손 감지(빨강 pulse) → 해결(초록) → 페이드 리셋

const ANIM_NODES = [
  { id: "a", label: "벡터",     cx: 70,  cy: 45  },
  { id: "b", label: "행렬",     cx: 200, cy: 35  },
  { id: "c", label: "행렬식",   cx: 135, cy: 110 },
  { id: "d", label: "역행렬",   cx: 270, cy: 105 },
  { id: "e", label: "고유값",   cx: 200, cy: 175 },
]
const ANIM_EDGES = [
  { from: "a", to: "b" },
  { from: "a", to: "c" },
  { from: "b", to: "c" },
  { from: "b", to: "d" },
  { from: "c", to: "d" },
  { from: "c", to: "e" },
  { from: "d", to: "e" },
]
const TOTAL_MS = 7000
const GAP_NODE = "c" // 결손 노드

function easeOut(t: number) { return 1 - (1 - t) * (1 - t) }

function LoginGraphAnimation() {
  const [t, setT] = useState(0)

  useEffect(() => {
    const start = Date.now()
    let raf: number
    const tick = () => {
      setT((Date.now() - start) % TOTAL_MS)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const nodeMap = Object.fromEntries(ANIM_NODES.map(n => [n.id, n]))
  const globalFade = t > 6200 ? Math.max(0, 1 - (t - 6200) / 800) : t < 300 ? t / 300 : 1

  return (
    <div className="relative w-full max-w-[380px] mx-auto" style={{ opacity: globalFade }}>
      {/* Browser-like container */}
      <div className="rounded-xl overflow-hidden border border-white/15 shadow-2xl shadow-black/20">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#1e1e2e] border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-white/5 text-[9px] text-white/40 font-mono">
              linker / knowledge_graph
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="bg-[#12121a] relative">
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <svg viewBox="0 0 340 210" className="relative w-full h-auto">
            {/* 엣지 — 노드보다 먼저 렌더 (뒤에 깔림) */}
            {ANIM_EDGES.map((e, i) => {
              const startTime = 1000 + i * 280
              const progress = t < startTime ? 0 : Math.min(1, (t - startTime) / 500)
              if (progress <= 0) return null
              const from = nodeMap[e.from]
              const to = nodeMap[e.to]
              const ex = from.cx + (to.cx - from.cx) * easeOut(progress)
              const ey = from.cy + (to.cy - from.cy) * easeOut(progress)
              const isGap = e.from === GAP_NODE || e.to === GAP_NODE
              const inGapPhase = t >= 3200 && t < 4500
              const inResolvePhase = t >= 4500
              const color = isGap && inGapPhase
                ? "rgba(239,68,68,0.6)"
                : isGap && inResolvePhase
                  ? "rgba(34,197,94,0.5)"
                  : "rgba(148,163,184,0.2)"
              return (
                <line
                  key={i}
                  x1={from.cx} y1={from.cy}
                  x2={ex} y2={ey}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              )
            })}

            {/* 노드 — 솔리드 배경으로 엣지를 완전히 가림 */}
            {ANIM_NODES.map((n, i) => {
              const appearAt = i * 400
              if (t < appearAt) return null
              const enterProgress = Math.min(1, (t - appearAt) / 400)
              const scale = 0.3 + 0.7 * easeOut(enterProgress)
              const opacity = easeOut(enterProgress)

              const isGap = n.id === GAP_NODE
              const inGapPhase = t >= 3200 && t < 4500
              const inResolvePhase = t >= 4500 && t < 5500
              const inGlowPhase = t >= 5500

              // 솔리드 컬러 — 엣지가 노드 뒤로 가려짐
              let fillColor = "#1e1e2e"
              let strokeColor = "rgba(148,163,184,0.5)"
              let glowColor = "transparent"
              let textColor = "rgba(226,232,240,0.9)"

              if (isGap && inGapPhase) {
                const pulse = 0.6 + 0.4 * Math.sin((t - 3200) / 150)
                fillColor = "#2a1215"
                strokeColor = `rgba(239,68,68,${0.7 * pulse})`
                glowColor = `rgba(239,68,68,${0.3 * pulse})`
                textColor = `rgba(252,165,165,${0.7 + 0.3 * pulse})`
              } else if (isGap && inResolvePhase) {
                const p = (t - 4500) / 1000
                fillColor = "#122a1a"
                strokeColor = `rgba(34,197,94,${0.6 + 0.3 * p})`
                glowColor = `rgba(34,197,94,${0.25 * p})`
                textColor = "rgba(187,247,208,0.95)"
              } else if (isGap && inGlowPhase) {
                fillColor = "#122a1a"
                strokeColor = "rgba(34,197,94,0.85)"
                glowColor = "rgba(34,197,94,0.25)"
                textColor = "rgba(187,247,208,0.95)"
              } else if (inGlowPhase) {
                fillColor = "#1e1e2e"
                strokeColor = "rgba(148,163,184,0.65)"
              }

              return (
                <g key={n.id} style={{ opacity }} transform={`translate(${n.cx},${n.cy}) scale(${scale}) translate(${-n.cx},${-n.cy})`}>
                  {/* outer glow */}
                  <circle cx={n.cx} cy={n.cy} r={26} fill={glowColor} />
                  {/* solid body — 엣지를 완전히 가림 */}
                  <circle cx={n.cx} cy={n.cy} r={20} fill={fillColor} stroke={strokeColor} strokeWidth={1.5} />
                  {/* label */}
                  <text x={n.cx} y={n.cy + 4} textAnchor="middle" fill={textColor} style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.02em" }}>
                    {n.label}
                  </text>
                </g>
              )
            })}

            {/* 결손 감지 라벨 */}
            {t >= 3400 && t < 4500 && (
              <g style={{ opacity: Math.min(1, (t - 3400) / 300) }}>
                <rect x={nodeMap[GAP_NODE].cx - 35} y={nodeMap[GAP_NODE].cy + 26} width={70} height={18} rx={4} fill="rgba(239,68,68,0.9)" />
                <text x={nodeMap[GAP_NODE].cx} y={nodeMap[GAP_NODE].cy + 39} textAnchor="middle" fill="white" style={{ fontSize: "9px", fontWeight: 700 }}>
                  Gap Detected
                </text>
              </g>
            )}

            {/* 해결 라벨 */}
            {t >= 4800 && t < 6200 && (
              <g style={{ opacity: Math.min(1, (t - 4800) / 300) }}>
                <rect x={nodeMap[GAP_NODE].cx - 30} y={nodeMap[GAP_NODE].cy + 26} width={60} height={18} rx={4} fill="rgba(34,197,94,0.9)" />
                <text x={nodeMap[GAP_NODE].cx} y={nodeMap[GAP_NODE].cy + 39} textAnchor="middle" fill="white" style={{ fontSize: "9px", fontWeight: 700 }}>
                  Resolved
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1e1e2e] border-t border-white/5">
          <span className="text-[8px] text-white/25 font-mono">5 nodes · 7 edges</span>
          <span className="text-[8px] text-white/25 font-mono">Linker v1</span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [role, setRole] = useState<UserRole>("student")

  // 저장된 역할로 초기화 (signup에서 넘어왔을 때)
  useEffect(() => {
    setRole(getUserRole())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password) { setError("이메일과 비밀번호를 입력하세요."); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)

    // 역할 저장
    setUserRole(role)

    if (role === "teacher") {
      // 교수는 대시보드로 바로 이동 (온보딩 없음)
      router.push("/teacher")
    } else {
      // 학생은 첫 로그인이면 온보딩으로, 아니면 홈으로
      const onboarded = typeof window !== "undefined" && localStorage.getItem("linker_onboarded") === "true"
      router.push(onboarded ? "/home" : "/onboarding")
    }
  }

  return (
    <div className="min-h-screen bg-background flex animate-in fade-in duration-500">
      {/* Left panel — 다크 테마 고정 (light/dark 모드 무관) */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0a0a12] p-12 text-white justify-between relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative flex items-center gap-2.5">
          <div className="p-2 bg-primary/20 border border-primary/30 rounded-xl">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Linker</span>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            학습 격차를<br />AI로 추적하세요.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            지식 그래프가 당신의 오답을 분석하고<br />
            근본 원인을 찾아드립니다.
          </p>

          {/* Knowledge Graph Animation */}
          <LoginGraphAnimation />
        </div>

        <div className="relative flex items-center gap-3 text-sm text-white/40">
          <div className="w-8 h-0.5 bg-white/20 rounded-full" />
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
          <p className="text-muted-foreground text-sm mb-6">계정에 로그인하세요</p>

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
