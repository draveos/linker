"use client"

import { X, Lightbulb, Play, BookOpen, ArrowRight, CheckCircle, AlertCircle, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SelectedNode } from "@/app/page"

interface RemedyPanelProps {
  selectedNode: SelectedNode | null
  onClose: () => void
}

const remedyContent = {
  missing: {
    title: "Determinant Calculation",
    explanation:
      "The determinant is a scalar value that can be computed from the elements of a square matrix and encodes certain properties of the linear transformation. For a 2×2 matrix [[a,b],[c,d]], the determinant is ad - bc. You may have forgotten to subtract the product of the anti-diagonal.",
    video: "Understanding Determinants",
    videoDuration: "3:45",
    summary:
      "Determinants measure how a matrix scales area/volume. Key insight: the sign tells you if orientation is preserved.",
    prerequisites: ["Matrix multiplication", "Scalar operations"],
    nextSteps: ["Practice 2×2 determinants", "Move to 3×3 matrices"],
  },
  mastered: {
    title: "Well Done!",
    explanation:
      "You have demonstrated strong understanding of this concept. Your work shows consistent accuracy and proper application of the underlying principles.",
    video: "Advanced Applications",
    videoDuration: "5:20",
    summary: "Ready to explore more advanced applications and edge cases of this concept.",
    prerequisites: [],
    nextSteps: ["Explore advanced problems", "Help other students"],
  },
  standard: {
    title: "Concept Overview",
    explanation:
      "This is a foundational concept that connects to multiple areas. Understanding it well will help you build stronger mathematical intuition.",
    video: "Concept Deep Dive",
    videoDuration: "4:15",
    summary: "Build a solid foundation before moving to more complex applications.",
    prerequisites: ["Basic arithmetic", "Variable manipulation"],
    nextSteps: ["Complete practice exercises", "Review prerequisites if needed"],
  },
}

export function RemedyPanel({ selectedNode, onClose }: RemedyPanelProps) {
  const isOpen = selectedNode !== null
  const content = selectedNode ? remedyContent[selectedNode.type] : null

  return (
    <aside
      className={cn(
        "w-96 border-l border-border bg-card flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 absolute right-0"
      )}
    >
      {selectedNode && content && (
        <>
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn(
                      "p-1.5 rounded-lg",
                      selectedNode.type === "missing" && "bg-destructive/10",
                      selectedNode.type === "mastered" && "bg-primary/10",
                      selectedNode.type === "standard" && "bg-secondary"
                    )}
                  >
                    {selectedNode.type === "missing" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {selectedNode.type === "mastered" && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                    {selectedNode.type === "standard" && (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      selectedNode.type === "missing" && "bg-destructive/10 text-destructive",
                      selectedNode.type === "mastered" && "bg-primary/10 text-primary",
                      selectedNode.type === "standard" && "bg-secondary text-muted-foreground"
                    )}
                  >
                    {selectedNode.type === "missing" && "Root Cause"}
                    {selectedNode.type === "mastered" && "Mastered"}
                    {selectedNode.type === "standard" && "Concept"}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedNode.type === "missing"
                    ? `Targeted Remedy: ${content.title}`
                    : selectedNode.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedNode.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* AI Explanation */}
            <div
              className={cn(
                "rounded-xl p-4",
                selectedNode.type === "missing"
                  ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                  : selectedNode.type === "mastered"
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-secondary border border-border"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb
                  className={cn(
                    "h-4 w-4",
                    selectedNode.type === "missing"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary"
                  )}
                />
                <span className="text-sm font-medium text-foreground">
                  {selectedNode.type === "missing" ? "Why you missed it" : "AI Insight"}
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{content.explanation}</p>
            </div>

            {/* Micro-Learning Video */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                3-Minute Micro-Learning
              </h3>
              <div className="relative rounded-xl overflow-hidden bg-secondary aspect-video group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-primary-foreground ml-1" />
                  </div>
                  <p className="text-sm font-medium text-foreground mt-3">{content.video}</p>
                  <p className="text-xs text-muted-foreground">{content.videoDuration}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{content.summary}</p>
            </div>

            {/* Prerequisites */}
            {content.prerequisites.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Prerequisites</h3>
                <div className="flex flex-wrap gap-2">
                  {content.prerequisites.map((prereq) => (
                    <span
                      key={prereq}
                      className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground border border-border"
                    >
                      {prereq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Next Steps</h3>
              <div className="space-y-2">
                {content.nextSteps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <span className="text-sm text-foreground flex-1">{step}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-border">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20">
              Take Quick Quiz
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}
