"use client"

import { useState, useMemo } from "react"
import { ZoomIn, ZoomOut, Maximize2, Check, AlertTriangle, Circle, X, Lightbulb, Play, ArrowRight, BookOpen, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { SelectedNode } from "@/app/page"

interface MobileGraphProps {
  onNodeClick: (node: SelectedNode) => void
  selectedNodeId?: string
  activeRootCauseId?: string | null
  isAnalyzing?: boolean
  selectedNode: SelectedNode | null
  onClosePanel: () => void
}

interface GraphNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  x: number
  y: number
  description?: string
}

const baseNodes: Omit<GraphNode, "type">[] = [
  { id: "1", label: "Vectors", x: 15, y: 15, description: "Vector operations" },
  { id: "2", label: "Matrix Ops", x: 35, y: 15, description: "Basic matrix arithmetic" },
  { id: "3", label: "Multiplication", x: 18, y: 32, description: "Matrix multiplication" },
  { id: "4", label: "Determinants", x: 40, y: 32, description: "Matrix determinants" },
  { id: "5", label: "Inverse", x: 15, y: 50, description: "Matrix inverse" },
  { id: "8", label: "Limits", x: 60, y: 15, description: "Understanding limits" },
  { id: "9", label: "Derivatives", x: 80, y: 15, description: "Rate of change" },
  { id: "10", label: "Chain Rule", x: 70, y: 32, description: "Composite derivatives" },
  { id: "14", label: "Recursion", x: 55, y: 55, description: "Self-referential algorithms" },
  { id: "15", label: "Trees", x: 80, y: 55, description: "Tree structures" },
  { id: "16", label: "Traversal", x: 68, y: 72, description: "Tree traversal" },
]

const connections: [string, string][] = [
  ["1", "2"], ["1", "3"], ["2", "3"], ["2", "4"], ["3", "4"], ["3", "5"], ["4", "5"],
  ["8", "9"], ["9", "10"],
  ["14", "15"], ["14", "16"], ["15", "16"],
]

const masteredIds = ["1", "2", "8", "9"]

const nodeRemedyContent: Record<string, { explanation: string; video: string; videoDuration: string; nextSteps: string[] }> = {
  "4": {
    explanation: "For a 2×2 matrix [[a,b],[c,d]], the determinant is ad - bc.",
    video: "Understanding Determinants",
    videoDuration: "3:45",
    nextSteps: ["Practice 2×2 determinants", "Move to 3×3 matrices"],
  },
  "5": {
    explanation: "Find the determinant first. If det(A) = 0, no inverse exists.",
    video: "Finding Matrix Inverses",
    videoDuration: "4:20",
    nextSteps: ["Practice 2×2 inverses", "Learn Gaussian elimination"],
  },
  "10": {
    explanation: "Chain rule: d/dx[f(g(x))] = f'(g(x)) · g'(x).",
    video: "Mastering the Chain Rule",
    videoDuration: "4:30",
    nextSteps: ["Practice nested functions", "Combine with other rules"],
  },
  "14": {
    explanation: "Recursion requires a base case and recursive case.",
    video: "Thinking Recursively",
    videoDuration: "5:00",
    nextSteps: ["Practice recursive algorithms", "Learn tail recursion"],
  },
  "16": {
    explanation: "Three methods: in-order, pre-order, and post-order traversal.",
    video: "Tree Traversal Algorithms",
    videoDuration: "5:30",
    nextSteps: ["Implement all traversals", "Learn BFS traversal"],
  },
}

const defaultContent = {
  explanation: "Build a solid foundation with this concept.",
  video: "Concept Overview",
  videoDuration: "4:00",
  nextSteps: ["Complete exercises", "Review prerequisites"],
}

export function MobileGraph({ 
  onNodeClick, 
  selectedNodeId, 
  activeRootCauseId,
  isAnalyzing,
  selectedNode,
  onClosePanel,
}: MobileGraphProps) {
  const [zoom, setZoom] = useState(1)

  const nodes = useMemo(() => {
    return baseNodes.map((node) => ({
      ...node,
      type: (activeRootCauseId === node.id 
        ? "missing" 
        : masteredIds.includes(node.id) 
          ? "mastered" 
          : "standard") as "standard" | "mastered" | "missing",
    }))
  }, [activeRootCauseId])

  const getNodeById = (id: string) => nodes.find((n) => n.id === id)
  const content = selectedNode ? (nodeRemedyContent[selectedNode.id] || defaultContent) : null

  return (
    <main className="flex-1 relative bg-muted/30 overflow-hidden md:hidden">
      {/* Dotted Grid Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground) / 0.15) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      />

      {/* Analyzing Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">Analyzing...</p>
              <p className="text-xs text-muted-foreground">Tracing root cause</p>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        className="absolute inset-0 transition-transform duration-300"
        style={{ transform: `scale(${zoom})` }}
      >
        <div className="relative w-full h-full">
          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map(([from, to]) => {
              const fromNode = getNodeById(from)
              const toNode = getNodeById(to)
              if (!fromNode || !toNode) return null
              const isMissing = fromNode.type === "missing" || toNode.type === "missing"
              return (
                <line
                  key={`${from}-${to}`}
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke={isMissing ? "hsl(var(--destructive))" : "hsl(var(--border))"}
                  strokeWidth={isMissing ? 2 : 1.5}
                  strokeDasharray={isMissing ? "4,3" : "none"}
                  className={cn(isMissing && "animate-pulse")}
                  opacity={0.7}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onNodeClick({
                id: node.id,
                label: node.label,
                type: node.type,
                description: node.description,
              })}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 whitespace-nowrap",
                node.type === "standard" && "bg-card border border-border text-foreground shadow-sm",
                node.type === "mastered" && "bg-primary text-primary-foreground shadow-md shadow-primary/20",
                node.type === "missing" && "bg-destructive/15 border border-destructive text-destructive animate-pulse shadow-md",
                selectedNodeId === node.id && "ring-2 ring-ring ring-offset-1"
              )}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {node.type === "mastered" && <Check className="h-3 w-3" />}
              {node.type === "missing" && <AlertTriangle className="h-3 w-3" />}
              {node.type === "standard" && <Circle className="h-2.5 w-2.5 text-muted-foreground" />}
              {node.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border shadow-lg">
        <h2 className="text-sm font-bold text-foreground">Knowledge Graph</h2>
        <p className="text-xs text-muted-foreground">Tap nodes to explore</p>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-xl p-1.5 shadow-lg">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.max(z - 0.15, 0.6))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium px-2 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.min(z + 0.15, 1.5))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(1)}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Remedy Sheet */}
      <Sheet open={selectedNode !== null} onOpenChange={(open) => !open && onClosePanel()}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0">
          {selectedNode && content && (
            <>
              <SheetHeader className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl",
                    selectedNode.type === "missing" && "bg-destructive/15",
                    selectedNode.type === "mastered" && "bg-primary/15",
                    selectedNode.type === "standard" && "bg-secondary"
                  )}>
                    {selectedNode.type === "missing" && <AlertTriangle className="h-5 w-5 text-destructive" />}
                    {selectedNode.type === "mastered" && <Check className="h-5 w-5 text-primary" />}
                    {selectedNode.type === "standard" && <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-left">{selectedNode.label}</SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground">{selectedNode.description}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="p-4 overflow-auto space-y-4">
                {/* Explanation */}
                <div className={cn(
                  "rounded-xl p-3",
                  selectedNode.type === "missing" ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50" : "bg-secondary/50"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium">{selectedNode.type === "missing" ? "Why you missed it" : "Insight"}</span>
                  </div>
                  <p className="text-sm text-foreground/80">{content.explanation}</p>
                </div>

                {/* Video */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Micro-Learning
                  </h3>
                  <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-background border border-border aspect-video flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">{content.videoDuration}</div>
                  </div>
                </div>

                {/* Next Steps */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Next Steps</h3>
                  <div className="space-y-2">
                    {content.nextSteps.map((step, i) => (
                      <div key={step} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                        <span className="text-sm flex-1">{step}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full h-11 bg-primary text-primary-foreground font-medium">
                  Take Quick Quiz
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  )
}
