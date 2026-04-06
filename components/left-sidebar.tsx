"use client"

import { Sparkles, Clock, BookOpen, BrainCircuit, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
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
  recentAnalyses: Analysis[]
  onSelectAnalysis: (analysis: Analysis) => void
}

export function LeftSidebar({
  inputText,
  setInputText,
  isAnalyzing,
  analysisStep,
  onAnalyze,
  recentAnalyses,
  onSelectAnalysis,
}: LeftSidebarProps) {
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

  return (
    <aside className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0 max-md:hidden">
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

      {/* Diagnostic Input Section */}
      <div className="p-6 flex-1 overflow-auto">
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
                <Spinner className="h-4 w-4 mr-2" />
                <span>분석 중 ({(analysisStep ?? 0) + 1}/4)...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                <span>결손 개념 분석</span>
              </>
            )}
          </Button>

          {/* Helper Text */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI가 오답을 분석하여 부족한 선행 개념을 지식 그래프에서 찾아냅니다.
            </p>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">최근 분석 기록</h3>
          </div>

          <div className="space-y-2">
            {recentAnalyses.map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => onSelectAnalysis(analysis)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all duration-200 group",
                  "bg-card border-border hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
                )}
              >
                <div className="flex items-start gap-3">
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
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30">
        <p className="text-xs text-center text-muted-foreground">
          Powered by AI Knowledge Graph Technology
        </p>
      </div>
    </aside>
  )
}
