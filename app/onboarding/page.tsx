"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BrainCircuit, ArrowRight, ArrowLeft, X, Check, Bot, Shield, BookOpen,
  AlertTriangle, Sparkles, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ONBOARDED_KEY = "linker_onboarded"

// ═════════════════════════════════════════════════════════════════
// Slide Visuals — 모두 light theme 기반
// ═════════════════════════════════════════════════════════════════

// ── Slide 1: Welcome ─────────────────────────────────────────────

function WelcomeVisual() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Soft glow */}
      <div className="absolute -inset-20 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/25 blur-2xl rounded-3xl animate-pulse" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/40">
          <BrainCircuit className="h-12 w-12 text-primary-foreground" strokeWidth={1.8} />
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/50 animate-pulse"
            style={{
              left: `${20 + (i * 73) % 60}%`,
              top: `${15 + (i * 43) % 70}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Slide 2: Knowledge Graph ─────────────────────────────────────

function GraphVisual() {
  const nodes = [
    { id: "root", label: "벡터",       x: 200, y: 40,  delay: 0    },
    { id: "m1",   label: "행렬",       x: 110, y: 130, delay: 200  },
    { id: "m2",   label: "행렬 곱셈",  x: 290, y: 130, delay: 320  },
    { id: "l1",   label: "행렬식",     x: 70,  y: 220, delay: 600  },
    { id: "l2",   label: "선형 변환",  x: 200, y: 220, delay: 720  },
    { id: "l3",   label: "고유값",     x: 330, y: 220, delay: 840  },
  ]
  const edges = [
    { from: "root", to: "m1",  delay: 120 },
    { from: "root", to: "m2",  delay: 240 },
    { from: "m1",   to: "l1",  delay: 520 },
    { from: "m1",   to: "l2",  delay: 620 },
    { from: "m2",   to: "l2",  delay: 680 },
    { from: "m2",   to: "l3",  delay: 780 },
  ]
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <div className="relative w-[400px] h-[260px]">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-3xl" />

      <svg viewBox="0 0 400 260" className="relative w-full h-full">
        {/* Edges */}
        {edges.map((e, i) => {
          const p1 = pos[e.from]
          const p2 = pos[e.to]
          return (
            <line
              key={i}
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="rgba(168, 85, 247, 0.4)"
              strokeWidth={1.5}
              className="opacity-0 animate-in fade-in"
              style={{
                animationDelay: `${e.delay}ms`,
                animationDuration: "600ms",
                animationFillMode: "forwards",
              }}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((n) => (
          <g
            key={n.id}
            className="opacity-0 animate-in fade-in zoom-in-50"
            style={{
              animationDelay: `${n.delay}ms`,
              animationDuration: "500ms",
              animationFillMode: "forwards",
              transformOrigin: `${n.x}px ${n.y}px`,
            }}
          >
            {/* Glow halo */}
            <circle cx={n.x} cy={n.y} r={22} fill="rgba(168, 85, 247, 0.12)" />
            {/* Body */}
            <circle
              cx={n.x}
              cy={n.y}
              r={18}
              fill="white"
              stroke="rgba(168, 85, 247, 0.8)"
              strokeWidth={1.5}
            />
            {/* Label */}
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              className="fill-gray-900 font-medium"
              style={{ fontSize: "10px" }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ── Slide 3: Multi-Agent Harness ─────────────────────────────────

function HarnessVisual() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setPhase((p) => (p + 1) % 4), 2400)
    return () => clearInterval(interval)
  }, [])

  const agents = [
    { id: "proposer", name: "Proposer",    icon: Bot,      color: "primary",  label: "근본 원인 추론" },
    { id: "verifier", name: "Verifier",    icon: Shield,   color: "amber",    label: "교차 검증" },
    { id: "content",  name: "Content Gen", icon: BookOpen, color: "cyan",     label: "학습 콘텐츠 생성" },
  ]

  const getStatus = (id: string): "idle" | "running" | "done" => {
    if (phase === 0) return "idle"
    if (id === "proposer") return phase === 1 ? "running" : "done"
    if (id === "verifier") {
      if (phase < 2) return "idle"
      if (phase === 2) return "running"
      return "done"
    }
    if (phase < 3) return "idle"
    return "running"
  }

  return (
    <div className="relative w-[400px]">
      {/* Soft glow */}
      <div className="absolute -inset-6 bg-primary/10 rounded-3xl blur-3xl" />

      <div className="relative rounded-2xl border border-border bg-card p-4 space-y-2 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">
            Multi-Agent Harness
          </span>
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {phase === 0 ? "0" : phase === 1 ? "142" : phase === 2 ? "298" : "441"}t
          </span>
        </div>

        {/* Agent cards */}
        {agents.map((agent) => {
          const status = getStatus(agent.id)
          const isRunning = status === "running"
          const isDone = status === "done"
          const Icon = agent.icon
          return (
            <div
              key={agent.id}
              className={cn(
                "rounded-xl p-3 border transition-all duration-500",
                isRunning && agent.color === "primary" && "border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]",
                isRunning && agent.color === "amber" && "border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]",
                isRunning && agent.color === "cyan" && "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]",
                isDone && "border-emerald-500/30 bg-emerald-500/5",
                !isRunning && !isDone && "border-border bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors duration-500",
                    isRunning && agent.color === "primary" && "text-primary",
                    isRunning && agent.color === "amber" && "text-amber-500",
                    isRunning && agent.color === "cyan" && "text-cyan-500",
                    isDone && "text-emerald-500",
                    !isRunning && !isDone && "text-muted-foreground/60"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold transition-colors duration-500 flex-1",
                    isRunning && "text-foreground",
                    isDone && "text-foreground/70",
                    !isRunning && !isDone && "text-muted-foreground/70"
                  )}
                >
                  {agent.name}
                </span>
                {isRunning && (
                  <div
                    className={cn(
                      "w-3 h-3 border-[1.5px] rounded-full animate-spin shrink-0",
                      agent.color === "primary" && "border-primary/30 border-t-primary",
                      agent.color === "amber" && "border-amber-500/30 border-t-amber-500",
                      agent.color === "cyan" && "border-cyan-500/30 border-t-cyan-500"
                    )}
                  />
                )}
                {isDone && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                {!isRunning && !isDone && (
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                )}
              </div>
              <div
                className={cn(
                  "text-[10px] mt-1 text-center transition-all duration-500",
                  isRunning && "text-foreground/70",
                  isDone && "text-muted-foreground",
                  !isRunning && !isDone && "text-muted-foreground/60"
                )}
              >
                {status === "idle" ? "대기" : status === "running" ? agent.label : "완료"}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Slide 4: Micro Learning + Quiz (animated) ────────────────────

function RemedyVisual() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setPhase((p) => (p + 1) % 3), 2200)
    return () => clearInterval(interval)
  }, [])

  const options = [
    { label: "A", text: "5",   correct: true  },
    { label: "B", text: "8",   correct: false },
    { label: "C", text: "11",  correct: false },
    { label: "D", text: "-5",  correct: false },
  ]

  const selectedIdx = phase === 1 ? 1 : phase === 2 ? 0 : null
  const showFeedback = phase !== 0

  return (
    <div className="relative w-[400px]">
      <div className="absolute -inset-6 bg-red-500/8 rounded-3xl blur-3xl" />

      <div className="relative rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-500/15 rounded-lg border border-red-500/30">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            </div>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 uppercase tracking-wider">
              결손 개념
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground leading-tight">행렬식</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">2×2 행렬의 스칼라 값</p>
        </div>

        {/* Explanation */}
        <div className="p-4 space-y-4">
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">왜 틀렸을까요?</span>
            </div>
            <p className="text-[11px] text-foreground/75 leading-relaxed">
              ad - bc 공식에서 부호 규칙을 혼동했어요. 반대각선 곱을 빼는 순서가 중요합니다.
            </p>
          </div>

          {/* Quiz */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-foreground/80">확인 퀴즈</p>
              <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors duration-500",
                phase === 2
                  ? "text-emerald-600 bg-emerald-500/15"
                  : "text-amber-600 bg-amber-500/15"
              )}>
                {phase === 2 ? "✓ 통과" : "필수"}
              </span>
            </div>
            <p className="text-[11px] text-foreground/80 mb-2.5">
              행렬 [[2,3],[1,4]]의 행렬식은?
            </p>
            <div className="space-y-1.5">
              {options.map((opt, i) => {
                const isSelected = i === selectedIdx
                const state =
                  !showFeedback ? "neutral" :
                  isSelected && opt.correct ? "correct" :
                  isSelected && !opt.correct ? "wrong" :
                  "neutral"

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between text-[10px] px-3 py-2 rounded-lg border transition-all duration-500",
                      state === "neutral" && "bg-muted/30 border-border text-muted-foreground",
                      state === "correct" && "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.18)]",
                      state === "wrong" && "bg-red-500/15 border-red-500/50 text-red-600 shadow-[0_0_12px_rgba(239,68,68,0.18)]"
                    )}
                  >
                    <span>
                      <span className="font-mono mr-1.5 opacity-60">{opt.label}.</span>
                      {opt.text}
                    </span>
                    {state === "correct" && <Check className="h-3 w-3 shrink-0" />}
                    {state === "wrong" && <X className="h-3 w-3 shrink-0" />}
                  </div>
                )
              })}
            </div>

            {/* Feedback */}
            <div className="h-5 mt-2.5">
              {showFeedback && (
                <p
                  key={phase}
                  className={cn(
                    "text-[10px] font-semibold animate-in fade-in slide-in-from-bottom-1 duration-400",
                    phase === 1 && "text-red-600",
                    phase === 2 && "text-emerald-600"
                  )}
                >
                  {phase === 1
                    ? "✗ 틀렸어요. 다시 확인해보세요."
                    : "✓ 정답입니다! 학습 완료로 이동할 수 있어요."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Slide 5: Complete ────────────────────────────────────────────

function CompleteVisual() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="absolute -inset-20 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/35 blur-2xl rounded-full animate-pulse" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
          <Check className="h-12 w-12 text-white" strokeWidth={3} />
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// Slides Config
// ═════════════════════════════════════════════════════════════════

interface Slide {
  id: string
  label: string
  title: string
  description: string
  visual: React.ReactNode
}

const slides: Slide[] = [
  {
    id: "welcome",
    label: "WELCOME",
    title: "Linker에 오신 걸 환영합니다",
    description:
      "오답의 근본 원인까지 추적하는 AI 학습 도구.\n같은 실수를 반복하지 않도록 도와드립니다.",
    visual: <WelcomeVisual />,
  },
  {
    id: "graph",
    label: "STEP 1 · 지식 그래프",
    title: "개념 의존 관계를 한눈에",
    description:
      "학습 도메인의 개념들을 DAG로 시각화합니다.\n선행 개념부터 차근차근 쌓아가는 학습 경로가 보입니다.",
    visual: <GraphVisual />,
  },
  {
    id: "harness",
    label: "STEP 2 · 멀티 에이전트 분석",
    title: "AI 3개가 협업해 진단합니다",
    description:
      "Proposer가 제안하고, Verifier가 검증하고, Content Generator가 학습 자료를 만듭니다.\n단일 호출보다 정확한 근본 원인 추적.",
    visual: <HarnessVisual />,
  },
  {
    id: "remedy",
    label: "STEP 3 · 3분 마이크로 러닝",
    title: "결손 개념에 바로 맞춤 학습",
    description:
      "찾아낸 결손 개념에 대해 AI가 설명과 확인 퀴즈를 자동 생성합니다.\n퀴즈 통과 전엔 '학습 완료'도 눌리지 않아요.",
    visual: <RemedyVisual />,
  },
  {
    id: "complete",
    label: "READY",
    title: "준비가 끝났습니다",
    description: "이제 Linker로 학습을 시작해보세요.\n튜토리얼 그래프부터 체험해볼 수 있어요.",
    visual: <CompleteVisual />,
  },
]

// ═════════════════════════════════════════════════════════════════
// Main Onboarding Page
// ═════════════════════════════════════════════════════════════════

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [exiting, setExiting] = useState(false)

  const slide = slides[current]
  const isLast = current === slides.length - 1
  const isFirst = current === 0

  const markOnboarded = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDED_KEY, "true")
    }
  }

  const goNext = useCallback(() => {
    if (isLast) {
      markOnboarded()
      setExiting(true)
      setTimeout(() => router.push("/home"), 400)
      return
    }
    setDirection("next")
    setCurrent((c) => c + 1)
  }, [isLast, router])

  const goPrev = useCallback(() => {
    if (isFirst) return
    setDirection("prev")
    setCurrent((c) => c - 1)
  }, [isFirst])

  const skip = useCallback(() => {
    markOnboarded()
    setExiting(true)
    setTimeout(() => router.push("/home"), 400)
  }, [router])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext()
      else if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "Escape") skip()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [goNext, goPrev, skip])

  return (
    <div
      className={cn(
        "h-screen flex flex-col overflow-hidden bg-background text-foreground relative transition-opacity duration-400",
        "animate-in fade-in duration-700",
        exiting ? "opacity-0" : "opacity-100"
      )}
    >
      {/* ── Subtle ambient background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-primary/[0.08] rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/[0.06] rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Header (flex flow, not fixed) ── */}
      <header className="shrink-0 relative z-20 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary rounded-lg shadow-md shadow-primary/30">
            <BrainCircuit className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Linker</span>
        </div>
        <button
          onClick={skip}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
        >
          건너뛰기
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ── Main: slide content + side arrows ── */}
      <main className="flex-1 relative flex items-center justify-center px-20 md:px-28 min-h-0 overflow-hidden">
        {/* Prev button — absolute inside main */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          className={cn(
            "absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border flex items-center justify-center transition-all",
            isFirst
              ? "bg-muted/30 border-border/40 text-muted-foreground/30 cursor-not-allowed"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:scale-105 shadow-md"
          )}
          aria-label="이전"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Slide content */}
        <div
          key={slide.id}
          className={cn(
            "max-w-3xl w-full flex flex-col items-center text-center",
            "animate-in fade-in duration-500 ease-out",
            direction === "next" && "slide-in-from-right-6",
            direction === "prev" && "slide-in-from-left-6"
          )}
        >
          {/* Visual */}
          <div className="mb-8 flex items-center justify-center min-h-[260px]">
            {slide.visual}
          </div>

          {/* Text */}
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">
            {slide.label}
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight mb-4 max-w-2xl">
            {slide.title}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl whitespace-pre-line">
            {slide.description}
          </p>
        </div>

        {/* Next button — absolute inside main */}
        <button
          onClick={goNext}
          className={cn(
            "absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105",
            isLast
              ? "bg-gradient-to-br from-primary to-primary/70 border-primary text-primary-foreground shadow-[0_0_28px_rgba(168,85,247,0.45)] hover:brightness-110"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40 shadow-md"
          )}
          aria-label={isLast ? "시작하기" : "다음"}
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </main>

      {/* ── Footer: progress dots + keyboard hint ── */}
      <footer className="shrink-0 relative z-20 px-8 pb-6 pt-2 flex flex-col items-center gap-3">
        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                if (i === current) return
                setDirection(i > current ? "next" : "prev")
                setCurrent(i)
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === current
                  ? "w-10 bg-primary shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                  : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
              )}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-muted-foreground/60 font-mono">
          ← → 방향키로 이동  ·  ESC 건너뛰기
        </p>
      </footer>
    </div>
  )
}
