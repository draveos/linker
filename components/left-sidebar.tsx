"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Clock, BookOpen, BrainCircuit, Info, ChevronLeft, ChevronRight, FileText, Network, Trash2, Send, AlertTriangle, RotateCcw } from "lucide-react"
import type { ContextMessage, ValidateContextResponse } from "@/app/api/validate-context/route"
import { MAX_CONTEXT_QUESTIONS as MAX_QUESTIONS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

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
  onGenerateGraph: (lectureText: string, domain: string) => void
  isGeneratingGraph: boolean
  recentAnalyses: Analysis[]
  onSelectAnalysis: (analysis: Analysis) => void
  onDeleteAnalysis: (id: string) => void
  graphDomain: string
}

export function LeftSidebar({
  inputText,
  setInputText,
  isAnalyzing,
  analysisStep,
  onAnalyze,
  onGenerateGraph,
  isGeneratingGraph,
  recentAnalyses,
  onSelectAnalysis,
  onDeleteAnalysis,
  graphDomain,
}: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<"error" | "generate">("error")
  const [lectureText, setLectureText] = useState("")
  const [domain, setDomain] = useState("")

  // Context 보강 채팅 상태
  const [showContextChat, setShowContextChat] = useState(false)
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([])
  const [contextInput, setContextInput] = useState("")
  const [questionCount, setQuestionCount] = useState(0)
  const [isValidating, setIsValidating] = useState(false)
  const [contextWarning, setContextWarning] = useState<"irrelevant" | "off_topic" | null>(null)
  const [pendingEnrichedContext, setPendingEnrichedContext] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [contextMessages])

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    return `${days}일 전`
  }

  const resetContextChat = () => {
    setShowContextChat(false)
    setContextMessages([])
    setContextInput("")
    setQuestionCount(0)
    setContextWarning(null)
    setPendingEnrichedContext(null)
    setIsValidating(false)
  }

  const validateAndAsk = async (
    history: ContextMessage[],
    count: number,
    forceGenerate = false
  ) => {
    if (forceGenerate) {
      const ctx = [
        `도메인: ${domain || "일반"}`,
        `내용: ${lectureText}`,
        ...history.filter(m => m.role === "user").map(m => m.content),
      ].join("\n")
      resetContextChat()
      onGenerateGraph(ctx, domain || "일반")
      return
    }

    setIsValidating(true)
    try {
      const res = await fetch("/api/validate-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain || "일반",
          originalText: lectureText,
          conversationHistory: history,
          questionCount: count,
        }),
      })
      const data: ValidateContextResponse = await res.json()

      if (data.status === "sufficient" && data.enrichedContext) {
        resetContextChat()
        onGenerateGraph(data.enrichedContext, domain || "일반")
      } else if (data.status === "needs_more" && data.question) {
        const newQ: ContextMessage = { role: "ai", content: data.question }
        setContextMessages((prev) => [...prev, newQ])
        setQuestionCount(count + 1)
        setContextWarning(null)
      } else if (data.status === "irrelevant" || data.status === "off_topic") {
        setContextWarning(data.status)
        // 마지막 답변을 보류 상태로
        setPendingEnrichedContext(
          [`도메인: ${domain || "일반"}`, `내용: ${lectureText}`,
           ...history.filter(m => m.role === "user").map(m => m.content)].join("\n")
        )
      }
    } catch {
      // 에러 시 그냥 진행
      resetContextChat()
      onGenerateGraph(lectureText, domain || "일반")
    } finally {
      setIsValidating(false)
    }
  }

  const handleGenerateClick = async () => {
    // 100자 이상이면 바로 생성
    if (lectureText.length >= 100) {
      onGenerateGraph(lectureText, domain || "일반")
      return
    }
    // 부족하면 context 채팅 시작
    setShowContextChat(true)
    await validateAndAsk([], 0)
  }

  const handleContextAnswer = async () => {
    if (!contextInput.trim()) return
    const userMsg: ContextMessage = { role: "user", content: contextInput.trim() }
    const newHistory = [...contextMessages, userMsg]
    setContextMessages(newHistory)
    setContextInput("")
    await validateAndAsk(newHistory, questionCount)
  }

  return (
    <>
      {/* Collapsed Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "fixed top-4 z-30 p-2 bg-card border border-border rounded-lg shadow-lg transition-all duration-300",
          "hover:opacity-100 opacity-60",
          isCollapsed ? "left-4" : "left-[312px]"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-foreground" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "w-80 border-r border-border bg-card flex flex-col h-full shrink-0 transition-all duration-300 fixed md:relative z-20",
          isCollapsed ? "-translate-x-full md:-ml-80" : "translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/25">
              <BrainCircuit className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Linker</h1>
              <p className="text-xs text-muted-foreground font-medium">AI 기반 오답 역추적 학습</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("error")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors",
              activeTab === "error"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            오답 분석
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors",
              activeTab === "generate"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Network className="h-3.5 w-3.5" />
            그래프 생성
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-auto">
          {activeTab === "error" ? (
            /* ── 오답 분석 탭 ── */
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-1">오답 입력</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  틀린 문제, 잘못된 풀이 과정, 또는 이해가 안 되는 부분을 입력하세요
                </p>
              </div>

              <Textarea
                placeholder="예시: 행렬 A = [[1,2],[3,4]]의 역행렬을 구했는데 [[4,-2],[-3,1]]이 나왔습니다. 그런데 답이 틀렸다고 합니다..."
                className="min-h-[140px] resize-none text-sm bg-background border-border focus:ring-primary placeholder:text-muted-foreground/60"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <Button
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-medium"
                onClick={onAnalyze}
                disabled={isAnalyzing || !inputText.trim()}
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
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">최근 분석 기록</h3>
                </div>
                <div className="space-y-2">
                  {recentAnalyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className={cn(
                        "flex items-center gap-1 p-3 rounded-xl border transition-all duration-200 group",
                        "bg-card border-border hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
                      )}
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
            </div>
          ) : (
            /* ── 그래프 생성 탭 ── */
            <div className="space-y-4">
              {!showContextChat ? (
                /* 입력 폼 */
                <>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-1">강의 텍스트로 그래프 생성</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      짧아도 괜찮아요. AI가 부족한 내용은 질문해드릴게요.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">도메인/과목명</label>
                    <input
                      type="text"
                      placeholder="예: 코딩, 선형대수학, 자료구조..."
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </div>

                  <Textarea
                    placeholder="짧게라도 괜찮아요. 예: '파이썬 기초'"
                    className="min-h-[120px] resize-none text-sm bg-background border-border focus:ring-primary placeholder:text-muted-foreground/60"
                    value={lectureText}
                    onChange={(e) => setLectureText(e.target.value)}
                  />

                  <Button
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-medium"
                    onClick={handleGenerateClick}
                    disabled={isGeneratingGraph || isValidating || !lectureText.trim()}
                  >
                    {isGeneratingGraph ? (
                      <>
                        <div className="h-4 w-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                        <span>그래프 생성 중...</span>
                      </>
                    ) : isValidating ? (
                      <>
                        <div className="h-4 w-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                        <span>분석 중...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        <span>지식 그래프 생성</span>
                      </>
                    )}
                  </Button>
                </>
              ) : (
                /* Context 보강 채팅 */
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">내용 보충</h2>
                      <p className="text-xs text-muted-foreground">
                        질문 {Math.min(questionCount, MAX_QUESTIONS)}/{MAX_QUESTIONS}
                      </p>
                    </div>
                    <button
                      onClick={resetContextChat}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* 채팅 메시지 */}
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {/* 원본 입력 */}
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground text-xs px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">
                        {lectureText}
                      </div>
                    </div>

                    {contextMessages.map((msg, i) => (
                      <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "text-xs px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed",
                          msg.role === "ai"
                            ? "bg-muted text-foreground rounded-tl-sm"
                            : "bg-primary text-primary-foreground rounded-tr-sm"
                        )}>
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

                    {/* 경고 메시지 */}
                    {contextWarning && (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                            {contextWarning === "irrelevant"
                              ? "해당 설명은 현재 그래프와 큰 연관이 없어보입니다. 확실하신가요?"
                              : "완전히 다른 주제로 보입니다. 그래도 추가하시겠어요?"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={() => {
                              setContextWarning(null)
                              setPendingEnrichedContext(null)
                            }}
                          >
                            아니오
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => {
                              if (pendingEnrichedContext) {
                                resetContextChat()
                                onGenerateGraph(pendingEnrichedContext, domain || "일반")
                              }
                            }}
                          >
                            {contextWarning === "irrelevant" ? "예" : "그럼에도 추가하기"}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* 입력창 */}
                  {!contextWarning && !isValidating && questionCount > 0 && questionCount <= MAX_QUESTIONS && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="답변 입력..."
                        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={contextInput}
                        onChange={(e) => setContextInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleContextAnswer()}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handleContextAnswer}
                        disabled={!contextInput.trim()}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            Powered by Claude AI
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  )
}
