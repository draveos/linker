import { useState } from "react"
import {
  BrainCircuit, Sparkles, Clock, ChevronLeft, ChevronRight, CheckCircle2
} from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Spinner } from "./ui/spinner"
import { cn } from "../lib/utils"

export interface Analysis {
  id: string
  title: string
  subject: string
  timestamp: string
  rootCauseId: string  // 결손 개념 노드 ID - AI 분석 결과로 결정됨
}

interface LeftSidebarProps {
  inputText: string
  setInputText: (text: string) => void
  isAnalyzing: boolean
  analysisStep: number
  onAnalyze: () => void
  recentAnalyses: Analysis[]
  onSelectAnalysis: (analysis: Analysis) => void
}

const ANALYSIS_STEPS = [
  "개념 매핑 중...",
  "풀이 오류 분석 중...",
  "선행 개념 의존성 추적 중...",
  "결손 개념 확정 중...",
]

export function LeftSidebar({
  inputText,
  setInputText,
  isAnalyzing,
  analysisStep,
  onAnalyze,
  recentAnalyses,
  onSelectAnalysis,
}: LeftSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="relative flex shrink-0">
      {/* Sidebar Panel */}
      <div
        className={cn(
          "flex flex-col h-full bg-card border-r border-border transition-all duration-300 overflow-hidden",
          collapsed ? "w-0 opacity-0" : "w-[300px] opacity-100"
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/25 shrink-0">
              <BrainCircuit className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground tracking-tight">Linker</h1>
              <p className="text-xs text-muted-foreground truncate">AI-based Root Cause Learning</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">진단 입력</label>
            <p className="text-xs text-muted-foreground">오답, 틀린 풀이, 문제 상황을 입력하세요</p>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="예: 행렬 A = [[1,2],[3,4]]의 역행렬을 구했는데 [[4,-2],[-3,1]]이 나왔습니다. 어디서 틀렸나요?"
              className="min-h-[120px] text-sm bg-background border-border focus:border-primary"
              disabled={isAnalyzing}
            />
          </div>

          {/* Analyze Button */}
          <Button
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-medium"
            onClick={onAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
          >
            {isAnalyzing ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                <span>{ANALYSIS_STEPS[analysisStep] || "분석 중..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                <span>결손 개념 분석</span>
              </>
            )}
          </Button>

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
              {ANALYSIS_STEPS.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {idx < analysisStep ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : idx === analysisStep ? (
                    <Spinner className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                  )}
                  <span className={cn(
                    "transition-colors",
                    idx <= analysisStep ? "text-foreground" : "text-muted-foreground/50"
                  )}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recent Analyses */}
          {recentAnalyses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  최근 분석
                </span>
              </div>
              <div className="space-y-1.5">
                {recentAnalyses.map((analysis) => (
                  <button
                    key={analysis.id}
                    onClick={() => onSelectAnalysis(analysis)}
                    className="w-full text-left p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {analysis.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {analysis.subject} · {analysis.timestamp}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center",
          "w-5 h-10 rounded-r-lg bg-card border border-l-0 border-border",
          "text-muted-foreground hover:text-foreground hover:bg-secondary",
          "transition-all duration-200 opacity-40 hover:opacity-100",
          collapsed ? "left-0" : "left-[300px]"
        )}
        title={collapsed ? "사이드바 열기" : "사이드바 닫기"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}
