"use client"

import { Sparkles, Clock, BookOpen, BrainCircuit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { Analysis } from "@/app/page"

interface LeftSidebarProps {
  inputText: string
  setInputText: (text: string) => void
  isAnalyzing: boolean
  onAnalyze: () => void
  recentAnalyses: Analysis[]
}

export function LeftSidebar({
  inputText,
  setInputText,
  isAnalyzing,
  onAnalyze,
  recentAnalyses,
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
    <aside className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Linker</h1>
            <p className="text-xs text-muted-foreground">AI Knowledge Graph</p>
          </div>
        </div>
      </div>

      {/* Diagnostic Input Section */}
      <div className="p-6 flex-1 overflow-auto">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-foreground mb-1">Diagnostic Input</h2>
            <p className="text-xs text-muted-foreground">
              Enter your incorrect answer or problem to analyze
            </p>
          </div>

          <Textarea
            placeholder="Paste your math problem, solution, or reasoning here...

Example: I tried to find the inverse of matrix A = [[1,2],[3,4]] and got [[4,-2],[-3,1]] but my answer was marked wrong..."
            className="min-h-[180px] resize-none text-sm bg-background border-border focus:ring-primary"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
            onClick={onAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
          >
            {isAnalyzing ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Root Cause
              </>
            )}
          </Button>
        </div>

        {/* Recent Analyses */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Recent Analyses</h3>
          </div>

          <div className="space-y-2">
            {recentAnalyses.map((analysis) => (
              <button
                key={analysis.id}
                className="w-full text-left p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
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
      <div className="p-4 border-t border-border">
        <p className="text-xs text-center text-muted-foreground">
          Powered by AI Knowledge Graph
        </p>
      </div>
    </aside>
  )
}
