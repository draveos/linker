"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, BrainCircuit, BookOpen, ChevronRight, Trash2, BarChart2,
  Clock, LogOut, Sparkles, Send, RotateCcw, AlertTriangle,
  X, FileText, Network, GraduationCap, ArrowRight,
  Grid3x3, TrendingUp, GitBranch, BarChart3, Atom, FlaskConical, Dna, Cpu, Terminal, Database, Brain,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getAllGraphs, moveToTrash, setActiveGraphId, getRecentlyViewed,
  getTrash, restoreFromTrash, emptyTrash, createGraph,
  type SavedGraph, type TrashItem,
} from "@/lib/graph-store"
import type { ContextMessage, ValidateContextResponse } from "@/app/api/validate-context/route"
import type { GenerateGraphResponse } from "@/app/api/generate-graph/route"
import { MAX_CONTEXT_QUESTIONS as MAX_QUESTIONS } from "@/lib/constants"

// ── Helpers ────────────────────────────────────────────────────

function mastery(graph: SavedGraph) {
  if (graph.nodes.length === 0) return 0
  return Math.round((graph.masteredNodeIds.length / graph.nodes.length) * 100)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "방금 전"
  if (m < 60) return `${m}분 전`
  if (h < 24) return `${h}시간 전`
  return `${d}일 전`
}

function trashDaysLeft(deletedAt: string) {
  const ms = 7 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(deletedAt).getTime())
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

// ── Domain → icon + color theme ────────────────────────────────
// Tailwind 동적 클래스 방지를 위해 lookup 테이블

type ThemeKey = "blue" | "purple" | "orange" | "pink" | "cyan" | "emerald" | "rose" | "amber" | "fuchsia" | "teal"

const THEMES: Record<ThemeKey, {
  gradient: string   // 카드 상단 그라데이션 배경
  heroGradient: string  // Continue 카드용 더 진한 그라데이션
  icon: string       // 아이콘 색
  bar: string        // 프로그레스 바 색
  ring: string       // mastery ring stroke
}> = {
  blue:    { gradient: "from-blue-500/15 via-blue-500/5 to-transparent",       heroGradient: "from-blue-500/20 via-sky-500/10 to-transparent",       icon: "text-blue-500",    bar: "bg-blue-500",    ring: "text-blue-500" },
  purple:  { gradient: "from-purple-500/15 via-purple-500/5 to-transparent",   heroGradient: "from-purple-500/20 via-fuchsia-500/10 to-transparent", icon: "text-purple-500",  bar: "bg-purple-500",  ring: "text-purple-500" },
  orange:  { gradient: "from-orange-500/15 via-orange-500/5 to-transparent",   heroGradient: "from-orange-500/20 via-amber-500/10 to-transparent",   icon: "text-orange-500",  bar: "bg-orange-500",  ring: "text-orange-500" },
  pink:    { gradient: "from-pink-500/15 via-pink-500/5 to-transparent",       heroGradient: "from-pink-500/20 via-rose-500/10 to-transparent",     icon: "text-pink-500",    bar: "bg-pink-500",    ring: "text-pink-500" },
  cyan:    { gradient: "from-cyan-500/15 via-cyan-500/5 to-transparent",       heroGradient: "from-cyan-500/20 via-sky-500/10 to-transparent",       icon: "text-cyan-500",    bar: "bg-cyan-500",    ring: "text-cyan-500" },
  emerald: { gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent", heroGradient: "from-emerald-500/20 via-green-500/10 to-transparent",  icon: "text-emerald-500", bar: "bg-emerald-500", ring: "text-emerald-500" },
  rose:    { gradient: "from-rose-500/15 via-rose-500/5 to-transparent",       heroGradient: "from-rose-500/20 via-pink-500/10 to-transparent",      icon: "text-rose-500",    bar: "bg-rose-500",    ring: "text-rose-500" },
  amber:   { gradient: "from-amber-500/15 via-amber-500/5 to-transparent",     heroGradient: "from-amber-500/20 via-yellow-500/10 to-transparent",   icon: "text-amber-600",   bar: "bg-amber-500",   ring: "text-amber-500" },
  fuchsia: { gradient: "from-fuchsia-500/15 via-fuchsia-500/5 to-transparent", heroGradient: "from-fuchsia-500/20 via-purple-500/10 to-transparent", icon: "text-fuchsia-500", bar: "bg-fuchsia-500", ring: "text-fuchsia-500" },
  teal:    { gradient: "from-teal-500/15 via-teal-500/5 to-transparent",       heroGradient: "from-teal-500/20 via-cyan-500/10 to-transparent",      icon: "text-teal-500",    bar: "bg-teal-500",    ring: "text-teal-500" },
}

function getDomainStyle(domain: string): { icon: LucideIcon; theme: ThemeKey } {
  const d = domain.toLowerCase()
  if (d.includes("선형") || d.includes("대수") || d.includes("벡터") || d.includes("행렬")) return { icon: Grid3x3, theme: "blue" }
  if (d.includes("미적") || d.includes("해석")) return { icon: TrendingUp, theme: "purple" }
  if (d.includes("알고리") || d.includes("자료구조")) return { icon: GitBranch, theme: "orange" }
  if (d.includes("확률") || d.includes("통계")) return { icon: BarChart3, theme: "pink" }
  if (d.includes("물리")) return { icon: Atom, theme: "cyan" }
  if (d.includes("화학")) return { icon: FlaskConical, theme: "emerald" }
  if (d.includes("생물")) return { icon: Dna, theme: "emerald" }
  if (d.includes("머신") || d.includes("ai") || d.includes("딥")) return { icon: Brain, theme: "fuchsia" }
  if (d.includes("컴퓨터 구조") || d.includes("아키텍처")) return { icon: Cpu, theme: "rose" }
  if (d.includes("운영체제") || d.includes("os") || d.includes("리눅스")) return { icon: Terminal, theme: "amber" }
  if (d.includes("데이터베이스") || d.includes("sql")) return { icon: Database, theme: "amber" }
  if (d.includes("네트워크")) return { icon: Network, theme: "teal" }
  return { icon: BookOpen, theme: "purple" }   // fallback
}

// ── Mastery Ring (원형 진도 게이지) ─────────────────────────────

function MasteryRing({
  percentage,
  className,
  strokeWidth = 6,
}: {
  percentage: number
  className?: string
  strokeWidth?: number
}) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percentage))
  const offset = circumference - (clamped / 100) * circumference
  return (
    <svg className={className} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.15" />
      <circle
        cx="50" cy="50" r={radius}
        fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  )
}

// ── Graph Generate Modal ───────────────────────────────────────

interface GenerateModalProps {
  onClose: () => void
  onDone: (graphId: string) => void
}

function GenerateModal({ onClose, onDone }: GenerateModalProps) {
  const [domain, setDomain] = useState("")
  const [lectureText, setLectureText] = useState("")
  const [showChat, setShowChat] = useState(false)
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([])
  const [contextInput, setContextInput] = useState("")
  const [questionCount, setQuestionCount] = useState(0)
  const [isValidating, setIsValidating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [contextWarning, setContextWarning] = useState<"irrelevant" | "off_topic" | null>(null)
  const [pendingContext, setPendingContext] = useState<string | null>(null)
  const [toastProgress, setToastProgress] = useState(0)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [contextMessages, isValidating])

  const generateGraph = useCallback(async (enrichedContext: string, dom: string) => {
    setIsGenerating(true)
    setToastProgress(0)
    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 10 + 3
      if (p >= 90) { p = 90; clearInterval(progressRef.current) }
      setToastProgress(p)
    }, 250)
    try {
      const res = await fetch("/api/generate-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureText: enrichedContext, domain: dom }),
      })
      if (!res.ok) throw new Error("그래프 생성 실패")
      const result: GenerateGraphResponse = await res.json()
      clearInterval(progressRef.current)
      setToastProgress(100)
      await new Promise((r) => setTimeout(r, 400))
      const graph = createGraph(result.domain, result.nodes)
      onDone(graph.id)
    } catch {
      clearInterval(progressRef.current)
      setIsGenerating(false)
    }
  }, [onDone])

  const buildEnrichedContext = (history: ContextMessage[]) => {
    const qa: string[] = []
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].role === "ai" && history[i + 1].role === "user") {
        qa.push(`Q: ${history[i].content}\nA: ${history[i + 1].content}`)
      }
    }
    return [`도메인: ${domain || "일반"}`, `내용: ${lectureText}`, ...(qa.length ? [`보충 정보:\n${qa.join("\n\n")}`] : [])].join("\n")
  }

  const validateAndAsk = async (history: ContextMessage[], count: number, force = false) => {
    if (force) {
      await generateGraph(buildEnrichedContext(history), domain || "일반")
      return
    }
    setIsValidating(true)
    try {
      const res = await fetch("/api/validate-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain || "일반", originalText: lectureText, conversationHistory: history, questionCount: count }),
      })
      const data: ValidateContextResponse = await res.json()
      if (data.status === "sufficient" && data.enrichedContext) {
        await generateGraph(data.enrichedContext, domain || "일반")
      } else if (data.status === "needs_more" && data.question) {
        setContextMessages((prev) => [...prev, { role: "ai", content: data.question! }])
        setQuestionCount(count + 1)
        setContextWarning(null)
      } else if (data.status === "irrelevant" || data.status === "off_topic") {
        setContextWarning(data.status)
        setPendingContext(buildEnrichedContext(history))
      }
    } catch {
      await generateGraph(lectureText, domain || "일반")
    } finally {
      setIsValidating(false)
    }
  }

  const handleStart = async () => {
    if (lectureText.length >= 100) {
      await generateGraph(lectureText, domain || "일반")
      return
    }
    setShowChat(true)
    await validateAndAsk([], 0)
  }

  const handleAnswer = async () => {
    if (!contextInput.trim()) return
    const userMsg: ContextMessage = { role: "user", content: contextInput.trim() }
    const newHistory = [...contextMessages, userMsg]
    setContextMessages(newHistory)
    setContextInput("")
    await validateAndAsk(newHistory, questionCount)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">새 지식 그래프 생성</h2>
          </div>
          <button onClick={onClose} disabled={isGenerating} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isGenerating ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-sm font-medium text-foreground">지식 그래프 생성 중...</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${toastProgress}%` }}
                />
              </div>
            </div>
          ) : !showChat ? (
            <>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">도메인 / 과목명</label>
                <input
                  type="text"
                  placeholder="예: 선형대수학, 파이썬 기초, 자료구조..."
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">강의 내용 / 학습 주제</label>
                <textarea
                  placeholder="짧아도 괜찮아요. 예: '파이썬 함수와 클래스 기초'"
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 resize-none"
                  rows={4}
                  value={lectureText}
                  onChange={(e) => setLectureText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  100자 미만이면 AI가 추가 질문을 드릴 수 있어요
                </p>
              </div>
              <button
                onClick={handleStart}
                disabled={!lectureText.trim()}
                className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 transition-all"
              >
                <FileText className="h-4 w-4" />
                지식 그래프 생성
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">내용 보충</h3>
                  <p className="text-xs text-muted-foreground">질문 {Math.min(questionCount, MAX_QUESTIONS)}/{MAX_QUESTIONS}</p>
                </div>
                <button onClick={() => { setShowChat(false); setContextMessages([]); setQuestionCount(0); setContextWarning(null) }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground text-xs px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">{lectureText}</div>
                </div>
                {contextMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("text-xs px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed", msg.role === "ai" ? "bg-muted text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm")}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isValidating && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground text-xs px-3 py-2 rounded-2xl rounded-tl-sm flex gap-1">
                      <span className="animate-bounce">·</span>
                      <span className="animate-bounce [animation-delay:0.1s]">·</span>
                      <span className="animate-bounce [animation-delay:0.2s]">·</span>
                    </div>
                  </div>
                )}
                {contextWarning && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        {contextWarning === "irrelevant" ? "현재 도메인과 다소 동떨어진 내용이에요. 계속하시겠어요?" : "완전히 다른 주제로 보입니다. 그래도 생성하시겠어요?"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setContextWarning(null); setPendingContext(null) }} className="flex-1 h-7 text-xs border border-border rounded-lg hover:bg-muted transition-colors">아니오</button>
                      <button onClick={() => { if (pendingContext) { generateGraph(pendingContext, domain || "일반") } }} className="flex-1 h-7 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        {contextWarning === "irrelevant" ? "예" : "그래도 생성"}
                      </button>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {!contextWarning && !isValidating && questionCount > 0 && questionCount <= MAX_QUESTIONS && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="답변 입력..."
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
                  />
                  <button
                    onClick={handleAnswer}
                    disabled={!contextInput.trim()}
                    className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {questionCount >= MAX_QUESTIONS && !contextWarning && !isValidating && (
                <button
                  onClick={() => validateAndAsk(contextMessages, questionCount, true)}
                  className="w-full h-10 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  지금까지 내용으로 생성하기
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Home Page ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [graphs, setGraphs] = useState<SavedGraph[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<SavedGraph[]>([])
  const [trash, setTrash] = useState<TrashItem[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [fading, setFading] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

  const refresh = useCallback(() => {
    const all = getAllGraphs().sort((a, b) => {
      if (a.isTutorial && !b.isTutorial) return -1
      if (!a.isTutorial && b.isTutorial) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
    setGraphs(all)
    setRecentlyViewed(getRecentlyViewed(3))
    setTrash(getTrash())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleOpenGraph = (graph: SavedGraph) => {
    setActiveGraphId(graph.id)
    setFading(true)
    setTimeout(() => router.push("/learn"), 300)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    moveToTrash(id)
    refresh()
  }

  const handleRestore = (id: string) => {
    restoreFromTrash(id)
    refresh()
  }

  const handleEmptyTrash = () => {
    emptyTrash()
    refresh()
  }

  const handleGenerateDone = (graphId: string) => {
    setActiveGraphId(graphId)
    setFading(true)
    setTimeout(() => router.push("/learn"), 300)
  }

  const handleLogout = () => {
    setFading(true)
    setTimeout(() => router.push("/"), 300)
  }

  const totalConcepts = graphs.reduce((s, g) => s + g.nodes.length, 0)
  const totalAnalyses = graphs.reduce((s, g) => s + g.analysisCount, 0)
  const continueGraph = recentlyViewed[0] ?? graphs[0] ?? null

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground relative transition-opacity duration-300",
        "animate-in fade-in duration-500",
        fading ? "opacity-0" : "opacity-100"
      )}
    >
      {/* ── Subtle ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.05] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[140px]" />
      </div>

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary rounded-lg shadow-md shadow-primary/20">
                <BrainCircuit className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">Linker</span>
            </div>

            <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground pl-6 border-l border-border">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" />
                <span><strong className="text-foreground font-semibold">{graphs.length}</strong> 그래프</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BarChart2 className="h-3 w-3" />
                <span><strong className="text-foreground font-semibold">{totalConcepts}</strong> 개념</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                <span><strong className="text-foreground font-semibold">{totalAnalyses}</strong> 분석</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md shadow-primary/20">
              U
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* ── Hero greeting ── */}
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">WORKSPACE</p>
          <h1 className="text-5xl font-black text-foreground tracking-tight leading-tight">
            반갑습니다!
          </h1>
          <p className="text-muted-foreground mt-3 text-base">
            {continueGraph
              ? "최근 학습을 이어가거나 새로운 그래프를 탐색해보세요."
              : "학습을 시작할 그래프를 선택하거나 새로 만들어보세요."}
          </p>
        </div>

        {/* ── Continue Learning Hero Card ── */}
        {continueGraph && (() => {
          const { icon: Icon, theme } = getDomainStyle(continueGraph.domain)
          const t = THEMES[theme]
          const m = mastery(continueGraph)
          return (
            <div
              onClick={() => handleOpenGraph(continueGraph)}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-md hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-500 cursor-pointer"
            >
              <div className="flex flex-col md:flex-row">
                {/* Left: decorative (gradient + ring + frosted center) */}
                <div className={cn(
                  "relative md:w-[38%] min-h-[280px] flex items-center justify-center p-8 bg-gradient-to-br",
                  t.heroGradient
                )}>
                  {/* Mastery ring with frosted center token */}
                  <div className="relative">
                    <MasteryRing
                      percentage={m}
                      className={cn("w-44 h-44", t.ring)}
                      strokeWidth={5}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Frosted inner circle — 입체감 */}
                      <div className="w-32 h-32 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/50 shadow-lg shadow-black/5 flex flex-col items-center justify-center">
                        <Icon className={cn("h-6 w-6 mb-0.5", t.icon)} strokeWidth={2} />
                        <p className="text-3xl font-black text-foreground leading-none">
                          {m}<span className="text-sm font-bold text-muted-foreground ml-0.5">%</span>
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">숙련도</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: info */}
                <div className="flex-1 p-8 flex flex-col justify-between min-h-[280px]">
                  <div>
                    <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      이어서 학습
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                      {continueGraph.domain}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {continueGraph.nodes.length}개 개념 · 마지막 학습 {timeAgo(continueGraph.lastViewedAt ?? continueGraph.updatedAt)}
                    </p>
                  </div>

                  {/* Mastery bar */}
                  <div className="space-y-1.5 my-6">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>학습 진도</span>
                      <span className="text-foreground font-bold">{m}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", t.bar)}
                        style={{ width: `${m}%` }}
                      />
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 text-sm text-primary font-semibold group-hover:gap-3 transition-all self-start">
                    <span>학습 이어가기</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── All Graphs Grid ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">모든 그래프</h2>
              <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full font-mono">
                {graphs.length}
              </span>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              새 그래프
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* New graph card */}
            <button
              onClick={() => setShowGenerateModal(true)}
              className="group min-h-[320px] rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card hover:bg-primary/[0.04] transition-all duration-300 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary"
            >
              <div className="w-14 h-14 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-center px-6">
                <p className="font-semibold text-base">새 그래프 생성</p>
                <p className="text-xs opacity-70 mt-1.5">강의 텍스트로 지식 그래프를 만드세요</p>
              </div>
            </button>

            {/* Graph cards */}
            {graphs.map((graph) => {
              const m = mastery(graph)
              const { icon: Icon, theme } = getDomainStyle(graph.domain)
              const t = THEMES[theme]
              return (
                <div
                  key={graph.id}
                  onClick={() => handleOpenGraph(graph)}
                  className={cn(
                    "group relative rounded-2xl border bg-card overflow-hidden cursor-pointer",
                    "hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                    graph.isTutorial
                      ? "border-primary/30 shadow-[0_0_30px_rgba(168,85,247,0.08)]"
                      : "border-border"
                  )}
                >
                  {/* Top: gradient + large icon */}
                  <div className={cn(
                    "relative h-44 flex items-center justify-center bg-gradient-to-br overflow-hidden",
                    t.gradient
                  )}>
                    {/* Decorative blur accent */}
                    <div className={cn(
                      "absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40",
                      t.bar
                    )} />

                    {/* Frosted circle backdrop + Big centered icon */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-24 h-24 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/50 shadow-lg shadow-black/5" />
                      <Icon
                        className={cn("relative h-14 w-14", t.icon)}
                        strokeWidth={1.75}
                      />
                    </div>

                    {/* Tutorial badge / Delete button */}
                    {graph.isTutorial ? (
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md shadow-primary/30">
                        <GraduationCap className="h-2.5 w-2.5" />
                        TUTORIAL
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDelete(graph.id, e)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-card/70 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Concept count badge */}
                    <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-card/70 backdrop-blur-md border border-border rounded-full px-2.5 py-1 text-[10px] text-foreground font-medium">
                      <BookOpen className="h-2.5 w-2.5" />
                      {graph.nodes.length}개 개념
                    </div>
                  </div>

                  {/* Bottom: info */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
                      {graph.domain}
                    </h3>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>숙련도</span>
                        <span className="text-foreground font-semibold">{m}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", t.bar)}
                          style={{ width: `${m}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo(graph.updatedAt)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                        <span>학습 시작</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Trash section (compact) ── */}
        <div className="pt-4">
          <button
            onClick={() => setShowTrash((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>휴지통</span>
            {trash.length > 0 && (
              <span className="bg-muted border border-border text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {trash.length}
              </span>
            )}
            <ChevronRight className={cn("h-3 w-3 transition-transform", showTrash && "rotate-90")} />
          </button>

          {showTrash && (
            <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                  최대 <strong>3개</strong>까지 보관 · 3개 초과 또는 <strong>7일</strong> 경과 시 자동 삭제
                </p>
              </div>

              {trash.length === 0 ? (
                <p className="text-[10px] text-muted-foreground py-1">휴지통이 비어있습니다.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {trash.map((item) => (
                      <div
                        key={item.graph.id}
                        className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{item.graph.domain}</p>
                          <p className="text-[9px] text-muted-foreground">
                            삭제됨 {timeAgo(item.deletedAt)} ·
                            <span className="text-amber-600 dark:text-amber-400"> {trashDaysLeft(item.deletedAt)}일 후 자동 삭제</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestore(item.graph.id)}
                          className="text-[10px] text-primary hover:underline font-medium shrink-0"
                        >
                          복원
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleEmptyTrash}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    휴지통 비우기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onDone={handleGenerateDone}
        />
      )}
    </div>
  )
}
