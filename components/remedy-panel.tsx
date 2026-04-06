"use client"

import { X, Lightbulb, Play, BookOpen, ArrowRight, CheckCircle, AlertCircle, Target, GraduationCap, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SelectedNode } from "@/app/page"

interface RemedyPanelProps {
  selectedNode: SelectedNode | null
  onClose: () => void
  onOpenQuiz?: () => void
}

// Dynamic content based on node ID for more realistic experience
const nodeRemedyContent: Record<string, {
  explanation: string
  video: string
  videoDuration: string
  summary: string
  prerequisites: string[]
  nextSteps: string[]
}> = {
  "4": {
    explanation: "The determinant is a scalar value computed from a square matrix that encodes properties of the linear transformation. For a 2×2 matrix [[a,b],[c,d]], the determinant is ad - bc. You may have forgotten to subtract the product of the anti-diagonal, or made a sign error.",
    video: "Understanding Determinants",
    videoDuration: "3:45",
    summary: "Determinants measure how a matrix scales area/volume. The sign tells you if orientation is preserved.",
    prerequisites: ["Matrix Multiplication", "Scalar Operations"],
    nextSteps: ["Practice 2×2 determinants", "Move to 3×3 matrices using cofactor expansion"],
  },
  "5": {
    explanation: "To find the inverse of a matrix, you need to first calculate its determinant. If det(A) = 0, the matrix is singular and has no inverse. For a 2×2 matrix, swap the diagonal elements, negate the off-diagonal elements, and divide by the determinant.",
    video: "Finding Matrix Inverses",
    videoDuration: "4:20",
    summary: "The inverse matrix A⁻¹ satisfies A × A⁻¹ = I. It's used to solve linear systems and transformations.",
    prerequisites: ["Determinants", "Identity Matrix"],
    nextSteps: ["Practice 2×2 inverses", "Learn Gaussian elimination for larger matrices"],
  },
  "6": {
    explanation: "Cofactor expansion is a method to calculate determinants of larger matrices by breaking them down into smaller ones. Each element is multiplied by its cofactor (minor times a sign based on position).",
    video: "Cofactor Expansion Method",
    videoDuration: "5:10",
    summary: "Use cofactors to recursively compute determinants of any size matrix.",
    prerequisites: ["Determinants", "Matrix Operations"],
    nextSteps: ["Practice 3×3 determinants", "Learn about adjugate matrices"],
  },
  "7": {
    explanation: "Linear systems can be solved using matrix methods like Gaussian elimination, Cramer's rule, or matrix inversion. The key is setting up the augmented matrix correctly and performing row operations.",
    video: "Solving Linear Systems",
    videoDuration: "6:00",
    summary: "Represent systems as Ax = b and solve for x using various matrix techniques.",
    prerequisites: ["Matrix Inverse", "Row Operations"],
    nextSteps: ["Practice Gaussian elimination", "Learn about solution types (unique, none, infinite)"],
  },
  "10": {
    explanation: "The chain rule states that the derivative of a composite function f(g(x)) is f'(g(x)) × g'(x). You need to identify the outer and inner functions, then multiply their derivatives while keeping the inner function intact in the outer derivative.",
    video: "Mastering the Chain Rule",
    videoDuration: "4:30",
    summary: "Chain rule: d/dx[f(g(x))] = f'(g(x)) · g'(x). Think 'derivative of outside times derivative of inside'.",
    prerequisites: ["Basic Derivatives", "Function Composition"],
    nextSteps: ["Practice nested functions", "Combine with product and quotient rules"],
  },
  "11": {
    explanation: "Integration is the reverse of differentiation. The key is recognizing patterns and applying the correct technique: u-substitution, integration by parts, or partial fractions. Don't forget the constant of integration!",
    video: "Introduction to Integration",
    videoDuration: "5:45",
    summary: "Integration finds the antiderivative. The fundamental theorem connects it to area under curves.",
    prerequisites: ["Derivatives", "Chain Rule"],
    nextSteps: ["Master u-substitution", "Learn integration by parts"],
  },
  "12": {
    explanation: "Partial derivatives treat all variables except one as constants. For f(x,y), ∂f/∂x differentiates with respect to x treating y as constant. This extends calculus to multivariable functions.",
    video: "Partial Derivatives Explained",
    videoDuration: "4:15",
    summary: "Partial derivatives measure rate of change in one direction while holding others fixed.",
    prerequisites: ["Chain Rule", "Multivariable Functions"],
    nextSteps: ["Practice gradient vectors", "Learn about directional derivatives"],
  },
  "14": {
    explanation: "Recursion requires a base case and a recursive case. The base case stops the recursion; the recursive case breaks the problem into smaller subproblems. Stack overflow occurs when the base case is never reached.",
    video: "Thinking Recursively",
    videoDuration: "5:00",
    summary: "Recursion solves problems by having a function call itself with simpler inputs until reaching a base case.",
    prerequisites: ["Functions", "Call Stack"],
    nextSteps: ["Practice recursive algorithms", "Learn about tail recursion"],
  },
  "15": {
    explanation: "Trees are hierarchical structures with a root node, child nodes, and leaf nodes. Each node can have multiple children but only one parent. Understanding tree properties is essential for traversal algorithms.",
    video: "Tree Data Structures",
    videoDuration: "4:45",
    summary: "Trees organize data hierarchically. Key properties: height, depth, balance, and completeness.",
    prerequisites: ["Pointers/References", "Recursion"],
    nextSteps: ["Implement basic tree operations", "Learn about binary search trees"],
  },
  "16": {
    explanation: "Tree traversal visits each node exactly once. The three main methods are: in-order (left, root, right), pre-order (root, left, right), and post-order (left, right, root). Each has different use cases.",
    video: "Tree Traversal Algorithms",
    videoDuration: "5:30",
    summary: "Traversal order matters! In-order gives sorted output for BSTs. Pre-order copies trees. Post-order deletes them.",
    prerequisites: ["Trees", "Recursion"],
    nextSteps: ["Implement all three traversals", "Learn about level-order (BFS) traversal"],
  },
  "17": {
    explanation: "Binary search requires a sorted array. It repeatedly divides the search space in half by comparing the target with the middle element. Time complexity is O(log n), much faster than linear search.",
    video: "Binary Search Deep Dive",
    videoDuration: "3:30",
    summary: "Binary search: check middle, go left if smaller, right if larger. Halves the problem each step.",
    prerequisites: ["Arrays", "Recursion"],
    nextSteps: ["Implement iterative and recursive versions", "Learn about binary search trees"],
  },
}

const defaultContent = {
  explanation: "This concept is foundational for building stronger mathematical and computational intuition. Understanding it well will help you tackle more advanced topics.",
  video: "Concept Overview",
  videoDuration: "4:00",
  summary: "Build a solid foundation with this concept before moving to more complex applications.",
  prerequisites: ["Basic arithmetic", "Logical reasoning"],
  nextSteps: ["Complete practice exercises", "Review related concepts"],
}

export function RemedyPanel({ selectedNode, onClose, onOpenQuiz }: RemedyPanelProps) {
  const isOpen = selectedNode !== null
  const content = selectedNode ? (nodeRemedyContent[selectedNode.id] || defaultContent) : null

  return (
    <aside
      className={cn(
        "w-[380px] border-l border-border bg-card flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out max-lg:hidden",
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 absolute right-0"
      )}
    >
      {selectedNode && content && (
        <>
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      "p-2 rounded-xl",
                      selectedNode.type === "missing" && "bg-destructive/15",
                      selectedNode.type === "mastered" && "bg-primary/15",
                      selectedNode.type === "standard" && "bg-secondary"
                    )}
                  >
                    {selectedNode.type === "missing" && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {selectedNode.type === "mastered" && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                    {selectedNode.type === "standard" && (
                      <Target className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-full",
                      selectedNode.type === "missing" && "bg-destructive/15 text-destructive",
                      selectedNode.type === "mastered" && "bg-primary/15 text-primary",
                      selectedNode.type === "standard" && "bg-secondary text-muted-foreground"
                    )}
                  >
                    {selectedNode.type === "missing" && "Root Cause"}
                    {selectedNode.type === "mastered" && "Mastered"}
                    {selectedNode.type === "standard" && "Concept"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {selectedNode.type === "missing"
                    ? `Targeted Remedy: ${selectedNode.label}`
                    : selectedNode.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedNode.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0 hover:bg-secondary"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* AI Confidence Score */}
            {selectedNode.type === "missing" && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">AI Confidence</span>
                </div>
                <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-primary/20 text-primary">
                  {Math.floor(Math.random() * 15 + 78)}%
                </span>
              </div>
            )}

            {/* Related Concepts Detected */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Related Concepts Detected
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Matrix Multiplication", score: 0.72 },
                  { label: "Linear Transformations", score: 0.68 },
                  { label: "Scalar Operations", score: 0.45 },
                ].map((concept) => (
                  <div key={concept.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{concept.label}</span>
                      <span className="text-muted-foreground">{(concept.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                        style={{ width: `${concept.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Explanation */}
            <div
              className={cn(
                "rounded-2xl p-4",
                selectedNode.type === "missing"
                  ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50"
                  : selectedNode.type === "mastered"
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-secondary/50 border border-border"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  selectedNode.type === "missing" ? "bg-amber-200/50 dark:bg-amber-800/30" : "bg-primary/10"
                )}>
                  <Lightbulb
                    className={cn(
                      "h-4 w-4",
                      selectedNode.type === "missing"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-primary"
                    )}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {selectedNode.type === "missing" ? "Why you missed it" : "AI Insight"}
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{content.explanation}</p>
            </div>

            {/* Micro-Learning Video */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                3-Minute Micro-Learning
              </h3>
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border aspect-video group cursor-pointer hover:shadow-lg transition-shadow">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 group-hover:shadow-primary/40 transition-all duration-300">
                    <Play className="h-7 w-7 text-primary-foreground ml-1" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-4">{content.video}</p>
                  <p className="text-xs text-muted-foreground mt-1">{content.videoDuration}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{content.summary}</p>
            </div>

            {/* Prerequisites */}
            {content.prerequisites.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Prerequisites
                </h3>
                <div className="flex flex-wrap gap-2">
                  {content.prerequisites.map((prereq) => (
                    <span
                      key={prereq}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground border border-border hover:bg-secondary/80 cursor-pointer transition-colors"
                    >
                      {prereq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Next Steps</h3>
              <div className="space-y-2">
                {content.nextSteps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {index + 1}
                    </div>
                    <span className="text-sm text-foreground flex-1">{step}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-border bg-muted/30">
            <Button 
              onClick={onOpenQuiz}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-semibold text-base"
            >
              Take Quick Quiz
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}
