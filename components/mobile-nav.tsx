"use client"

import { useState } from "react"
import { Menu, X, BrainCircuit, Sparkles, Clock, BookOpen, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { Analysis } from "@/components/left-sidebar"

interface MobileNavProps {
  inputText: string
  setInputText: (text: string) => void
  isAnalyzing: boolean
  onAnalyze: () => void
  recentAnalyses: Analysis[]
  onSelectAnalysis: (analysis: Analysis) => void
}

export function MobileNav({
  inputText,
  setInputText,
  isAnalyzing,
  onAnalyze,
  recentAnalyses,
  onSelectAnalysis,
}: MobileNavProps) {
  const [open, setOpen] = useState(false)

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
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/25">
            <BrainCircuit className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Linker</h1>
            <p className="text-xs text-muted-foreground">AI Root Cause Learning</p>
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0">
            <SheetHeader className="p-6 border-b border-border">
              <SheetTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/25">
                  <BrainCircuit className="h-5 w-5 text-primary-foreground" />
                </div>
                <span>Error Analyzer</span>
              </SheetTitle>
              <SheetDescription className="sr-only">
                Analyze your learning errors and trace them to root causes
              </SheetDescription>
            </SheetHeader>

            <div className="p-6 overflow-auto max-h-[calc(100vh-100px)]">
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-1">Diagnostic Input</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enter your incorrect solution or reasoning
                  </p>
                </div>

                <Textarea
                  placeholder="Paste your problem or solution here..."
                  className="min-h-[120px] resize-none text-sm"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                <Button
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-medium"
                  onClick={() => {
                    onAnalyze()
                    setOpen(false)
                  }}
                  disabled={isAnalyzing || !inputText.trim()}
                >
                  {isAnalyzing ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span>Analyze Root Cause</span>
                    </>
                  )}
                </Button>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Traces errors to missing foundational concepts.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Recent</h3>
                </div>

                <div className="space-y-2">
                  {recentAnalyses.slice(0, 3).map((analysis) => (
                    <button
                      key={analysis.id}
                      onClick={() => {
                        onSelectAnalysis(analysis)
                        setOpen(false)
                      }}
                      className="w-full text-left p-3 rounded-xl border bg-card border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
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
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
