"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, BrainCircuit, BookOpen, ChevronRight, Trash2, BarChart2,
  Clock, LogOut, Eye, Sparkles, Send, RotateCcw, AlertTriangle,
  X, FileText, Network, GraduationCap,
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

const DOMAIN_COLORS: Record<string, string> = {
  "선형대수학": "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  "미적분학":   "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  "확률통계":   "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  "알고리즘":   "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  "물리학":    "from-rose-500/20 to-rose-600/10 border-rose-500/30",
}

function graphColor(domain: string) {
  for (const key of Object.keys(DOMAIN_COLORS)) {
    if (domain.includes(key)) return DOMAIN_COLORS[key]
  }
  return "from-primary/20 to-primary/10 border-primary/30"
}

// ── Graph Generate Modal ────────────────────────────────────────

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

    // 가짜 진행바
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
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
            /* 생성 중 진행바 */
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
            /* 입력 폼 */
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
            /* Context Q&A 채팅 */
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
    // 튜토리얼 그래프가 항상 맨 앞
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

  return (
    <div className={cn(
      "min-h-screen bg-background transition-opacity duration-300",
      fading ? "opacity-0" : "opacity-100"
    )}>
      {/* Top nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary rounded-lg shadow-md shadow-primary/20">
              <BrainCircuit className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Linker</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">U</div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">내 지식 그래프</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">그래프를 선택해 학습을 시작하거나 새로 생성하세요</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "총 그래프", value: graphs.length, icon: BookOpen },
            { label: "총 개념", value: graphs.reduce((s, g) => s + g.nodes.length, 0), icon: BarChart2 },
            { label: "분석 횟수", value: graphs.reduce((s, g) => s + g.analysisCount, 0), icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">최근에 열람</h2>
            </div>
            <div className="flex gap-3 flex-wrap">
              {recentlyViewed.map((graph) => (
                <button
                  key={graph.id}
                  onClick={() => handleOpenGraph(graph)}
                  className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0", graphColor(graph.domain).split(" ")[0])}>
                    <BookOpen className="h-3.5 w-3.5 text-foreground/60" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-tight">{graph.domain}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(graph.lastViewedAt ?? graph.updatedAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Graph Grid */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">모든 그래프</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* New graph card */}
            <button
              onClick={() => setShowGenerateModal(true)}
              className="group h-52 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary"
            >
              <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">새 그래프 생성</p>
                <p className="text-xs opacity-70 mt-0.5">강의 텍스트로 지식 그래프를 생성합니다</p>
              </div>
            </button>

            {graphs.map((graph) => {
              const m = mastery(graph)
              const color = graphColor(graph.domain)
              return (
                <div
                  key={graph.id}
                  onClick={() => handleOpenGraph(graph)}
                  className={cn(
                    "group relative h-52 rounded-2xl border bg-gradient-to-br cursor-pointer",
                    "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
                    graph.isTutorial && "ring-2 ring-primary/30",
                    color
                  )}
                >
                  {/* 삭제 버튼 — 튜토리얼은 숨김 */}
                  {!graph.isTutorial && (
                    <button
                      onClick={(e) => handleDelete(graph.id, e)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-background/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* 튜토리얼 보호 뱃지 */}
                  {graph.isTutorial && (
                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <GraduationCap className="h-2.5 w-2.5" />
                      TUTORIAL
                    </div>
                  )}

                  <div className="p-5 h-full flex flex-col">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1.5 bg-background/50 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-medium text-foreground mb-3">
                        <BookOpen className="h-3 w-3" />
                        {graph.nodes.length}개 개념
                      </div>
                      <h3 className="font-bold text-base text-foreground leading-tight">{graph.domain}</h3>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>숙련도</span>
                        <span className="font-medium text-foreground">{m}%</span>
                      </div>
                      <div className="h-1.5 bg-background/60 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />{timeAgo(graph.updatedAt)}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-primary font-medium group-hover:gap-2 transition-all">
                        학습 시작 <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trash section */}
        <div>
          <button
            onClick={() => setShowTrash((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3 group"
          >
            <Trash2 className="h-4 w-4" />
            휴지통
            {trash.length > 0 && (
              <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">{trash.length}</span>
            )}
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showTrash && "rotate-90")} />
          </button>

          {showTrash && (
            <div className="space-y-3">
              {/* Warning */}
              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  휴지통은 최대 <strong>3개</strong>까지 보관됩니다. 3개를 초과하거나 삭제 후 <strong>7일</strong>이 지나면 자동으로 삭제됩니다.
                </p>
              </div>

              {trash.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">휴지통이 비어있습니다.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {trash.map((item) => (
                      <div key={item.graph.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.graph.domain}</p>
                          <p className="text-[10px] text-muted-foreground">
                            삭제됨 {timeAgo(item.deletedAt)} · <span className="text-amber-500">{trashDaysLeft(item.deletedAt)}일 후 자동 삭제</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestore(item.graph.id)}
                          className="text-xs text-primary hover:underline font-medium shrink-0"
                        >
                          복원
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleEmptyTrash}
                    className="text-xs text-destructive hover:underline font-medium"
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
