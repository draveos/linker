"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  BrainCircuit, Users, BarChart2, Sparkles, LogOut, GraduationCap, User,
  ChevronRight, TrendingUp, AlertTriangle, Clock, BookOpen, ArrowRight,
  Grid3x3, GitBranch, BarChart3, Atom, FlaskConical, Dna, Cpu, Terminal, Database, Brain, Network,
  Plus, Info, X, RotateCcw, Eye, Pencil, Send, Link2, Copy, Check,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { setUserRole, createGraph, createUserClass, deleteUserClass, resetDemoState, setActiveGraphId } from "@/lib/graph-store"
import type { KnowledgeNode } from "@/components/knowledge-graph-canvas"
import { MOCK_CLASSES, TEACHER_INFO, getAllClassesView, type MockClass } from "@/lib/mock-classes"
import type { GenerateGraphResponse } from "@/app/api/generate-graph/route"

// ── Domain theme map (same as /home) ─────────────────────────

type ThemeKey = "blue" | "purple" | "orange" | "pink" | "cyan" | "emerald" | "rose" | "amber" | "fuchsia" | "teal"

const THEMES: Record<ThemeKey, {
  gradient: string
  heroGradient: string
  icon: string
  bar: string
  ring: string
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
  return { icon: BookOpen, theme: "purple" }
}

// ── Helpers ──

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

// ── Class Card ──

function ClassCard({ cls, onClick }: { cls: MockClass; onClick: () => void }) {
  const { icon: Icon, theme } = getDomainStyle(cls.subject)
  const t = THEMES[theme]
  const topWeakness = cls.weakPoints[0]
  const weaknessPct = topWeakness
    ? Math.round((topWeakness.strugglingCount / cls.studentCount) * 100)
    : 0

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Top: gradient + icon + big student count */}
      <div className={cn("relative h-36 flex items-center px-6 bg-gradient-to-br overflow-hidden", t.gradient)}>
        {/* Decorative blur */}
        <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40", t.bar)} />

        {/* Icon with frosted backdrop */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="absolute w-20 h-20 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/50 shadow-lg shadow-black/5" />
          <Icon className={cn("relative h-11 w-11", t.icon)} strokeWidth={1.75} />
        </div>

        {/* Student count + meta */}
        <div className="relative ml-5 flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-foreground">{cls.studentCount}</span>
            <span className="text-xs text-muted-foreground">학생</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>평균 <strong className="text-foreground">{cls.avgMastery}%</strong></span>
            <span>·</span>
            <span>{cls.weeklyAnalyses} 분석/주</span>
          </div>
        </div>
      </div>

      {/* Bottom: class name + top weakness */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
            {cls.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            최근 활동 {timeAgo(cls.lastActivityAt)}
          </p>
        </div>

        {/* Top weakness alert */}
        {topWeakness ? (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">주요 약점</p>
              <p className="text-xs font-bold text-foreground truncate">
                {topWeakness.concept}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {topWeakness.strugglingCount}명 결손 ({weaknessPct}%)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">데이터 수집 중</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                학생이 분석을 진행하면 약점이 자동 누적됩니다.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <div className="flex items-center gap-1 text-xs text-primary font-semibold group-hover:gap-2 transition-all">
            <span>학급 상세 분석</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──

const DEMO_KEY = "linker_teacher_demo"

export default function TeacherDashboard() {
  const router = useRouter()
  const [fading, setFading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  // 사용자 생성 학급 + mock 통합 리스트
  const [classes, setClasses] = useState<MockClass[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const refreshClasses = (currentDemoMode: boolean) => {
    setClasses(getAllClassesView(currentDemoMode))
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      // 첫 방문 시 데모 모드를 자동 활성 — 예시 데이터를 기본 노출
      const stored = localStorage.getItem(DEMO_KEY)
      const dm = stored === null ? true : stored === "true"
      if (stored === null) localStorage.setItem(DEMO_KEY, "true")
      setDemoMode(dm)
      refreshClasses(dm)
    }
  }, [])

  // 다른 탭(학생 화면)에서 변경 발생 시 동기화
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === DEMO_KEY) {
        const dm = localStorage.getItem(DEMO_KEY) === "true"
        setDemoMode(dm)
        refreshClasses(dm)
      }
      if (e.key === "linker_user_classes" || e.key === "linker_graphs" || e.key === "linker_live_records") {
        refreshClasses(demoMode)
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [demoMode])

  const enableDemo = () => {
    if (typeof window !== "undefined") localStorage.setItem(DEMO_KEY, "true")
    setDemoMode(true)
    refreshClasses(true)
  }

  const disableDemo = () => {
    if (typeof window !== "undefined") localStorage.removeItem(DEMO_KEY)
    setDemoMode(false)
    refreshClasses(false)
  }

  const handleClassCreated = (editGraphId?: string) => {
    refreshClasses(demoMode)
    setShowCreateModal(false)
    // "수정 후 배포" 선택 시 → learn 페이지로 이동 (그래프 수정)
    if (editGraphId) {
      setActiveGraphId(editGraphId)
      setFading(true)
      setTimeout(() => router.push("/learn"), 300)
    }
  }

  const handleResetDemo = () => {
    resetDemoState()
    // 데모 모드 다시 켜고 갱신
    if (typeof window !== "undefined") localStorage.setItem(DEMO_KEY, "true")
    setDemoMode(true)
    refreshClasses(true)
    setShowResetConfirm(false)
  }

  const handleDeleteClass = (id: string) => {
    deleteUserClass(id)
    refreshClasses(demoMode)
    setPendingDeleteId(null)
  }
  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0)
  const totalAnalyses = classes.reduce((s, c) => s + c.weeklyAnalyses, 0)
  const avgMastery = classes.length > 0
    ? Math.round(classes.reduce((s, c) => s + c.avgMastery, 0) / classes.length)
    : 0

  // 전체 학급의 최상위 약점 집계
  const globalWeakPoints: Record<string, number> = {}
  classes.forEach((c) => {
    c.weakPoints.forEach((wp) => {
      globalWeakPoints[wp.concept] = (globalWeakPoints[wp.concept] ?? 0) + wp.strugglingCount
    })
  })
  const topGlobalWeakness = Object.entries(globalWeakPoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const handleOpenClass = (classId: string) => {
    setFading(true)
    setTimeout(() => router.push(`/teacher/class/${classId}`), 300)
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

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground relative transition-opacity duration-300",
        "animate-in fade-in duration-500",
        fading ? "opacity-0" : "opacity-100",
        !mounted && "opacity-0"
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
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary rounded-lg shadow-md shadow-primary/20">
                <BrainCircuit className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">Linker</span>
              <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider border border-primary/20">
                Educator
              </span>
            </div>

            <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground pl-4 border-l border-border">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                <span><strong className="text-foreground font-semibold">{totalStudents}</strong> 학생</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" />
                <span><strong className="text-foreground font-semibold">{classes.length}</strong> 학급</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                <span><strong className="text-foreground font-semibold">{totalAnalyses}</strong> 분석/주</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 데모 리셋 */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1.5 rounded-lg hover:bg-destructive/5 border border-transparent hover:border-destructive/20"
              title="데모 데이터 전체 초기화 (localStorage 비우기)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              데모 초기화
            </button>
            {/* Role switcher */}
            <button
              onClick={handleSwitchToStudent}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/5"
              title="학생 모드로 전환"
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
        {/* Hero */}
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <GraduationCap className="h-3 w-3" />
            EDUCATOR WORKSPACE
          </p>
          <h1 className="text-5xl font-black text-foreground tracking-tight leading-tight">
            {TEACHER_INFO.name}님, 안녕하세요
          </h1>
          <p className="text-muted-foreground mt-3 text-base flex items-center gap-2">
            <span>{TEACHER_INFO.affiliation}</span>
            <span className="text-border">·</span>
            <span>담당 학급의 학습 현황과 주요 약점을 한눈에 확인하세요</span>
          </p>
        </div>

        {/* ── Empty state (no classes at all) ── */}
        {classes.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-muted border border-border flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">담당 학급이 없습니다</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              직접 학급을 만들어 두 탭(교수/학생) 데모를 진행하거나, 예시 데이터로 Linker 교수 대시보드를 미리 체험해보세요.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm shadow-lg shadow-primary/25 hover:brightness-110 transition-all"
              >
                <Plus className="h-4 w-4" />
                학급 생성
              </button>
              <button
                onClick={enableDemo}
                className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm text-foreground hover:bg-muted transition-all"
              >
                <Sparkles className="h-4 w-4" />
                예시 데이터로 둘러보기
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-8 max-w-md mx-auto leading-relaxed">
              현 MVP는 localStorage 기반 — 학급 정보는 이 브라우저에만 저장됩니다.
              백엔드 도입 시 학생 초대 · 인증 · 권한 관리 · 다중 인스턴스 동기화가 추가됩니다.
            </p>
          </div>
        )}

        {/* ── Demo mode banner ── */}
        {demoMode && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="p-1.5 bg-primary/15 border border-primary/30 rounded-lg shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">예시 데이터 모드 활성</p>
              <p className="text-[10px] text-muted-foreground">
                {MOCK_CLASSES.length}개 학급 · {MOCK_CLASSES.reduce((s, c) => s + c.studentCount, 0)}명 학생 (실제 데이터가 아닙니다)
              </p>
            </div>
            <button
              onClick={disableDemo}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
            >
              <X className="h-3 w-3" />
              초기화
            </button>
          </div>
        )}

        {/* ── Dashboard content ── */}
        {classes.length > 0 && (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground leading-none">{totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-1">총 학생 수</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground leading-none">{avgMastery}<span className="text-base ml-0.5">%</span></p>
              <p className="text-xs text-muted-foreground mt-1">평균 숙련도</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground leading-none">{totalAnalyses}</p>
              <p className="text-xs text-muted-foreground mt-1">이번 주 분석</p>
            </div>
          </div>
        </div>

        {/* Global weak points */}
        {topGlobalWeakness.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">전 학급 공통 약점</h2>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-50/30 dark:from-amber-950/20 dark:to-amber-950/5 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 space-y-3">
              {topGlobalWeakness.map(([concept, count], idx) => (
                <div key={concept} className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{concept}</p>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, (count / totalStudents) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{count}명</p>
                    <p className="text-[10px] text-muted-foreground">/ {totalStudents}명</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

            {/* Classes */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-foreground">나의 학급</h2>
                  <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full font-mono">
                    {classes.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  학급 생성
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {classes.map((cls) => {
                  const isUserCreated = cls.id.startsWith("user-class-")
                  return (
                    <div key={cls.id} className="relative group">
                      <ClassCard cls={cls} onClick={() => handleOpenClass(cls.id)} />
                      {isUserCreated ? (
                        <>
                          <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm pointer-events-none">
                            <Plus className="h-2.5 w-2.5" />
                            내가 생성
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(cls.id) }}
                            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
                            title="학급 삭제"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 shadow-sm pointer-events-none">
                          <Sparkles className="h-2.5 w-2.5" />
                          예시
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* 학급 생성 모달 */}
      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleClassCreated}
          onEditAndDeploy={(graphId) => handleClassCreated(graphId)}
        />
      )}

      {/* 데모 리셋 확인 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-border bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 shrink-0">
                  <RotateCcw className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1">DEMO RESET</p>
                  <h3 className="text-base font-bold text-foreground">데모 데이터 전체 초기화</h3>
                </div>
                <button onClick={() => setShowResetConfirm(false)} className="p-1 text-muted-foreground hover:text-foreground rounded shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                다음 데이터가 <strong className="text-destructive">모두 삭제</strong>됩니다:
              </p>
              <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5 pl-1">
                <li>• 직접 만든 학급 · 학습 그래프</li>
                <li>• 학생 분석 기록 · 결손 라이브 기록</li>
                <li>• 알림 · 휴지통 · 학습 진행 상태</li>
              </ul>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                예시 학급과 시드 그래프(기초 선형대수 / 미적분)는 자동으로 복원됩니다.
                새 데모를 깨끗한 상태에서 시작할 때 사용하세요.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleResetDemo}
                className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                전체 초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학급 삭제 확인 */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPendingDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-foreground mb-2">학급 삭제</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              학급은 삭제되지만 연결된 그래프와 학생 분석 기록은 그대로 보존됩니다.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteClass(pendingDeleteId)}
                className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Create Class Modal — 3단계: 입력 → AI 생성 → 프리뷰 → 배포 ──

function generateClassCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function CreateClassModal({
  onClose,
  onCreated,
  onEditAndDeploy,
}: {
  onClose: () => void
  onCreated: () => void
  onEditAndDeploy: (graphId: string) => void
}) {
  // Step 1: 입력
  const [name, setName] = useState("")
  const [domain, setDomain] = useState("")
  const [lectureText, setLectureText] = useState("")

  // Step 2: 생성 중
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Step 3: 프리뷰
  const [previewNodes, setPreviewNodes] = useState<KnowledgeNode[] | null>(null)
  const [previewDomain, setPreviewDomain] = useState("")
  const [copied, setCopied] = useState(false)

  const [error, setError] = useState("")

  const handleGenerate = async () => {
    setError("")
    if (!name.trim()) { setError("학급 이름을 입력하세요."); return }
    if (!domain.trim()) { setError("도메인 / 과목명을 입력하세요."); return }
    if (lectureText.trim().length < 30) {
      setError("강의 내용을 30자 이상 입력하세요.")
      return
    }

    setIsGenerating(true)
    setProgress(0)
    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 8 + 2
      if (p >= 90) { p = 90; clearInterval(progressRef.current) }
      setProgress(p)
    }, 250)

    try {
      const res = await fetch("/api/generate-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureText: lectureText.trim(), domain: domain.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "그래프 생성에 실패했습니다")
      }
      const result: GenerateGraphResponse = await res.json()
      clearInterval(progressRef.current)
      setProgress(100)
      await new Promise((r) => setTimeout(r, 300))
      setPreviewNodes(result.nodes)
      setPreviewDomain(result.domain)
      setIsGenerating(false)
    } catch (err) {
      clearInterval(progressRef.current)
      setIsGenerating(false)
      setProgress(0)
      setError(err instanceof Error ? err.message : "그래프 생성에 실패했습니다")
    }
  }

  const handleDeploy = () => {
    if (!previewNodes) return
    const graph = createGraph(previewDomain, previewNodes, {
      institution: TEACHER_INFO.affiliation,
      instructorName: TEACHER_INFO.name,
    })
    createUserClass({
      name: name.trim(),
      subject: domain.trim(),
      linkedGraphId: graph.id,
    })
    onCreated()
  }

  const handleEditThenDeploy = () => {
    if (!previewNodes) return
    const graph = createGraph(previewDomain, previewNodes, {
      institution: TEACHER_INFO.affiliation,
      instructorName: TEACHER_INFO.name,
    })
    createUserClass({
      name: name.trim(),
      subject: domain.trim(),
      linkedGraphId: graph.id,
    })
    onEditAndDeploy(graph.id)
  }

  const inviteCode = name.trim() ? generateClassCode() : ""
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${inviteCode}`
    : ""

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Step indicator ──
  const step = previewNodes ? 3 : isGenerating ? 2 : 1
  const stepLabels = ["정보 입력", "AI 생성", "프리뷰"]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isGenerating ? undefined : onClose} />
      <div className={cn(
        "relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
        previewNodes ? "w-full max-w-lg" : "w-full max-w-md"
      )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">NEW CLASS</p>
              <h3 className="text-lg font-bold text-foreground">학급 생성</h3>
            </div>
            <button onClick={onClose} disabled={isGenerating} className="p-1 text-muted-foreground hover:text-foreground rounded disabled:opacity-50">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                {i > 0 && <div className={cn("w-6 h-px", i < step ? "bg-primary" : "bg-border")} />}
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors",
                  i + 1 === step ? "bg-primary/15 text-primary" : i + 1 < step ? "text-primary/70" : "text-muted-foreground"
                )}>
                  <span className={cn(
                    "w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
                    i + 1 <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>{i + 1}</span>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Generating */}
        {isGenerating && (
          <div className="px-6 py-10 text-center space-y-5">
            <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">학급 그래프 생성 중...</p>
              <p className="text-[11px] text-muted-foreground">AI가 강의 내용을 분석하고 개념 트리를 구성하고 있습니다</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {previewNodes && !isGenerating && (
          <>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Summary */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{previewDomain}</p>
                  <p className="text-[10px] text-muted-foreground">{previewNodes.length}개 개념 노드 생성 완료</p>
                </div>
              </div>

              {/* Node list */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">생성된 개념 트리</p>
                <div className="space-y-1.5">
                  {previewNodes.map((node, i) => (
                    <div key={node.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{node.label}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{node.description}</p>
                        {node.prerequisites.length > 0 && (
                          <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                            ← {node.prerequisites.map(pid => previewNodes.find(n => n.id === pid)?.label ?? pid).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite link preview */}
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">학생 초대 링크</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] font-mono text-foreground bg-muted border border-border rounded-lg px-3 py-2 truncate">
                    {inviteUrl}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  배포 후 학생이 이 링크로 접속하면 그래프가 자동 추가됩니다 (백엔드 도입 시 활성화).
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPreviewNodes(null); setProgress(0) }}
                  className="h-10 px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  재생성
                </button>
                <button
                  onClick={handleEditThenDeploy}
                  className="h-10 px-4 rounded-xl border border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 transition-colors flex items-center gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  수정 후 배포
                </button>
                <button
                  onClick={handleDeploy}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  학급 배포
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 1: Form */}
        {!previewNodes && !isGenerating && (
          <>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1.5">학급 이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError("") }}
                  placeholder="예: 2026 봄학기 선형대수 1반"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1.5">도메인 / 과목명</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError("") }}
                  placeholder="예: 선형대수학, 자료구조, 일반물리학"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1.5">강의 내용 / 커리큘럼</label>
                <textarea
                  value={lectureText}
                  onChange={(e) => { setLectureText(e.target.value); setError("") }}
                  placeholder="이번 학기에 다룰 주요 개념을 설명하세요..."
                  rows={5}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                />
                <p className="text-[9px] text-muted-foreground/70 mt-1.5">30자 이상 권장</p>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="flex-1">{error}</span>
                </p>
              )}

              <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2.5 leading-relaxed">
                <Info className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                <span>
                  생성된 그래프는 <strong className="text-foreground">{TEACHER_INFO.affiliation}</strong> 발급으로 표시됩니다.
                  배포 전 프리뷰에서 확인·수정할 수 있습니다.
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center gap-2">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                취소
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI로 그래프 생성
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
