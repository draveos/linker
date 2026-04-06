"use client"

import { useState, useMemo } from "react"
import { ZoomIn, ZoomOut, Maximize2, Check, AlertTriangle, Circle, X, Lightbulb, Play, ArrowRight, BookOpen, GraduationCap, Settings, Plus, Minus, Filter } from "lucide-react"
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
  editMode?: boolean
  setEditMode?: (mode: boolean) => void
  filterType?: "all" | "mastered" | "concept" | "root-cause"
  setFilterType?: (type: "all" | "mastered" | "concept" | "root-cause") => void
  onOpenQuiz?: () => void
}

interface GraphNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  x: number
  y: number
  description?: string
}

const initialNodes: Omit<GraphNode, "type">[] = [
  { id: "1", label: "Vectors", x: 15, y: 12, description: "Vector operations" },
  { id: "2", label: "Matrix Ops", x: 38, y: 12, description: "Basic matrix arithmetic" },
  { id: "3", label: "Multiplication", x: 15, y: 28, description: "Matrix multiplication" },
  { id: "4", label: "Determinants", x: 38, y: 28, description: "Matrix determinants" },
  { id: "5", label: "Inverse", x: 26, y: 44, description: "Matrix inverse" },
  { id: "8", label: "Limits", x: 58, y: 12, description: "Understanding limits" },
  { id: "9", label: "Derivatives", x: 82, y: 12, description: "Rate of change" },
  { id: "10", label: "Chain Rule", x: 70, y: 28, description: "Composite derivatives" },
  { id: "14", label: "Recursion", x: 58, y: 48, description: "Self-referential algorithms" },
  { id: "15", label: "Trees", x: 82, y: 48, description: "Tree structures" },
  { id: "16", label: "Traversal", x: 70, y: 64, description: "Tree traversal" },
]

const connections: [string, string][] = [
  ["1", "2"], ["1", "3"], ["2", "3"], ["2", "4"], ["3", "4"], ["3", "5"], ["4", "5"],
  ["8", "9"], ["9", "10"],
  ["14", "15"], ["14", "16"], ["15", "16"],
]

const masteredIds = ["1", "2", "8", "9"]

const nodeRemedyContent: Record<string, { explanation: string; video: string; videoDuration: string; nextSteps: string[] }> = {
  "4": {
    explanation: "For a 2x2 matrix [[a,b],[c,d]], the determinant is ad - bc.",
    video: "Understanding Determinants",
    videoDuration: "3:45",
    nextSteps: ["Practice 2x2 determinants", "Move to 3x3 matrices"],
  },
  "5": {
    explanation: "Find the determinant first. If det(A) = 0, no inverse exists.",
    video: "Finding Matrix Inverses",
    videoDuration: "4:20",
    nextSteps: ["Practice 2x2 inverses", "Learn Gaussian elimination"],
  },
  "10": {
    explanation: "Chain rule: d/dx[f(g(x))] = f'(g(x)) * g'(x).",
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
  editMode = false,
  setEditMode,
  filterType = "all",
  setFilterType,
  onOpenQuiz,
}: MobileGraphProps) {
  const [zoom, setZoom] = useState(1)
  const [baseNodes, setBaseNodes] = useState(initialNodes)
  const [showFilters, setShowFilters] = useState(false)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null)

  const nodes = useMemo(() => {
    return baseNodes.map((node) => ({
      ...node,
      type: (activeRootCauseId === node.id 
        ? "missing" 
        : masteredIds.includes(node.id) 
          ? "mastered" 
          : "standard") as "standard" | "mastered" | "missing",
    }))
  }, [baseNodes, activeRootCauseId])

  const getNodeById = (id: string) => nodes.find((n) => n.id === id)
  const content = selectedNode ? (nodeRemedyContent[selectedNode.id] || defaultContent) : null

  const getNodeOpacity = (node: GraphNode) => {
    if (filterType === "all") return 1
    if (filterType === "mastered" && node.type === "mastered") return 1
    if (filterType === "concept" && node.type === "standard") return 1
    if (filterType === "root-cause" && node.type === "missing") return 1
    return 0.2
  }

  const handleDeleteNode = (nodeId: string) => {
    setBaseNodes((prev) => prev.filter((n) => n.id !== nodeId))
  }

  const handleAddNode = () => {
    const newId = (Math.max(...baseNodes.map(n => parseInt(n.id)), 0) + 1).toString()
    setBaseNodes([
      ...baseNodes,
      {
        id: newId,
        label: `Concept ${newId}`,
        x: 50,
        y: 50,
        description: "New concept",
      },
    ])
  }

  const handleTouchStart = (e: React.TouchEvent, nodeId: string) => {
    if (!editMode) return
    const touch = e.touches[0]
    const node = baseNodes.find(n => n.id === nodeId)
    if (node) {
      setDraggedNodeId(nodeId)
      setDragStart({ x: touch.clientX, y: touch.clientY, nodeX: node.x, nodeY: node.y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedNodeId || !dragStart || !editMode) return
    const touch = e.touches[0]
    const container = e.currentTarget.getBoundingClientRect()
    
    const deltaX = ((touch.clientX - dragStart.x) / container.width) * 100
    const deltaY = ((touch.clientY - dragStart.y) / container.height) * 100
    
    setBaseNodes(prev => prev.map(node => 
      node.id === draggedNodeId 
        ? { 
            ...node, 
            x: Math.max(5, Math.min(95, dragStart.nodeX + deltaX)),
            y: Math.max(5, Math.min(85, dragStart.nodeY + deltaY))
          }
        : node
    ))
  }

  const handleTouchEnd = () => {
    setDraggedNodeId(null)
    setDragStart(null)
  }

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
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
            <div key={node.id} className="relative">
              <button
                onTouchStart={(e) => handleTouchStart(e, node.id)}
                onClick={() => {
                  // Only trigger click if not in edit mode
                  if (!editMode) {
                    onNodeClick({
                      id: node.id,
                      label: node.label,
                      type: node.type,
                      description: node.description,
                    })
                  }
                }}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 whitespace-nowrap",
                  node.type === "standard" && "bg-card border border-border text-foreground shadow-sm",
                  node.type === "mastered" && "bg-primary text-primary-foreground shadow-md shadow-primary/20",
                  node.type === "missing" && "bg-destructive/15 border border-destructive text-destructive animate-pulse shadow-md",
                  selectedNodeId === node.id && !editMode && "ring-2 ring-ring ring-offset-1",
                  editMode && "ring-2 ring-dashed ring-muted-foreground/30",
                  draggedNodeId === node.id && "scale-110 shadow-lg z-20"
                )}
                style={{ 
                  left: `${node.x}%`, 
                  top: `${node.y}%`,
                  opacity: getNodeOpacity(node),
                }}
              >
                {node.type === "mastered" && <Check className="h-3 w-3" />}
                {node.type === "missing" && <AlertTriangle className="h-3 w-3" />}
                {node.type === "standard" && <Circle className="h-2.5 w-2.5 text-muted-foreground" />}
                {node.label}
              </button>

              {/* Edit Mode Delete Button */}
              {editMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteNode(node.id)
                  }}
                  className="absolute w-5 h-5 bg-destructive hover:bg-destructive/80 rounded-full flex items-center justify-center shadow-md z-10"
                  style={{
                    left: `calc(${node.x}% + 20px)`,
                    top: `calc(${node.y}% - 12px)`,
                  }}
                >
                  <Minus className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border shadow-lg">
          <h2 className="text-sm font-bold text-foreground">Knowledge Graph</h2>
          <p className="text-xs text-muted-foreground">
            {editMode ? "Edit mode" : "Tap nodes to explore"}
          </p>
        </div>

        {/* Filter & Edit Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl bg-card/80 backdrop-blur-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-xl bg-card/80 backdrop-blur-sm",
              editMode && "bg-primary/10 border-primary/50"
            )}
            onClick={() => setEditMode?.(!editMode)}
          >
            <Settings className={cn("h-4 w-4", editMode ? "text-primary" : "text-foreground")} />
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute top-20 right-4 bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-lg p-3 space-y-2">
          {[
            { key: "mastered", label: "Mastered", color: "bg-primary" },
            { key: "concept", label: "Concept", color: "bg-muted-foreground/50" },
            { key: "root-cause", label: "Root Cause", color: "bg-destructive" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterType?.(filterType === filter.key ? "all" : filter.key as typeof filterType)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                filterType === filter.key ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full", filter.color)} />
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Edit Mode Add Button */}
      {editMode && (
        <Button
          onClick={handleAddNode}
          className="absolute top-20 left-4 h-10 rounded-xl shadow-lg"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Node
        </Button>
      )}

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
        <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl p-0">
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
                {/* AI Confidence */}
                {selectedNode.type === "missing" && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="text-sm font-medium">AI Confidence</span>
                    <span className="text-sm font-bold text-primary">{Math.floor(Math.random() * 15 + 78)}%</span>
                  </div>
                )}

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

                <Button 
                  onClick={onOpenQuiz}
                  className="w-full h-11 bg-primary text-primary-foreground font-medium"
                >
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
