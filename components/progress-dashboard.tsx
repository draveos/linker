"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, TrendingUp, BookOpen, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Analysis } from "@/app/page"

interface ProgressDashboardProps {
  isOpen: boolean
  onClose: () => void
  analysisHistory: Analysis[]
}

function ProgressDashboardContent({ isOpen, onClose, analysisHistory }: ProgressDashboardProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isOpen) return null

  // Calculate statistics
  const totalAnalyses = analysisHistory.length
  const subjectCounts = analysisHistory.reduce((acc, a) => {
    acc[a.subject] = (acc[a.subject] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const masteryStats = [
    { name: "Linear Algebra", mastery: 68, concepts: 7 },
    { name: "Calculus", mastery: 62, concepts: 5 },
    { name: "Data Structures", mastery: 71, concepts: 5 },
  ]

  const recentConcepts = analysisHistory.slice(0, 5).map((a) => ({
    title: a.title,
    subject: a.subject,
    timestamp: a.timestamp,
    confidence: Math.floor(Math.random() * 20 + 70),
  }))

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Learning Progress</h2>
            <p className="text-sm text-muted-foreground">Track your mastery across concepts</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Total Analyses</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalAnalyses || 3}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Subjects</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{Object.keys(subjectCounts).length || 3}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Avg. Confidence</span>
              </div>
              <p className="text-3xl font-bold text-foreground">68%</p>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Mastery by Subject</h3>
            <div className="space-y-4">
              {masteryStats.map((stat) => (
                <div key={stat.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{stat.name}</p>
                      <p className="text-xs text-muted-foreground">{stat.concepts} concepts</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg text-foreground">{stat.mastery}%</p>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        stat.mastery >= 70 ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600"
                      )}>
                        {stat.mastery >= 70 ? "Strong" : "Developing"}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        stat.mastery >= 70 ? "bg-primary" : "bg-amber-500"
                      )}
                      style={{ width: `${stat.mastery}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Concepts */}
          {recentConcepts.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Recently Analyzed</h3>
              <div className="space-y-2">
                {recentConcepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{concept.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {concept.subject} · {formatDate(concept.timestamp)}
                        </p>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                        concept.confidence >= 75
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-500/15 text-amber-600"
                      )}>
                        {concept.confidence}% confidence
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Tips */}
          <div className="rounded-xl border border-border bg-primary/5 p-6">
            <h3 className="font-bold text-foreground mb-3">Recommended Next Steps</h3>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary mt-0.5">1.</span>
                <span>Focus on Data Structures concepts to bring mastery up to 80%+</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary mt-0.5">2.</span>
                <span>Review Calculus Chain Rule and Integration for stronger foundation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary mt-0.5">3.</span>
                <span>Take quizzes on your weak areas to reinforce understanding</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-card p-6 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button className="flex-1">
            View Detailed Analytics
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export function ProgressDashboard(props: ProgressDashboardProps) {
  return <ProgressDashboardContent {...props} />
}
