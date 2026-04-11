"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  BrainCircuit, ArrowRight, Play, Grid3x3, Brain, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, Check, Bot, Shield, Zap,
  TrendingUp, GitBranch, BarChart3, Atom, FlaskConical, Dna, Cpu, Terminal, Database, Network,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Reveal on scroll hook ──
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
        { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Scroll-based roadmap progress hook ──
function useRoadmapProgress(itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [activeNodes, setActiveNodes] = useState<boolean[]>(new Array(itemCount).fill(false))
  const [fadingNodes, setFadingNodes] = useState<boolean[]>(new Array(itemCount).fill(false))
  const prevActiveRef = useRef<boolean[]>(new Array(itemCount).fill(false))

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight

      // Calculate how much of the section is visible
      const sectionTop = rect.top
      const sectionHeight = rect.height

      // Start when section enters viewport, complete when it's about to leave
      const scrollProgress = Math.max(0, Math.min(1,
          (windowHeight * 0.6 - sectionTop) / (sectionHeight * 0.8)
      ))

      setProgress(scrollProgress)

      // Calculate which nodes should be active based on progress
      const newActiveNodes = new Array(itemCount).fill(false).map((_, i) => {
        const nodeThreshold = (i + 0.5) / itemCount
        return scrollProgress >= nodeThreshold
      })

      // Detect nodes that just turned off (for fading effect)
      const newFadingNodes = new Array(itemCount).fill(false).map((_, i) => {
        return prevActiveRef.current[i] && !newActiveNodes[i]
      })

      // Clear fading state after animation
      if (newFadingNodes.some(f => f)) {
        setTimeout(() => {
          setFadingNodes(new Array(itemCount).fill(false))
        }, 500)
      }

      setFadingNodes(newFadingNodes)
      setActiveNodes(newActiveNodes)
      prevActiveRef.current = newActiveNodes
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Initial check
    return () => window.removeEventListener("scroll", handleScroll)
  }, [itemCount])

  return { containerRef, progress, activeNodes, fadingNodes }
}

// ── Features data (roadmap style) ──
const capabilities = [
  {
    icon: Grid3x3,
    title: "지식 그래프 시각화",
    desc: "개념 간의 연결을 직관적으로 시각화합니다. 학습 진도를 한눈에 파악하세요.",
    step: 1,
  },
  {
    icon: Brain,
    title: "AI 근본 원인 분석",
    desc: "표면적 실수가 아닌 핵심 결손 개념을 정확히 추적하고 진단합니다.",
    step: 2,
  },
  {
    icon: BookOpen,
    title: "마이크로 러닝",
    desc: "결손 개념을 3분 안에 복습합니다. 짧고 효과적인 학습 콘텐츠.",
    step: 3,
  },
  {
    icon: Sparkles,
    title: "개인화 학습 경로",
    desc: "각 학생의 학습 상황에 맞춘 맞춤형 학습 계획을 제공합니다.",
    step: 4,
  },
]

// ── Subjects for 3D carousel ──
// Tailwind 동적 클래스 방지를 위해 lookup 테이블로 분리
const SUBJECT_COLORS = {
  blue:    { iconColor: "text-blue-400",    cardBorder: "border-blue-500/30",    watermark: "text-blue-500/[0.06]",    linkColor: "text-blue-400" },
  purple:  { iconColor: "text-purple-400",  cardBorder: "border-purple-500/30",  watermark: "text-purple-500/[0.06]",  linkColor: "text-purple-400" },
  orange:  { iconColor: "text-orange-400",  cardBorder: "border-orange-500/30",  watermark: "text-orange-500/[0.06]",  linkColor: "text-orange-400" },
  pink:    { iconColor: "text-pink-400",    cardBorder: "border-pink-500/30",    watermark: "text-pink-500/[0.06]",    linkColor: "text-pink-400" },
  cyan:    { iconColor: "text-cyan-400",    cardBorder: "border-cyan-500/30",    watermark: "text-cyan-500/[0.06]",    linkColor: "text-cyan-400" },
  emerald: { iconColor: "text-emerald-400", cardBorder: "border-emerald-500/30", watermark: "text-emerald-500/[0.06]", linkColor: "text-emerald-400" },
  lime:    { iconColor: "text-lime-400",    cardBorder: "border-lime-500/30",    watermark: "text-lime-500/[0.06]",    linkColor: "text-lime-400" },
  red:     { iconColor: "text-red-400",     cardBorder: "border-red-500/30",     watermark: "text-red-500/[0.06]",     linkColor: "text-red-400" },
  slate:   { iconColor: "text-slate-300",   cardBorder: "border-slate-400/30",   watermark: "text-slate-400/[0.06]",   linkColor: "text-slate-300" },
  amber:   { iconColor: "text-amber-400",   cardBorder: "border-amber-500/30",   watermark: "text-amber-500/[0.06]",   linkColor: "text-amber-400" },
  teal:    { iconColor: "text-teal-400",    cardBorder: "border-teal-500/30",    watermark: "text-teal-500/[0.06]",    linkColor: "text-teal-400" },
  fuchsia: { iconColor: "text-fuchsia-400", cardBorder: "border-fuchsia-500/30", watermark: "text-fuchsia-500/[0.06]", linkColor: "text-fuchsia-400" },
} as const

type SubjectColor = keyof typeof SUBJECT_COLORS

const subjects: Array<{
  label: string
  desc: string
  icon: typeof Grid3x3
  color: SubjectColor
}> = [
  { label: "선형대수학",   desc: "벡터, 행렬, 고유값",       icon: Grid3x3,      color: "blue" },
  { label: "미적분학",     desc: "미분, 적분, 극한",         icon: TrendingUp,   color: "purple" },
  { label: "알고리즘",     desc: "정렬, 탐색, 그래프",       icon: GitBranch,    color: "orange" },
  { label: "확률통계",     desc: "확률분포, 추론, 회귀",     icon: BarChart3,    color: "pink" },
  { label: "물리학",       desc: "역학, 전자기학, 열역학",   icon: Atom,         color: "cyan" },
  { label: "화학",         desc: "유기화학, 무기화학",       icon: FlaskConical, color: "emerald" },
  { label: "생물학",       desc: "세포, 유전, 생태학",       icon: Dna,          color: "lime" },
  { label: "컴퓨터 구조",  desc: "CPU, 메모리, 캐시",        icon: Cpu,          color: "red" },
  { label: "운영체제",     desc: "프로세스, 스레드, 메모리", icon: Terminal,     color: "slate" },
  { label: "데이터베이스", desc: "SQL, 정규화, 트랜잭션",    icon: Database,     color: "amber" },
  { label: "네트워크",     desc: "TCP/IP, HTTP, 소켓",       icon: Network,      color: "teal" },
  { label: "머신러닝",     desc: "회귀, 분류, 클러스터링",   icon: Brain,        color: "fuchsia" },
]

// ── Demo areas ──
const demoAreas: Array<{
  title: string
  subtitle: string
  badge: string
  videoSrc: string
}> = [
  {
    title: "오답 분석 리포트",
    subtitle: "멀티 에이전트가 오답의 근본 원인을 추적합니다",
    badge: "AI-Powered",
    videoSrc: "/analysis_report_demo.mp4",
  },
  {
    title: "AI 그래프 생성",
    subtitle: "강의 텍스트 한 줄로 지식 그래프를 자동 생성",
    badge: "Automated",
    videoSrc: "/graph_generation_demo.mp4",
  },
]

// ── Harness agent configs ──
const HARNESS_AGENTS = [
  {
    id: "proposer" as const,
    name: "Proposer",
    icon: Bot,
    runningBorder: "border-primary/50",
    runningBg: "bg-primary/10",
    iconColor: "text-primary",
    spinnerClass: "border-primary/30 border-t-primary",
    glowClass: "shadow-[0_0_14px_rgba(168,85,247,0.3)]",
    idleText: "추론 대기",
    runningText: "그래프 역추적 중",
    doneText: "행렬식 · 89%",
  },
  {
    id: "verifier" as const,
    name: "Verifier",
    icon: Shield,
    runningBorder: "border-amber-500/50",
    runningBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    spinnerClass: "border-amber-500/30 border-t-amber-400",
    glowClass: "shadow-[0_0_14px_rgba(251,191,36,0.3)]",
    idleText: "검증 대기",
    runningText: "선행 개념 교차 검증",
    doneText: "✓ 동의 · 확정",
  },
  {
    id: "content" as const,
    name: "Content Gen",
    icon: BookOpen,
    runningBorder: "border-cyan-500/50",
    runningBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    spinnerClass: "border-cyan-500/30 border-t-cyan-400",
    glowClass: "shadow-[0_0_14px_rgba(34,211,238,0.3)]",
    idleText: "생성 대기",
    runningText: "마이크로 러닝 작성",
    doneText: "3분 학습 준비됨",
  },
]

type HarnessAgent = typeof HARNESS_AGENTS[number]
type AgentStatus = "idle" | "running" | "done"

const PHASE_TOKENS = [0, 142, 298, 441]
const PHASE_LATENCY = [0, 0.8, 1.6, 2.4]   // seconds, fake

function getAgentStatus(id: HarnessAgent["id"], phase: number): AgentStatus {
  if (phase === 0) return "idle"
  if (id === "proposer") return phase === 1 ? "running" : "done"
  if (id === "verifier") {
    if (phase < 2) return "idle"
    if (phase === 2) return "running"
    return "done"
  }
  // content
  if (phase < 3) return "idle"
  return "running"
}

// ── Linker App Mockup — 4-phase animated demo ──
function LinkerDemoMockup() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % 4)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // phase 0: idle, 1: analyzing, 2: root cause found, 3: verifier shown
  const nodes = [
    { id: "1", label: "벡터",        x: 20, y: 15 },
    { id: "2", label: "행렬",        x: 50, y: 15 },
    { id: "3", label: "행렬 곱셈",   x: 80, y: 15 },
    { id: "4", label: "행렬식",      x: 35, y: 45 },
    { id: "5", label: "선형 변환",   x: 65, y: 45 },
    { id: "6", label: "역행렬",      x: 20, y: 75 },
    { id: "7", label: "고유값",      x: 50, y: 75 },
    { id: "8", label: "대각화",      x: 80, y: 75 },
  ]

  const edges: [string, string][] = [
    ["1", "2"], ["2", "3"], ["2", "4"], ["3", "5"],
    ["4", "6"], ["4", "7"], ["5", "7"], ["7", "8"],
  ]

  const rootCauseId = "4"
  const traversalPath = new Set(["2-4", "4-7", "4-6"])
  const showResult = phase >= 2
  const showVerifier = phase >= 3

  return (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-3xl opacity-60 pointer-events-none" />

      {/* Browser window */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.8)] bg-gradient-to-br from-gray-950 to-black">
        {/* Window chrome */}
        <div className="flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 max-w-xs mx-auto bg-white/5 rounded-md px-3 py-1 text-[10px] text-white/40 text-center font-mono">
            🔒 linker.app/learn
          </div>
          <div className="w-12" />
        </div>

        {/* App content */}
        <div className="flex h-[500px] sm:h-[580px] bg-gradient-to-br from-gray-950 via-black to-gray-950">
          {/* ── Sidebar ── */}
          <div className="w-48 sm:w-56 border-r border-white/5 p-4 space-y-3 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <div className="p-1.5 bg-primary/20 rounded-lg border border-primary/30">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-white text-xs font-bold tracking-tight">Linker</span>
            </div>

            {/* 오답 입력 */}
            <div className="space-y-2">
              <div className="text-white/30 text-[9px] font-semibold uppercase tracking-wider">오답 입력</div>
              <div className="bg-white/5 rounded-lg p-2.5 space-y-1.5 border border-white/5">
                <div className="h-1 bg-white/15 rounded-full" />
                <div className="h-1 bg-white/15 rounded-full w-5/6" />
                <div className="h-1 bg-white/10 rounded-full w-2/3" />
                <div className="h-1 bg-white/10 rounded-full w-3/4" />
              </div>

              {/* Analyze button */}
              <button
                className={cn(
                  "w-full py-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all",
                  phase === 1
                    ? "bg-primary/30 text-primary border border-primary/30"
                    : "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                )}
              >
                {phase === 1 ? (
                  <>
                    <div className="w-2.5 h-2.5 border border-primary/40 border-t-primary rounded-full animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-2.5 w-2.5" />
                    결손 개념 분석
                  </>
                )}
              </button>
            </div>

            {/* Recent analyses */}
            <div className="pt-2 space-y-1.5">
              <div className="text-white/30 text-[9px] font-semibold uppercase tracking-wider">최근 분석</div>
              <div
                className={cn(
                  "bg-white/5 rounded-lg p-2 border border-white/5 transition-all duration-500",
                  showResult && "border-red-500/30 bg-red-500/5"
                )}
              >
                <div className="text-white/70 text-[9px] font-medium truncate">
                  {showResult ? "행렬식 결손 탐지" : "역행렬 부호 오류"}
                </div>
                <div className="text-white/30 text-[8px]">
                  {showResult ? "방금 전" : "10분 전"}
                </div>
              </div>
            </div>

            {/* ── Multi-Agent Harness Panel ── */}
            <div className="pt-2">
              {/* Header */}
              <div className="flex items-center gap-1 mb-1.5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-500",
                  phase === 0 && "bg-white/30",
                  phase > 0 && phase < 3 && "bg-primary animate-pulse",
                  phase === 3 && "bg-emerald-400"
                )} />
                <span className="text-white/40 text-[9px] font-semibold uppercase tracking-wider flex-1">
                  Multi-Agent Harness
                </span>
              </div>

              {/* Container */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-2 space-y-1.5 backdrop-blur-sm">
                {/* Stats row */}
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <span className="text-[8px] text-white/40 font-mono flex items-center gap-1">
                    <Zap className="h-2 w-2" />
                    3 agents
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-white/50 font-mono tabular-nums transition-all duration-500">
                      {PHASE_TOKENS[phase]}t
                    </span>
                    <span className="text-[8px] text-white/30 font-mono tabular-nums transition-all duration-500">
                      {PHASE_LATENCY[phase].toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Agent cards */}
                {HARNESS_AGENTS.map((cfg, idx) => {
                  const status = getAgentStatus(cfg.id, phase)
                  const isRunning = status === "running"
                  const isDone = status === "done"
                  const Icon = cfg.icon
                  const subText =
                    status === "idle" ? cfg.idleText :
                    status === "running" ? cfg.runningText :
                    cfg.doneText

                  return (
                    <div key={cfg.id} className="relative">
                      {/* Connecting line between agents (except first) */}
                      {idx > 0 && (
                        <div className={cn(
                          "absolute -top-[7px] left-[9px] w-px h-1.5 transition-colors duration-500",
                          (phase > idx) ? "bg-emerald-500/40" : "bg-white/10"
                        )} />
                      )}

                      <div
                        className={cn(
                          "rounded-lg px-2 py-1.5 border transition-all duration-500",
                          isRunning && cfg.runningBorder,
                          isRunning && cfg.runningBg,
                          isRunning && cfg.glowClass,
                          isDone && "border-emerald-500/25 bg-emerald-500/5",
                          !isRunning && !isDone && "border-white/5 bg-white/[0.02]"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={cn(
                            "h-2.5 w-2.5 shrink-0 transition-colors duration-500",
                            isRunning && cfg.iconColor,
                            isDone && "text-emerald-400",
                            !isRunning && !isDone && "text-white/25"
                          )} />
                          <span className={cn(
                            "text-[9px] font-semibold transition-colors duration-500 flex-1 truncate",
                            isRunning && "text-white",
                            isDone && "text-white/70",
                            !isRunning && !isDone && "text-white/35"
                          )}>
                            {cfg.name}
                          </span>
                          {/* Status indicator */}
                          {isRunning && (
                            <div className={cn("w-2.5 h-2.5 border rounded-full animate-spin shrink-0", cfg.spinnerClass)} />
                          )}
                          {isDone && <Check className="h-2.5 w-2.5 text-emerald-400 shrink-0" />}
                          {!isRunning && !isDone && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white/15 shrink-0" />
                          )}
                        </div>
                        <div className={cn(
                          "text-[8px] pl-4 mt-0.5 leading-tight transition-all duration-500 whitespace-nowrap overflow-hidden",
                          isRunning && "text-white/65",
                          isDone && "text-white/45",
                          !isRunning && !isDone && "text-white/25"
                        )}>
                          {subText}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Graph area ── */}
          <div className="flex-1 relative overflow-hidden">
            {/* Dot grid background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />

            {/* SVG edges — 불투명 노드 뒤로 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.25)" />
                </marker>
                <marker id="arrow-danger" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
              </defs>
              {edges.map(([from, to]) => {
                const n1 = nodes.find((n) => n.id === from)!
                const n2 = nodes.find((n) => n.id === to)!
                const edgeId = `${from}-${to}`
                const isPath = showResult && traversalPath.has(edgeId)

                // 라인 단축 — 노드 경계 안쪽으로 들어가지 않게, 화살표 공간 확보
                const dx = n2.x - n1.x
                const dy = n2.y - n1.y
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                const ux = dx / len
                const uy = dy / len
                const startPad = 5        // 시작 노드에서 떨어뜨리는 정도 (%)
                const endPad = isPath ? 8 : 7   // 화살표 공간, 빨강은 마커 더 커서 약간 더 짧게
                const x1 = n1.x + ux * startPad
                const y1 = n1.y + uy * startPad
                const x2 = n2.x - ux * endPad
                const y2 = n2.y - uy * endPad

                return (
                  <line
                    key={edgeId}
                    x1={`${x1}%`} y1={`${y1}%`}
                    x2={`${x2}%`} y2={`${y2}%`}
                    stroke={isPath ? "#ef4444" : "rgba(255,255,255,0.15)"}
                    strokeWidth={isPath ? 2 : 1}
                    strokeDasharray={isPath ? "4 2" : undefined}
                    markerEnd={`url(#${isPath ? "arrow-danger" : "arrow-default"})`}
                    className={cn("transition-all duration-700", isPath && "animate-pulse")}
                  />
                )
              })}
            </svg>

            {/* Nodes — 얕은 네온: 불투명 dark fill + 네온 border/glow */}
            {nodes.map((n) => {
              const isRoot = showResult && n.id === rootCauseId
              const isMastered = ["1", "2", "3"].includes(n.id)
              return (
                <div
                  key={n.id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-[9px] font-semibold border-2 transition-all duration-700 whitespace-nowrap z-[1]",
                    isRoot && "bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.55)] scale-110 animate-pulse z-10",
                    !isRoot && isMastered && "bg-slate-900 border-cyan-400/70 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.22)]",
                    !isRoot && !isMastered && "bg-slate-900 border-indigo-400/50 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.15)]"
                  )}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                >
                  {isMastered && !isRoot && <Check className="h-2 w-2 inline mr-0.5" />}
                  {isRoot && <AlertTriangle className="h-2 w-2 inline mr-0.5" />}
                  {n.label}
                </div>
              )
            })}

            {/* Top-right status card */}
            <div className="absolute top-3 right-3 transition-all duration-500">
              {phase === 0 && (
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-white/60 text-[9px]">준비 완료</span>
                </div>
              )}
              {phase === 1 && (
                <div className="bg-primary/10 backdrop-blur border border-primary/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 min-w-[140px]">
                  <Bot className="h-2.5 w-2.5 text-primary" />
                  <span className="text-primary text-[9px] font-medium">Proposer 추론 중...</span>
                </div>
              )}
              {showResult && (
                <div className="bg-red-500/10 backdrop-blur border border-red-500/30 rounded-lg px-2.5 py-1.5 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 text-red-400" />
                    <span className="text-red-300 text-[9px] font-semibold">근본 원인 발견</span>
                  </div>
                  <div className="text-white text-[10px] font-bold">행렬식</div>
                  <div className="text-white/50 text-[8px]">확신도 89%</div>
                </div>
              )}
            </div>

            {/* Verifier agent trace popup */}
            {showVerifier && (
              <div className="absolute bottom-3 left-3 bg-blue-500/10 backdrop-blur border border-blue-500/30 rounded-lg px-3 py-2 max-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="h-2.5 w-2.5 text-blue-400" />
                  <span className="text-blue-300 text-[9px] font-semibold">Verifier · 동의</span>
                </div>
                <p className="text-white/60 text-[9px] leading-tight">
                  행렬식 결손이 가장 근본적 원인으로 확인됨
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-t border-white/5">
          <div className="flex items-center gap-2 text-[9px] text-white/40">
            <span className="flex items-center gap-1">
              <Zap className="h-2 w-2 text-primary" />
              Harness
            </span>
            <span>·</span>
            <span className="font-mono tabular-nums text-white/50">{PHASE_TOKENS[phase]} tokens</span>
            <span>·</span>
            <span className="font-mono tabular-nums text-white/50">{PHASE_LATENCY[phase].toFixed(1)}s</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/40">
            <div className={cn(
              "w-1 h-1 rounded-full transition-colors duration-300",
              phase === 0 && "bg-white/30",
              phase > 0 && phase < 3 && "bg-amber-400 animate-pulse",
              phase === 3 && "bg-emerald-500"
            )} />
            {phase === 0 ? "대기" : phase < 3 ? "처리 중" : "완료"}
          </div>
        </div>
      </div>

      {/* Stepper — 중앙 정렬, idle에서도 각 스텝 명확 */}
      <div className="mt-8 flex justify-center">
        <div className="flex items-start w-full max-w-md px-4">
          {([
            { num: 1, label: "대기" },
            { num: 2, label: "분석" },
            { num: 3, label: "탐지" },
            { num: 4, label: "검증" },
          ] as const).map((step, i, arr) => {
            const isActive = phase === i
            const isPast = phase > i
            return (
              <Fragment key={i}>
                {/* Circle + label (고정 너비) */}
                <div className="flex flex-col items-center gap-2 shrink-0 w-14">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all duration-500",
                      isActive &&
                        "bg-primary border-primary text-primary-foreground shadow-[0_0_16px_rgba(168,85,247,0.6)] scale-110",
                      isPast &&
                        "bg-primary/25 border-primary/70 text-primary",
                      !isActive && !isPast &&
                        "bg-slate-900 border-white/25 text-white/50"
                    )}
                  >
                    {isPast ? <Check className="h-3.5 w-3.5" /> : step.num}
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={cn(
                        "text-[10px] font-semibold transition-colors",
                        isActive && "text-primary",
                        isPast && "text-primary/70",
                        !isActive && !isPast && "text-white/40"
                      )}
                    >
                      Step {step.num}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] transition-colors whitespace-nowrap",
                        isActive && "text-white",
                        isPast && "text-white/60",
                        !isActive && !isPast && "text-white/30"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
                {/* Connector line (마지막 스텝 뒤엔 없음) */}
                {i < arr.length - 1 && (
                  <div className="flex-1 h-[2px] mt-[15px] mx-1 rounded-full overflow-hidden bg-white/10">
                    <div
                      className={cn(
                        "h-full bg-primary/70 transition-all duration-700",
                        isPast ? "w-full" : "w-0"
                      )}
                    />
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Simple Carousel Component (arrows + dots only) ──
function SubjectCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const totalItems = subjects.length
  const visibleCount = 5

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalItems)
  }

  const getCardStyle = (index: number) => {
    let diff = index - currentIndex
    if (diff > totalItems / 2) diff -= totalItems
    if (diff < -totalItems / 2) diff += totalItems

    const absPos = Math.abs(diff)
    const isVisible = absPos <= Math.floor(visibleCount / 2)

    if (!isVisible) {
      return {
        transform: `translateX(${diff * 100}%) scale(0.5) rotateY(${diff * 15}deg)`,
        opacity: 0,
        zIndex: 0,
        pointerEvents: "none" as const,
      }
    }

    const scale = 1 - absPos * 0.15
    const translateX = diff * 130
    const translateZ = -absPos * 80
    const rotateY = diff * -10
    const opacity = 1 - absPos * 0.25

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex: visibleCount - absPos,
      pointerEvents: absPos === 0 ? ("auto" as const) : ("none" as const),
    }
  }

  return (
      <div className="relative w-full py-16">
        {/* 3D Carousel Container */}
        <div
            className="relative h-56 w-full select-none"
            style={{ perspective: "1200px" }}
        >
          <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
            {subjects.map((subject, index) => {
              const colors = SUBJECT_COLORS[subject.color]
              const Icon = subject.icon
              return (
                <div
                    key={subject.label}
                    className={cn(
                        "absolute w-56 h-40 rounded-2xl p-5 transition-all duration-500 ease-out overflow-hidden",
                        "bg-card border",
                        colors.cardBorder,
                        "shadow-xl",
                        index === currentIndex && "ring-2 ring-primary/50"
                    )}
                    style={getCardStyle(index)}
                >
                  {/* Watermark icon — 배경 대형 아이콘 */}
                  <Icon
                    className={cn(
                      "absolute -bottom-4 -right-4 h-24 w-24 pointer-events-none",
                      colors.watermark
                    )}
                    strokeWidth={1.5}
                  />

                  {/* Top-right icon — 컨테이너 없이 아이콘만 */}
                  <Icon
                    className={cn("absolute top-4 right-4 h-6 w-6", colors.iconColor)}
                    strokeWidth={2.5}
                  />

                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-between pr-10">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1 leading-tight">{subject.label}</h3>
                      <p className="text-xs text-muted-foreground leading-snug">{subject.desc}</p>
                    </div>
                    {/* Hashtags — 탐색하기 대신 주제 1-2개 */}
                    <div className="flex flex-wrap gap-1.5">
                      {subject.desc
                        .split(",")
                        .slice(0, 2)
                        .map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/50 border border-border",
                              colors.linkColor
                            )}
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Navigation - Arrows + Dots only */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
              onClick={handlePrev}
              className="p-3 rounded-full border border-border hover:bg-muted hover:border-primary/30 transition-all"
              aria-label="이전"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Dots indicator */}
          <div className="flex gap-1.5">
            {subjects.map((_, index) => (
                <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        index === currentIndex
                            ? "bg-primary w-6"
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                    )}
                    aria-label={`슬라이드 ${index + 1}`}
                />
            ))}
          </div>

          <button
              onClick={handleNext}
              className="p-3 rounded-full border border-border hover:bg-muted hover:border-primary/30 transition-all"
              aria-label="다음"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
  )
}

// ── Roadmap Section Component with Scroll Animation ──
function RoadmapSection() {
  const { containerRef, progress, activeNodes, fadingNodes } = useRoadmapProgress(capabilities.length)
  const titleRef = useReveal()

  return (
      <section id="features" className="py-24 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div
              ref={titleRef.ref}
              className={cn(
                  "text-center mb-20 transition-all duration-700",
                  titleRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              학습의 새로운 방식
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              학습 격차를 찾고 효과적으로 메우는 4단계 과정
            </p>
          </div>

          {/* Roadmap with scroll-based lighting */}
          <div ref={containerRef} className="relative">
            {/* Background line (gray) */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border hidden md:block" />

            {/* Progress line (animated, primary color) */}
            <div
                className="absolute left-8 top-8 w-0.5 bg-gradient-to-b from-primary via-primary to-primary/50 hidden md:block transition-all duration-300 ease-out"
                style={{
                  height: `calc(${Math.min(progress * 100, 100)}% - 64px)`,
                  boxShadow: progress > 0 ? '0 0 12px var(--primary), 0 0 24px var(--primary)' : 'none'
                }}
            />

            <div className="space-y-12">
              {capabilities.map((cap, i) => {
                const Icon = cap.icon
                const isActive = activeNodes[i]
                const isFading = fadingNodes[i]

                return (
                    <div
                        key={cap.title}
                        className={cn(
                            "relative flex gap-8 items-start transition-all duration-500",
                            titleRef.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                        )}
                        style={{ transitionDelay: `${i * 100}ms` }}
                    >
                      {/* Node circle with light-up effect */}
                      <div className="relative z-10 flex-shrink-0">
                        {/* Glow effect when active */}
                        <div
                            className={cn(
                                "absolute inset-0 rounded-full transition-all duration-500",
                                isActive && "animate-ping-once"
                            )}
                            style={{
                              background: isActive ? 'var(--primary)' : 'transparent',
                              opacity: isActive ? 0.3 : 0,
                              transform: isActive ? 'scale(1.5)' : 'scale(1)',
                              filter: isActive ? 'blur(8px)' : 'none'
                            }}
                        />

                        {/* Main node circle - WHITE background to cover line */}
                        <div
                            className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                isActive
                                    ? "bg-primary border-primary shadow-lg shadow-primary/40"
                                    : isFading
                                        ? "bg-card border-primary/50 animate-flicker"
                                        : "bg-card border-border"
                            )}
                        >
                          <Icon
                              className={cn(
                                  "h-7 w-7 transition-all duration-500",
                                  isActive
                                      ? "text-primary-foreground scale-110"
                                      : "text-muted-foreground"
                              )}
                          />
                        </div>

                        {/* Step number badge */}
                        <div
                            className={cn(
                                "absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-500",
                                isActive
                                    ? "bg-white text-primary shadow-lg"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                          {cap.step}
                        </div>
                      </div>

                      {/* Content card */}
                      <div
                          className={cn(
                              "flex-1 bg-card border rounded-2xl p-6 transition-all duration-500 group",
                              isActive
                                  ? "border-primary/50 shadow-lg shadow-primary/10"
                                  : "border-border hover:border-primary/30"
                          )}
                      >
                        <h3
                            className={cn(
                                "text-xl font-bold mb-2 transition-colors duration-500",
                                isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                            )}
                        >
                          {cap.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {cap.desc}
                        </p>
                      </div>
                    </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
  )
}

// ── Main Landing Page ──
export default function LandingPage() {
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [heroTextVisible, setHeroTextVisible] = useState(false)
  const demoRef = useReveal()
  const subjectsRef = useReveal()
  const ctaRef = useReveal()

  // RT-2 style hero animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => setHeroLoaded(true), 300)
    const timer2 = setTimeout(() => setHeroTextVisible(true), 800)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        {/* ── Navbar ── */}
        <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-1.5 bg-gradient-to-br from-primary to-primary/70 rounded-lg shadow-lg shadow-primary/20 group-hover:shadow-xl transition-all">
                <BrainCircuit className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">Linker</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                  href="/login"
                  className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5"
              >
                로그인
              </Link>
              <Link
                  href="/signup"
                  className="text-sm bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-white/90 transition-all"
              >
                무료 시작
              </Link>
            </div>
          </div>
        </nav>

        {/* ── RT-2 Style Full-Screen Hero with Video Background ── */}
        <section className="relative h-screen w-full overflow-hidden">
          {/* Video Background (placeholder - dark gradient for now) */}
          <div
              className={cn(
                  "absolute inset-0 transition-opacity duration-1000",
                  heroLoaded ? "opacity-100" : "opacity-0"
              )}
          >
            {/* Hero background video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                suppressHydrationWarning
                className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/hero_thumbnale.mp4" type="video/mp4" />
            </video>

            {/* Gradient overlay for video placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-primary/30" />

            {/* Animated grid pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <pattern id="heroGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#heroGrid)" />
              </svg>
            </div>

            {/* Floating animated orbs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "4s" }} />
            <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "5s", animationDelay: "2s" }} />

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white/30"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: `${(i * 53) % 100}%`,
                    animation: `float ${8 + (i % 4)}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Hero Content - RT-2 style fade in */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
            <div
                className={cn(
                    "max-w-4xl mx-auto transition-all duration-1000 ease-out",
                    heroTextVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-12"
                )}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-none mb-6 text-white">
                <span className="block">오답의</span>
                <span className="block bg-gradient-to-r from-primary via-primary/80 to-white bg-clip-text text-transparent">
                근본 원인을 찾습니다
              </span>
              </h1>

              <p
                  className={cn(
                      "text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10 transition-all duration-1000 delay-300",
                      heroTextVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
              >
                AI 지식 그래프로 학습 격차를 근본 원인까지 추적합니다.
                표면적 실수가 아닌, 진짜 부족한 개념을 찾아드립니다.
              </p>

              <div
                  className={cn(
                      "flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-500",
                      heroTextVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
              >
                <Link
                    href="/signup"
                    className="group flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold shadow-2xl hover:shadow-white/20 transition-all hover:scale-105"
                >
                  무료로 시작하기 <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                    href="#demo"
                    className="flex items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-all"
                >
                  <Play className="h-4 w-4" />
                  데모 보기
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div
              className={cn(
                  "absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 transition-all duration-1000 delay-700",
                  heroTextVisible ? "opacity-100" : "opacity-0"
              )}
          >
            <span className="text-xs tracking-widest uppercase">스크롤</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </div>
        </section>

        {/* ── Demo Video Section ── */}
        <section id="demo" className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div
                ref={demoRef.ref}
                className={cn(
                    "transition-all duration-700",
                    demoRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                  직접 확인하세요
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  학생은 어떻게 배우고, 선생님은 어떻게 가르치는지 바꿉니다.
                </p>
              </div>

              {/* Demo cards — 2-column cinematic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 max-w-5xl mx-auto">
                {demoAreas.map((demo, i) => (
                    <div
                        key={demo.title}
                        className={cn(
                            "group relative rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-500 cursor-pointer aspect-video bg-muted",
                            demoRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                        )}
                        style={{ transitionDelay: `${i * 120}ms` }}
                    >
                      {/* Video background */}
                      <video
                          src={demo.videoSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          suppressHydrationWarning
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/5" />

                      {/* Primary hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Content */}
                      <div className="relative z-10 h-full flex flex-col justify-between p-6">
                        {/* Badge top */}
                        <span className="inline-flex items-center self-start text-[10px] font-semibold text-white bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider">
                          {demo.badge}
                        </span>

                        {/* Text bottom */}
                        <div className="space-y-1.5">
                          <h3 className="text-2xl font-bold text-white leading-tight">
                            {demo.title}
                          </h3>
                          <p className="text-sm text-white/75 leading-snug max-w-sm">
                            {demo.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                ))}
              </div>

              {/* Main live demo mockup */}
              <LinkerDemoMockup />
            </div>
          </div>
        </section>

        {/* ── Features Section - Roadmap Style with Scroll Animation ── */}
        <RoadmapSection />

        {/* ── Subjects Gallery - 3D Carousel ── */}
        <section className="py-24 px-6 bg-background overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div
                ref={subjectsRef.ref}
                className={cn(
                    "text-center mb-8 transition-all duration-700",
                    subjectsRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
            >
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                모든 과목 지원
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                수학, 과학, 공학 전 분야에 걸쳐 개인화된 지식 그래프를 생성합니다.
              </p>
            </div>

            <SubjectCarousel />
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-32 px-6 bg-gradient-to-br from-primary/95 to-primary">
          <div
              ref={ctaRef.ref}
              className={cn(
                  "max-w-3xl mx-auto text-center transition-all duration-700",
                  ctaRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-primary-foreground tracking-tight mb-6">
              학습의 변화를 시작하세요
            </h2>
            <p className="text-primary-foreground/90 text-lg mb-12 max-w-xl mx-auto">
              이미 많은 교육자와 학생들이 표면적 증상이 아닌 근본 원인을 찾고 있습니다.
            </p>
            <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white text-primary px-10 py-4 rounded-full font-bold text-base hover:bg-white/90 shadow-2xl transition-all hover:scale-105"
            >
              무료로 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Minimal Footer ── */}
        <footer className="border-t border-border py-8 px-6 bg-muted/20">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <BrainCircuit className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Linker</span>
            </Link>
            <p className="text-xs text-muted-foreground">
              © 2026 Linker. AI 기반 지식 그래프 학습 플랫폼.
            </p>
          </div>
        </footer>
      </div>
  )
}
