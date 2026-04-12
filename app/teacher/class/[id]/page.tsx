"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BrainCircuit, ArrowLeft, Users, TrendingUp, AlertTriangle, Sparkles,
  Clock, BookOpen, LogOut, User, GraduationCap,
  Grid3x3, GitBranch, BarChart3, Atom, FlaskConical, Dna, Cpu, Terminal, Database, Brain, Network,
  Check, X, Send, Bell, Zap, Archive, RotateCcw, Eye,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { setUserRole, sendNotification, getGraph, retireGraph, unretireGraph, getLiveStudentRecords, setActiveGraphId, getQuizHistory, type SavedGraph, type LiveStudentRecord, type QuizAttempt } from "@/lib/graph-store"
import { getMockClass, TEACHER_INFO, type MockClass } from "@/lib/mock-classes"

// ── Domain theme map ──

type ThemeKey = "blue" | "purple" | "orange" | "pink" | "cyan" | "emerald" | "rose" | "amber" | "fuchsia" | "teal"

const THEMES: Record<ThemeKey, { heroGradient: string; icon: string; bar: string }> = {
  blue:    { heroGradient: "from-blue-500/20 via-sky-500/10 to-transparent",       icon: "text-blue-500",    bar: "bg-blue-500" },
  purple:  { heroGradient: "from-purple-500/20 via-fuchsia-500/10 to-transparent", icon: "text-purple-500",  bar: "bg-purple-500" },
  orange:  { heroGradient: "from-orange-500/20 via-amber-500/10 to-transparent",   icon: "text-orange-500",  bar: "bg-orange-500" },
  pink:    { heroGradient: "from-pink-500/20 via-rose-500/10 to-transparent",     icon: "text-pink-500",    bar: "bg-pink-500" },
  cyan:    { heroGradient: "from-cyan-500/20 via-sky-500/10 to-transparent",       icon: "text-cyan-500",    bar: "bg-cyan-500" },
  emerald: { heroGradient: "from-emerald-500/20 via-green-500/10 to-transparent",  icon: "text-emerald-500", bar: "bg-emerald-500" },
  rose:    { heroGradient: "from-rose-500/20 via-pink-500/10 to-transparent",      icon: "text-rose-500",    bar: "bg-rose-500" },
  amber:   { heroGradient: "from-amber-500/20 via-yellow-500/10 to-transparent",   icon: "text-amber-600",   bar: "bg-amber-500" },
  fuchsia: { heroGradient: "from-fuchsia-500/20 via-purple-500/10 to-transparent", icon: "text-fuchsia-500", bar: "bg-fuchsia-500" },
  teal:    { heroGradient: "from-teal-500/20 via-cyan-500/10 to-transparent",      icon: "text-teal-500",    bar: "bg-teal-500" },
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
  return { icon: BookOpen, theme: "purple" }
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

// ── Main ──

interface InterventionAction {
  id: "review" | "microlearning" | "alert"
  label: string
  description: string
  icon: LucideIcon
  color: "primary" | "emerald" | "amber"
  targetCount: number
}

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [fading, setFading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [studentSort, setStudentSort] = useState<"mastery-desc" | "mastery-asc" | "recent">("mastery-asc")

  // 실시간 약점 분포 (모의 — 주기적 업데이트)
  const [liveWeakPoints, setLiveWeakPoints] = useState<{ concept: string; strugglingCount: number }[]>([])
  const [updateTick, setUpdateTick] = useState(0)

  // AI 개입 액션
  const [pendingAction, setPendingAction] = useState<InterventionAction | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // 그래프 폐지
  const [linkedGraph, setLinkedGraph] = useState<SavedGraph | null>(null)
  const [pendingRetire, setPendingRetire] = useState<"retire" | "unretire" | null>(null)

  // 양방향 루프 — 학생 분석에서 도착한 라이브 결손 기록
  const [liveRecords, setLiveRecords] = useState<LiveStudentRecord[]>([])
  const [highlightedConcept, setHighlightedConcept] = useState<string | null>(null)

  // 교수용 퀴즈 팝업 + 학생 그래프 보기
  const [activeQuiz, setActiveQuiz] = useState<QuizAttempt | null>(null)
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([])
  const [showQuizPanel, setShowQuizPanel] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // cls는 client-only state — SSR에서는 localStorage 접근 불가
  const [cls, setCls] = useState<MockClass | undefined>(undefined)

  const refreshCls = useCallback(() => {
    setCls(getMockClass(id))
  }, [id])

  useEffect(() => {
    refreshCls()
  }, [refreshCls])

  // 다른 탭에서 라이브 기록/그래프/유저 학급 변경 → cls 재로드 (사용자 학급의 students 갱신용)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (
        e.key === "linker_live_records" ||
        e.key === "linker_graphs" ||
        e.key === "linker_user_classes"
      ) {
        refreshCls()
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [refreshCls])

  // 연결 그래프 로드
  useEffect(() => {
    if (!cls?.linkedGraphId) { setLinkedGraph(null); return }
    setLinkedGraph(getGraph(cls.linkedGraphId))
  }, [cls])

  // 다른 탭에서 그래프 상태가 바뀌면 즉시 반영
  useEffect(() => {
    if (!cls?.linkedGraphId) return
    const graphId = cls.linkedGraphId
    const handler = (e: StorageEvent) => {
      if (e.key === "linker_graphs") {
        setLinkedGraph(getGraph(graphId))
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [cls])

  // 퀴즈 기록 로드
  useEffect(() => {
    if (!cls?.linkedGraphId) return
    setQuizHistory(getQuizHistory(cls.linkedGraphId))
  }, [cls])

  // 라이브 결손 기록 + mock weak points 병합
  const recomputeWeakPoints = useCallback(() => {
    if (!cls) return
    const recs = cls.linkedGraphId ? getLiveStudentRecords(cls.linkedGraphId) : []
    setLiveRecords(recs)
    const grouped = new Map<string, number>()
    recs.forEach((r) => grouped.set(r.concept, (grouped.get(r.concept) ?? 0) + 1))

    const merged = cls.weakPoints.map((wp) => ({
      ...wp,
      strugglingCount: wp.strugglingCount + (grouped.get(wp.concept) ?? 0),
    }))
    grouped.forEach((count, concept) => {
      if (!merged.find((m) => m.concept === concept)) {
        merged.push({ concept, strugglingCount: count })
      }
    })
    merged.sort((a, b) => b.strugglingCount - a.strugglingCount)
    setLiveWeakPoints(merged)
    setUpdateTick((t) => t + 1)
  }, [cls])

  // 초기화 & mock 변동 (사용자 생성 학급은 fake 변동 비활성)
  useEffect(() => {
    if (!cls) return
    recomputeWeakPoints()
    const isUserCreated = cls.id.startsWith("user-class-")
    if (isUserCreated) return   // 진짜 데이터만 표시
    const interval = setInterval(() => {
      setLiveWeakPoints((prev) =>
        prev.map((w) => ({
          ...w,
          strugglingCount: Math.max(
            0,
            Math.min(
              cls.studentCount,
              w.strugglingCount + Math.floor(Math.random() * 3) - 1
            )
          ),
        }))
      )
      setUpdateTick((t) => t + 1)
    }, 7000)
    return () => clearInterval(interval)
  }, [cls, recomputeWeakPoints])

  // 다른 탭(학생 학습)에서 새 결손 기록 도착 → 즉시 반영 + 하이라이트
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== "linker_live_records") return
      const before = liveRecords.length
      const after = (cls?.linkedGraphId ? getLiveStudentRecords(cls.linkedGraphId) : []).length
      recomputeWeakPoints()
      if (after > before) {
        const newest = (cls?.linkedGraphId ? getLiveStudentRecords(cls.linkedGraphId) : [])[0]
        if (newest) {
          setHighlightedConcept(newest.concept)
          setTimeout(() => setHighlightedConcept(null), 4000)
        }
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [cls, liveRecords.length, recomputeWeakPoints])

  // Success toast auto-dismiss
  useEffect(() => {
    if (!successToast) return
    const t = setTimeout(() => setSuccessToast(null), 4000)
    return () => clearTimeout(t)
  }, [successToast])

  const confirmAction = () => {
    if (!pendingAction || !cls) return
    sendNotification({
      kind: "intervention",
      title: pendingAction.label,
      body: pendingAction.description,
      fromName: TEACHER_INFO.name,
      fromInstitution: TEACHER_INFO.affiliation,
      classId: cls.id,
      graphId: cls.linkedGraphId,
    })
    setSuccessToast(`${pendingAction.targetCount}명에게 ${pendingAction.label}을(를) 전송했습니다`)
    setPendingAction(null)
  }

  const confirmRetire = () => {
    if (!cls?.linkedGraphId || !pendingRetire) return
    if (pendingRetire === "retire") {
      retireGraph(cls.linkedGraphId)
      sendNotification({
        kind: "retire",
        title: `${cls.name} 그래프가 폐지되었습니다`,
        body: "강좌 종료에 따라 해당 그래프가 폐지 상태로 전환되었습니다. 이제 학생 본인이 직접 삭제할 수 있습니다.",
        fromName: TEACHER_INFO.name,
        fromInstitution: TEACHER_INFO.affiliation,
        classId: cls.id,
        graphId: cls.linkedGraphId,
      })
      setSuccessToast("강좌 그래프를 폐지했습니다")
    } else {
      unretireGraph(cls.linkedGraphId)
      setSuccessToast("폐지를 취소했습니다")
    }
    setLinkedGraph(getGraph(cls.linkedGraphId))
    setPendingRetire(null)
  }

  const handleViewGraph = () => {
    if (!cls?.linkedGraphId) return
    setActiveGraphId(cls.linkedGraphId)
    setFading(true)
    setTimeout(() => router.push("/learn?teacher=true"), 300)
  }

  const handleBack = () => {
    setFading(true)
    setTimeout(() => router.push("/teacher"), 300)
  }

  const handleSwitchToStudent = () => {
    if (!confirm("학생 모드로 전환합니다. 학생 홈으로 이동합니다.")) return
    setUserRole("student")
    setFading(true)
    setTimeout(() => router.push("/home"), 300)
  }

  const handleLogout = () => {
    setFading(true)
    setTimeout(() => router.push("/"), 300)
  }

  // SSR/client 첫 렌더는 null만 emit — mount 후 실제 콘텐츠 결정
  if (!mounted) {
    return null
  }

  // 학급 not-found — 메인 return과 동일한 root div를 사용해 React가 같은 트리로 reconcile하도록 함
  // (early return 두 개로 나누면 hot reload 시 DOM이 누적되는 케이스가 있음)
  if (!cls) {
    return (
      <div
        className={cn(
          "min-h-screen bg-background text-foreground relative transition-opacity duration-300",
          "animate-in fade-in duration-500",
          fading ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">학급을 찾을 수 없습니다.</p>
            <button onClick={handleBack} className="text-sm text-primary hover:underline">
              ← 교수 대시보드로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { icon: Icon, theme } = getDomainStyle(cls.subject)
  const t = THEMES[theme]

  // 학생 정렬
  const sortedStudents = [...cls.students].sort((a, b) => {
    if (studentSort === "mastery-asc") return a.mastery - b.mastery
    if (studentSort === "mastery-desc") return b.mastery - a.mastery
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  })

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground relative transition-opacity duration-300",
        "animate-in fade-in duration-500",
        fading ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.05] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              학급 목록
            </button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary rounded-lg shadow-md shadow-primary/20">
                <BrainCircuit className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">Linker</span>
              <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider border border-primary/20">
                Educator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSwitchToStudent}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/5"
            >
              <User className="h-3.5 w-3.5" />
              학생 모드
            </button>
            {/* Teacher info */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-foreground leading-tight">{TEACHER_INFO.name}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{TEACHER_INFO.affiliation}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md shadow-primary/20">
              {TEACHER_INFO.avatarLetter}
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-10">
        {/* Class hero */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl border border-border bg-card shadow-md",
        )}>
          <div className={cn("relative p-8 bg-gradient-to-br", t.heroGradient)}>
            {/* Decorative */}
            <div className={cn("absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-30", t.bar)} />

            <div className="relative flex items-start gap-8">
              {/* Icon */}
              <div className="relative flex items-center justify-center shrink-0 w-24 h-24">
                <div className="absolute inset-0 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/50 shadow-lg shadow-black/5" />
                <Icon className={cn("relative h-12 w-12", t.icon)} strokeWidth={1.75} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.15em] mb-2">
                  CLASS OVERVIEW
                </p>
                <h1 className="text-4xl font-black text-foreground tracking-tight leading-tight mb-2">
                  {cls.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    <GraduationCap className="h-2.5 w-2.5" />
                    {TEACHER_INFO.affiliation}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    {cls.subject} · 최근 활동 {timeAgo(cls.lastActivityAt)}
                  </span>
                </div>

                {/* Quick stats inline */}
                <div className="mt-5 flex flex-wrap items-center gap-5">
                  <div>
                    <p className="text-2xl font-black text-foreground leading-none">
                      {cls.studentCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">학생</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-2xl font-black text-foreground leading-none">
                      {cls.avgMastery}<span className="text-sm ml-0.5">%</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">평균 숙련도</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-2xl font-black text-foreground leading-none">
                      {cls.weeklyAnalyses}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">분석/주</p>
                  </div>

                  {/* 그래프 보기 + 오답 확인 */}
                  {cls.linkedGraphId && (
                    <>
                      <div className="h-8 w-px bg-border" />
                      <button
                        onClick={handleViewGraph}
                        className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        그래프 보기
                      </button>
                      {quizHistory.length > 0 && (
                        <button
                          onClick={() => setShowQuizPanel((v) => !v)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold transition-colors",
                            showQuizPanel ? "text-amber-600" : "text-muted-foreground hover:text-amber-600"
                          )}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          오답 {quizHistory.filter(q => !q.isCorrect).length}건
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 학생 오답 기록 (교수용) */}
        {showQuizPanel && quizHistory.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-xl font-bold text-foreground">학생 퀴즈 기록</h2>
              <span className="text-xs text-muted-foreground ml-1">{quizHistory.length}건</span>
            </div>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border max-h-72 overflow-y-auto">
              {quizHistory.slice(0, 10).map((q) => (
                <button
                  key={q.id}
                  onClick={() => setActiveQuiz(q)}
                  className="w-full text-left px-5 py-3 hover:bg-muted/20 transition-colors flex items-center gap-3 group"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                    q.isCorrect ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                  )}>
                    {q.isCorrect ? "O" : "X"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded">{q.nodeLabel}</span>
                      <span className="text-[9px] text-muted-foreground">{timeAgo(q.timestamp)}</span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-1 mt-0.5">{q.question}</p>
                  </div>
                  <span className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">상세 →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weakness heatmap with live updates */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-xl font-bold text-foreground">학급 약점 분포</h2>
            <span className="text-xs text-muted-foreground ml-1">AI 분석 기반</span>
            {/* LIVE indicator */}
            <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono">
              <div className="flex items-center gap-1 text-emerald-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </div>
              <span key={updateTick} className="text-muted-foreground/60 animate-in fade-in duration-500">
                · 실시간 업데이트 중
              </span>
            </div>
          </div>

          {liveRecords.length > 0 && (
            <div className="mb-3 flex items-center gap-2 text-[10px] font-medium text-rose-600 bg-rose-500/[0.06] border border-rose-500/20 rounded-lg px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>학생 분석 {liveRecords.length}건이 약점 분포에 즉시 누적되었습니다</span>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            {liveWeakPoints.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground leading-relaxed">
                아직 약점 데이터가 없습니다.<br />
                학생이 분석을 진행하면 결손이 자동으로 누적됩니다.
              </div>
            )}
            {liveWeakPoints.slice(0, 6).map((wp, idx) => {
              const pct = Math.min(100, (wp.strugglingCount / cls.studentCount) * 100)
              const severity = pct >= 50 ? "high" : pct >= 25 ? "mid" : "low"
              const isHot = highlightedConcept === wp.concept
              return (
                <div
                  key={wp.concept}
                  className={cn(
                    "flex items-center gap-4 -mx-2 px-2 py-1 rounded-lg transition-all",
                    isHot && "bg-rose-500/[0.07] ring-1 ring-rose-500/40"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border",
                    severity === "high" && "bg-red-500/15 border-red-500/40 text-red-600",
                    severity === "mid" && "bg-amber-500/15 border-amber-500/40 text-amber-600",
                    severity === "low" && "bg-emerald-500/15 border-emerald-500/40 text-emerald-600"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-sm font-bold text-foreground truncate">{wp.concept}</p>
                      <p className="text-xs text-muted-foreground font-mono tabular-nums transition-all duration-500">
                        {wp.strugglingCount} / {cls.studentCount}명
                      </p>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          severity === "high" && "bg-red-500",
                          severity === "mid" && "bg-amber-500",
                          severity === "low" && "bg-emerald-500"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 w-12 text-right">
                    <p className={cn(
                      "text-sm font-bold tabular-nums transition-colors duration-500",
                      severity === "high" && "text-red-600",
                      severity === "mid" && "text-amber-600",
                      severity === "low" && "text-emerald-600"
                    )}>
                      {Math.round(pct)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 학생 분석 활동 피드 (양방향 데이터 루프 시각화) */}
        {liveRecords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Clock className="h-4 w-4 text-rose-500" />
              <h2 className="text-xl font-bold text-foreground">최근 학생 분석 활동</h2>
              <span className="text-xs text-muted-foreground ml-1">실제 학생 분석에서 도착</span>
              <div className="ml-auto flex items-center gap-1 text-[10px] text-rose-600">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                LIVE
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl divide-y divide-border max-h-72 overflow-y-auto">
              {liveRecords.slice(0, 8).map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-foreground/70 shrink-0">
                    {rec.studentName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <strong>{rec.studentName}</strong> 학생이{" "}
                      <span className="font-bold text-rose-600">{rec.concept}</span>
                      에서 막혔습니다
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {timeAgo(rec.recordedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    결손 탐지
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI recommendation */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-bold text-foreground">AI 개입 추천</h2>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent p-6 space-y-5">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Recommendation text */}
            <div className="relative flex items-start gap-4">
              <div className="p-2.5 bg-primary/15 border border-primary/30 rounded-xl shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">
                  멀티 에이전트 분석 결과
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {cls.recommendation}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            {(() => {
              const topWeakness = liveWeakPoints[0]
              const isUserCreated = cls.id.startsWith("user-class-")
              const lowMasteryCount = isUserCreated
                ? Math.max(1, new Set(liveRecords.map((r) => r.studentName)).size)
                : cls.students.filter((s) => s.mastery < 50).length
              const actions: InterventionAction[] = [
                {
                  id: "review",
                  label: `${topWeakness?.concept ?? "주요 약점"} 복습 과제 전송`,
                  description: `숙련도 50% 미만 학생 ${lowMasteryCount}명에게 "${topWeakness?.concept ?? "주요 약점"}" 집중 복습 과제를 발송합니다.`,
                  icon: BookOpen,
                  color: "primary",
                  targetCount: lowMasteryCount,
                },
                {
                  id: "microlearning",
                  label: "마이크로 러닝 배포",
                  description: `결손 개념에 대한 AI 자동 생성 3분 마이크로 러닝 자료를 전체 ${cls.studentCount}명에게 배포합니다.`,
                  icon: Sparkles,
                  color: "emerald",
                  targetCount: cls.studentCount,
                },
                {
                  id: "alert",
                  label: "집중 학습 알림 발송",
                  description: `이번 주 학습량이 부족한 ${lowMasteryCount}명에게 집중 학습 알림을 발송합니다.`,
                  icon: Bell,
                  color: "amber",
                  targetCount: lowMasteryCount,
                },
              ]
              return (
                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-primary/10">
                  {actions.map((action) => {
                    const ActionIcon = action.icon
                    return (
                      <button
                        key={action.id}
                        onClick={() => setPendingAction(action)}
                        className="group text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg shrink-0 border",
                            action.color === "primary" && "bg-primary/10 border-primary/20",
                            action.color === "emerald" && "bg-emerald-500/10 border-emerald-500/20",
                            action.color === "amber" && "bg-amber-500/10 border-amber-500/20"
                          )}>
                            <ActionIcon className={cn(
                              "h-4 w-4",
                              action.color === "primary" && "text-primary",
                              action.color === "emerald" && "text-emerald-500",
                              action.color === "amber" && "text-amber-500"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                              {action.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" />
                              <strong className="text-foreground">{action.targetCount}</strong>명 대상
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Linked graph lifecycle (retire/unretire) */}
        {linkedGraph && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xl font-bold text-foreground">강좌 그래프 관리</h2>
            </div>

            <div className={cn(
              "rounded-2xl border p-5 flex items-center gap-4",
              linkedGraph.retired
                ? "border-amber-500/30 bg-amber-500/[0.04]"
                : "border-border bg-card"
            )}>
              <div className={cn(
                "p-3 rounded-xl border shrink-0",
                linkedGraph.retired
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-primary/10 border-primary/20"
              )}>
                {linkedGraph.retired
                  ? <Archive className="h-5 w-5 text-amber-600" />
                  : <BookOpen className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-foreground truncate">{linkedGraph.domain}</p>
                  {linkedGraph.retired && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                      폐지됨
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {linkedGraph.retired
                    ? "이 그래프는 폐지 상태입니다. 학생들은 자신의 사본을 직접 삭제할 수 있습니다."
                    : "강좌가 종료되었거나 더 이상 사용되지 않는다면 그래프를 폐지할 수 있습니다. 폐지 후 학생이 직접 삭제할 수 있게 됩니다."}
                </p>
              </div>
              <button
                onClick={() => setPendingRetire(linkedGraph.retired ? "unretire" : "retire")}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border",
                  linkedGraph.retired
                    ? "border-border text-foreground hover:bg-muted"
                    : "border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                )}
              >
                {linkedGraph.retired
                  ? <><RotateCcw className="h-3.5 w-3.5" /> 폐지 취소</>
                  : <><Archive className="h-3.5 w-3.5" /> 강좌 그래프 폐지</>}
              </button>
            </div>
          </div>
        )}

        {/* Student list */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">학생 목록</h2>
              <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full font-mono">
                {cls.studentCount}명
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>정렬:</span>
              <button
                onClick={() => setStudentSort("mastery-asc")}
                className={cn("px-2 py-1 rounded transition-colors", studentSort === "mastery-asc" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted")}
              >
                낮은 숙련도 순
              </button>
              <button
                onClick={() => setStudentSort("mastery-desc")}
                className={cn("px-2 py-1 rounded transition-colors", studentSort === "mastery-desc" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted")}
              >
                높은 숙련도 순
              </button>
              <button
                onClick={() => setStudentSort("recent")}
                className={cn("px-2 py-1 rounded transition-colors", studentSort === "recent" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted")}
              >
                최근 활동순
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">이름</div>
              <div className="col-span-3">숙련도</div>
              <div className="col-span-3">약점 개념</div>
              <div className="col-span-2 text-right">최근 활동</div>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {sortedStudents.map((s, idx) => (
                <div key={s.id} className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/20 transition-colors">
                  <div className="col-span-1 text-[11px] text-muted-foreground font-mono">{idx + 1}</div>
                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground/70 shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.mastery >= 70 ? "bg-emerald-500" : s.mastery >= 50 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${s.mastery}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-foreground tabular-nums w-8 text-right">{s.mastery}%</span>
                    </div>
                  </div>
                  <div className="col-span-3 flex flex-wrap gap-1">
                    {s.gaps.slice(0, 2).map((gap) => (
                      <span
                        key={gap}
                        className="text-[9px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
                      >
                        {gap}
                      </span>
                    ))}
                    {s.gaps.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{s.gaps.length - 2}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-[10px] text-muted-foreground">
                    {timeAgo(s.lastActiveAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPendingAction(null)}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-5">
              <div className={cn(
                "p-3 rounded-xl border shrink-0",
                pendingAction.color === "primary" && "bg-primary/10 border-primary/20",
                pendingAction.color === "emerald" && "bg-emerald-500/10 border-emerald-500/20",
                pendingAction.color === "amber" && "bg-amber-500/10 border-amber-500/20"
              )}>
                <pendingAction.icon className={cn(
                  "h-5 w-5",
                  pendingAction.color === "primary" && "text-primary",
                  pendingAction.color === "emerald" && "text-emerald-500",
                  pendingAction.color === "amber" && "text-amber-500"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  AI 개입 확인
                </p>
                <h3 className="text-base font-bold text-foreground leading-tight">
                  {pendingAction.label}
                </h3>
              </div>
              <button
                onClick={() => setPendingAction(null)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {pendingAction.description}
            </p>

            <div className="flex items-center gap-2 mb-6 px-3 py-2.5 bg-muted/40 border border-border rounded-lg">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">대상</span>
              <span className="ml-auto text-sm font-bold text-foreground tabular-nums">
                {pendingAction.targetCount}명
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                전송 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retire confirmation modal */}
      {pendingRetire && linkedGraph && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPendingRetire(null)}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-5">
              <div className={cn(
                "p-3 rounded-xl border shrink-0",
                pendingRetire === "retire"
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-primary/10 border-primary/20"
              )}>
                {pendingRetire === "retire"
                  ? <Archive className="h-5 w-5 text-amber-600" />
                  : <RotateCcw className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {pendingRetire === "retire" ? "그래프 폐지" : "폐지 취소"}
                </p>
                <h3 className="text-base font-bold text-foreground leading-tight">
                  {linkedGraph.domain}
                </h3>
              </div>
              <button
                onClick={() => setPendingRetire(null)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {pendingRetire === "retire"
                ? "폐지 후에도 학생들의 학습 기록은 보존되지만, 학생 본인이 자신의 사본을 직접 삭제할 수 있게 됩니다. 폐지 사실은 알림으로 학생들에게 전달됩니다."
                : "이 그래프를 다시 활성 상태로 되돌립니다. 학생들의 사본은 삭제 보호 상태로 복귀합니다."}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPendingRetire(null)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmRetire}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-1.5",
                  pendingRetire === "retire"
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                    : "bg-primary hover:bg-primary/90 shadow-primary/20"
                )}
              >
                {pendingRetire === "retire"
                  ? <><Archive className="h-3.5 w-3.5" /> 폐지 확정</>
                  : <><RotateCcw className="h-3.5 w-3.5" /> 폐지 취소</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 교수용 퀴즈 상세 팝업 */}
      {activeQuiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveQuiz(null)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={cn(
              "px-6 py-4 border-b border-border bg-gradient-to-br",
              activeQuiz.isCorrect ? "from-emerald-500/10 to-transparent" : "from-amber-500/10 to-transparent"
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full">{activeQuiz.nodeLabel}</span>
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full",
                      activeQuiz.isCorrect ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                    )}>
                      {activeQuiz.isCorrect ? "정답" : "오답"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(activeQuiz.timestamp).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => setActiveQuiz(null)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm font-semibold text-foreground leading-relaxed">{activeQuiz.question}</p>
              <div className="space-y-2">
                {activeQuiz.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx)
                  const isCorrect = idx === activeQuiz.correctAnswer
                  const isSelected = idx === activeQuiz.selectedAnswer
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm",
                        isCorrect && "border-green-500/50 bg-green-50 dark:bg-green-950/20",
                        isSelected && !isCorrect && "border-red-500/50 bg-red-50 dark:bg-red-950/20",
                        !isCorrect && !isSelected && "border-border bg-muted/20"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                        isCorrect && "bg-green-500 text-white",
                        isSelected && !isCorrect && "bg-red-500 text-white",
                        !isCorrect && !isSelected && "bg-muted text-muted-foreground"
                      )}>{letter}</span>
                      <span className="flex-1 text-foreground">{opt}</span>
                      {isCorrect && <span className="text-[9px] font-bold text-green-600 shrink-0">정답</span>}
                      {isSelected && !isCorrect && <span className="text-[9px] font-bold text-red-500 shrink-0">학생 선택</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20">
              <button onClick={() => setActiveQuiz(null)} className="w-full h-9 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-card border border-emerald-500/40 rounded-xl shadow-2xl shadow-emerald-500/10 px-5 py-3.5">
            <div className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-foreground">{successToast}</p>
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
          </div>
        </div>
      )}
    </div>
  )
}
