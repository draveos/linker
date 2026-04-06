"use client"

import { Sparkles, Clock, BookOpen, BrainCircuit, Info, Settings, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Analysis } from "@/app/page"

interface LeftSidebarProps {
  inputText: string
  setInputText: (text: string) => void
  isAnalyzing: boolean
  analysisStep?: number
  onAnalyze: () => void
  recentAnalyses: Analysis[]
  onSelectAnalysis: (analysis: Analysis) => void
  onShowProgress?: () => void
  editMode?: boolean
  setEditMode?: (mode: boolean) => void
  filterType?: "all" | "mastered" | "concept" | "root-cause"
  setFilterType?: (type: "all" | "mastered" | "concept" | "root-cause") => void
}

export function LeftSidebar({
  inputText,
  setInputText,
  isAnalyzing,
  analysisStep,
  onAnalyze,
  recentAnalyses,
  onSelectAnalysis,
  onShowProgress,
  editMode,
  setEditMode,
  filterType,
  setFilterType,
}: LeftSidebarProps) {
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
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
            <p className="text-xs text-muted-foreground font-medium">AI-based Root Cause Learning</p>
          </div>
        </div>
      </div>

      {/* Diagnostic Input Section */}
      <div className="p-6 flex-1 overflow-auto">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">Diagnostic Input</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your incorrect solution, wrong reasoning, or problem statement
            </p>
          </div>

          <Textarea
            placeholder="Paste your math problem, solution, or reasoning here...

Example: I tried to find the inverse of matrix A = [[1,2],[3,4]] and got [[4,-2],[-3,1]] but my answer was marked wrong..."
            className="min-h-[160px] resize-none text-sm bg-background border-border focus:ring-primary placeholder:text-muted-foreground/60"
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
                <span>Analyzing (Step {(analysisStep || 0) + 1}/4)...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                <span>Analyze Root Cause</span>
              </>
            )}
          </Button>

          {/* Helper Text */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This demo traces your errors to identify the missing foundational concept in your knowledge graph.
            </p>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Analyses</h3>
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
      <div className="p-4 border-t border-border bg-muted/30 space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode?.(!editMode)}
            className={cn(
              editMode && "bg-primary/10 border-primary/50 text-primary"
            )}
          >
            <Settings className={cn("h-4 w-4 mr-2", editMode && "text-primary")} />
            {editMode ? "Done Editing" : "Edit Graph"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShowProgress}
          >
            <Sliders className="h-4 w-4 mr-2" />
            Progress
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Powered by AI Knowledge Graph Technology
        </p>
      </div>
    </aside>
  )
}
