"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, Clock, BookOpen, BrainCircuit, Info, ChevronLeft, ChevronRight, Trash2, Home, History, Zap, RefreshCcw, GraduationCap, ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getErrorLogs, deleteErrorLog, getWrongAnswers, type ErrorLog, type QuizAttempt } from "@/lib/graph-store"
import { AlertCircle, Target } from "lucide-react"

export interface Analysis {
  id: string
  title: string
  subject: string
  timestamp: Date
  rootCauseNodeId?: string
}

interface LeftSidebarProps {
  inputText: string
  setInputText: (text: string) => void
  isAnalyzing: boolean
  analysisStep?: number
  onAnalyze: () => void
  // 이미지 오답 분석
  imageFile: File | null
  setImageFile: (file: File | null) => void
  recentAnalyses: Analysis[]
  onSelectAnalysis: (analysis: Analysis) => void
  onDeleteAnalysis: (id: string) => void
  graphId: string
  graphDomain: string
  onGoHome?: () => void
  /** 튜토리얼 그래프일 때만 데모 예시 + 리셋 버튼 표시 */
  showPresets?: boolean
  onDemoReset?: () => void
  /** 로그 클릭 시 전체 분석 상태 복원 */
  onSelectErrorLog?: (log: ErrorLog) => void
}

export function LeftSidebar({
  inputText,
  setInputText,
  isAnalyzing,
  analysisStep,
  onAnalyze,
  imageFile,
  setImageFile,
  recentAnalyses,
  onSelectAnalysis,
  onDeleteAnalysis,
  graphId,
  graphDomain,
  onGoHome,
  showPresets,
  onDemoReset,
  onSelectErrorLog,
}: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showWrongAnswers, setShowWrongAnswers] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState<QuizAttempt[]>([])
  const [activeQuiz, setActiveQuiz] = useState<QuizAttempt | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const handleDragFile = (file: File) => {
    if (file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024) {
      setImageFile(file)
    }
  }
  const [showLogs, setShowLogs] = useState(false)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [resetConfirm, setResetConfirm] = useState(false)

  useEffect(() => {
    setErrorLogs(getErrorLogs(graphId))
    setWrongAnswers(getWrongAnswers(graphId))
  }, [graphId])

  // 패널 열릴 때마다 최신 로그 로드 (학습 페이지에서 분석 결과가 업데이트된 후 반영)
  useEffect(() => {
    if (showLogs) setErrorLogs(getErrorLogs(graphId))
  }, [showLogs, graphId])

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    const diff = Date.now() - d.getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (m < 60) return `${m}분 전`
    if (h < 24) return `${h}시간 전`
    return `${days}일 전`
  }

  const handleAnalyze = () => {
    // 로그 저장은 learn 페이지가 담당 (초기 저장 → 결과 업데이트)
    onAnalyze()
  }

  // ── 데모용 프리셋 — 멀티 에이전트 플로우를 유도하는 샘플 오답 ──
  const presets = [
    {
      key: "clear",
      label: "명확한 오답",
      tooltip: "1라운드로 빠르게 종료 — 높은 확신도",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15",
      text: "행렬 A = [[2,3],[1,4]]의 역행렬을 구하려고 했는데, 먼저 det(A)를 계산했어요. 저는 2*4 - 3*1 = 5 라고 썼는데, 답지에는 det(A) = 5가 맞다는데 왜 역행렬 공식에서 -(3)/5 이 부분이 저랑 다른지 모르겠어요. 부호를 어디서 놓친 것 같습니다.",
    },
    {
      key: "ambiguous",
      label: "모호한 오답",
      tooltip: "Verifier 발동 가능성 — 여러 개념이 얽힘",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
      text: "고유값 문제를 풀다가 막혔어요. 특성방정식 det(A - λI) = 0을 세우는 것까진 했는데, 전개한 2차 방정식이 계속 이상한 답이 나와요. 고유벡터는 시도도 못 해봤고, 뭐가 문제인지 감이 안 잡힙니다.",
    },
    {
      key: "deep",
      label: "복잡한 오답",
      tooltip: "루프 끝까지 돌 가능성 — 깊은 의존 체인",
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15",
      text: "대각화가 안 돼요. P^(-1)AP = D 형태로 만들려고 고유벡터들로 P를 구성했는데, 결과가 대각행렬이 전혀 아니에요. 뭘 잘못한 건지 모르겠어요. 고유값은 맞게 구한 것 같은데...",
    },
  ]

  const handlePresetClick = (text: string) => {
    setInputText(text)
  }

  const handleDemoReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true)
      setTimeout(() => setResetConfirm(false), 3000)
      return
    }
    onDemoReset?.()
    setResetConfirm(false)
  }

  const handleDeleteLog = (id: string) => {
    deleteErrorLog(id)
    setErrorLogs(getErrorLogs(graphId))
  }

  return (
    <>
      {/* Sidebar + Toggle as a connected unit */}
      <div
        className={cn(
          "flex shrink-0 h-full transition-all duration-300 fixed md:relative z-20",
          isCollapsed ? "-translate-x-80 md:-ml-80" : "translate-x-0"
        )}
      >
      {/* Sidebar */}
      <aside className="w-80 border-r border-border bg-card flex flex-col h-full">

        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/25">
              <BrainCircuit className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Linker</h1>
              <p className="text-xs text-muted-foreground font-medium">AI 기반 오답 역추적 학습</p>
            </div>
            <div className="flex items-center gap-1">
              {/* 오답 노트 토글 */}
              <button
                onClick={() => { setShowWrongAnswers((v) => !v); setShowLogs(false); setWrongAnswers(getWrongAnswers(graphId)) }}
                className={cn(
                  "p-2 rounded-lg transition-colors relative",
                  showWrongAnswers ? "bg-amber-500/10 text-amber-600" : "hover:bg-muted text-muted-foreground"
                )}
                title="오답 노트"
              >
                <AlertCircle className="h-4 w-4" />
                {wrongAnswers.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {Math.min(wrongAnswers.length, 9)}
                  </span>
                )}
              </button>
              {/* 오답 로그 토글 */}
              <button
                onClick={() => { setShowLogs((v) => !v); setShowWrongAnswers(false) }}
                className={cn(
                  "p-2 rounded-lg transition-colors relative",
                  showLogs ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                )}
                title="오답 입력 로그"
              >
                <History className="h-4 w-4" />
                {errorLogs.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                    {Math.min(errorLogs.length, 9)}
                  </span>
                )}
              </button>
              {onGoHome && (
                <button
                  onClick={onGoHome}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="홈으로"
                >
                  <Home className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {showWrongAnswers ? (
            /* ── 오답 노트 패널 ── */
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">오답 노트</h2>
                <span className="text-xs text-muted-foreground">{wrongAnswers.length}개</span>
              </div>
              {wrongAnswers.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">틀린 퀴즈가 없습니다.</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">노드를 클릭하고 퀴즈를 풀어보세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {wrongAnswers.slice(0, 10).map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuiz(q)}
                      className="w-full text-left p-3 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10 hover:border-amber-500/40 hover:shadow-sm transition-all space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded">
                          {q.nodeLabel}
                        </span>
                        <span className="text-[9px] text-muted-foreground ml-auto">
                          {new Date(q.timestamp).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed line-clamp-2">{q.question}</p>
                      <p className="text-[9px] text-primary">탭하여 상세 보기 →</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : showLogs ? (
            /* ── 오답 입력 로그 패널 ── */
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">오답 입력 로그</h2>
                <span className="text-xs text-muted-foreground">{errorLogs.length}개</span>
              </div>

              {errorLogs.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                  <History className="h-8 w-8 opacity-30" />
                  <p className="text-xs">아직 저장된 오답이 없어요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {errorLogs.map((log) => {
                    const hasResult = !!log.result
                    const conf = log.result?.confidence ?? 0
                    const confPct = Math.round(conf * 100)
                    const isHighConf = conf >= 0.8
                    const verified = (log.result?.verificationRounds ?? 0) > 0
                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "group relative border rounded-xl p-3 transition-all cursor-pointer",
                          hasResult
                            ? "border-border hover:border-primary/40 hover:bg-primary/5"
                            : "border-border/60 hover:border-border bg-muted/30"
                        )}
                        onClick={() => {
                          onSelectErrorLog?.(log)
                          setShowLogs(false)
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-center gap-1.5 mb-1.5 pr-6">
                          <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {log.domain}
                          </span>
                          {!hasResult && (
                            <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                              결과 없음
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground ml-auto">{formatTime(log.savedAt)}</span>
                        </div>

                        {/* Input text preview */}
                        <p className="text-xs text-foreground/70 leading-snug line-clamp-2 mb-2">{log.text}</p>

                        {/* Result badge */}
                        {hasResult && log.result && (
                          <div className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2 py-1.5 border",
                            isHighConf
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-amber-500/5 border-amber-500/20"
                          )}>
                            <div className={cn(
                              "p-0.5 rounded",
                              isHighConf ? "bg-emerald-500/15" : "bg-amber-500/15"
                            )}>
                              <Target className={cn("h-2.5 w-2.5", isHighConf ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")} />
                            </div>
                            <span className="text-[10px] font-semibold text-foreground truncate flex-1">
                              {log.result.rootCauseLabel}
                            </span>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                              isHighConf
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            )}>
                              {confPct}%
                            </span>
                            {verified && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-blue-500/15 text-blue-700 dark:text-blue-400">
                                검증됨
                              </span>
                            )}
                          </div>
                        )}

                        {/* No-result state */}
                        {!hasResult && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <AlertCircle className="h-2.5 w-2.5" />
                            분석 미완료
                          </div>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id) }}
                          className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── 오답 분석 탭 ── */
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-1" suppressHydrationWarning>어디서 막혔나요?</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  틀린 문제, 잘못된 풀이, 이해 안 되는 부분, 또는 궁금한 개념을 입력하세요
                </p>
              </div>

              {/* Demo presets — 튜토리얼 그래프에서만 노출 */}
              {showPresets && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">튜토리얼 · 데모 예시</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => handlePresetClick(p.text)}
                        title={p.tooltip}
                        className={cn(
                          "text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all",
                          p.color
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {onDemoReset && (
                    <button
                      onClick={handleDemoReset}
                      className={cn(
                        "w-full flex items-center justify-center gap-1.5 text-[10px] font-medium py-1.5 rounded-lg border transition-all",
                        resetConfirm
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                      )}
                    >
                      <RefreshCcw className="h-2.5 w-2.5" />
                      {resetConfirm ? "정말 초기화할까요? 다시 클릭" : "데모 상태 초기화"}
                    </button>
                  )}
                </div>
              )}

              {/* 드래그 앤 드롭 영역 */}
              <div
                className={cn(
                  "relative rounded-xl transition-colors",
                  isDragging && "ring-2 ring-primary ring-offset-2"
                )}
                onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current <= 0) { setIsDragging(false); dragCounter.current = 0 } }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault(); setIsDragging(false); dragCounter.current = 0
                  const f = e.dataTransfer.files[0]
                  if (f) handleDragFile(f)
                }}
              >
                {isDragging && (
                  <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center">
                    <p className="text-xs font-semibold text-primary">이미지를 여기에 놓으세요</p>
                  </div>
                )}
                <Textarea
                  placeholder={imageFile
                    ? "(선택사항) 이미지에 대한 추가 설명을 입력하세요..."
                    : "오답, 풀이 과정, 또는 궁금한 내용을 입력하세요.\n이미지도 드래그/첨부 가능합니다.\n\n예시: 행렬 A = [[1,2],[3,4]]의 역행렬을 구했는데 [[4,-2],[-3,1]]이 나왔습니다..."
                  }
                  className="min-h-[140px] resize-none text-sm bg-background border-border focus:ring-primary placeholder:text-muted-foreground/60"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {/* 이미지 업로드 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && f.size <= 10 * 1024 * 1024) setImageFile(f)
                  e.target.value = ""
                }}
              />

              {imageFile ? (
                <div className="relative rounded-xl border border-primary/30 overflow-hidden bg-muted/30">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="업로드된 문제"
                    className="w-full max-h-48 object-contain"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                  <button
                    onClick={() => setImageFile(null)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="px-3 py-1.5 text-[10px] text-primary font-medium bg-primary/5 border-t border-primary/20">
                    📎 {imageFile.name} ({(imageFile.size / 1024).toFixed(0)}KB)
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-primary text-xs transition-all disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" />
                  문제 이미지 첨부 (사진/캡처)
                </button>
              )}

              <Button
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-medium"
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!inputText.trim() && !imageFile)}
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-4 w-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    <span>분석 중 ({(analysisStep ?? 0) + 1}/3)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    <span>결손 개념 분석</span>
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  현재 그래프: <strong>{graphDomain}</strong><br />
                  AI가 오답을 분석하여 부족한 선행 개념을 지식 그래프에서 찾아냅니다.
                </p>
              </div>

              {/* Recent Analyses */}
              {recentAnalyses.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">최근 분석 기록</h3>
                  </div>
                  <div className="space-y-2">
                    {recentAnalyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="flex items-center gap-1 p-3 rounded-xl border transition-all duration-200 group bg-card border-border hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
                      >
                        <button
                          onClick={() => onSelectAnalysis(analysis)}
                          className="flex items-start gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {analysis.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {analysis.subject} · {formatTime(analysis.timestamp)}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteAnalysis(analysis.id) }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">Powered by Claude AI</p>
        </div>
      </aside>

        {/* Toggle tab — 사이드바 오른쪽 가장자리 중앙에 연결 */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="self-center -ml-px w-6 h-14 flex items-center justify-center bg-card border border-l-0 border-border rounded-r-lg shadow-md hover:bg-muted transition-colors shrink-0"
          aria-label={isCollapsed ? "사이드바 열기" : "사이드바 닫기"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* 오답 노트 상세 팝업 */}
      {activeQuiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveQuiz(null)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full">{activeQuiz.nodeLabel}</span>
                  <p className="text-[10px] text-muted-foreground mt-2">
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
                        "flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm transition-colors",
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
                      )}>
                        {letter}
                      </span>
                      <span className="flex-1 text-foreground">{opt}</span>
                      {isCorrect && <span className="text-[9px] font-bold text-green-600 shrink-0">정답</span>}
                      {isSelected && !isCorrect && <span className="text-[9px] font-bold text-red-500 shrink-0">내 선택</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20">
              <button
                onClick={() => setActiveQuiz(null)}
                className="w-full h-9 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
