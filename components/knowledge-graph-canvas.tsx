"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ZoomIn, ZoomOut, Maximize2, Check, AlertTriangle, Circle, Plus, Minus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SelectedNode, NodePosition } from "@/app/page"

interface KnowledgeGraphCanvasProps {
  onNodeClick: (node: SelectedNode) => void
  selectedNodeId?: string
  activeRootCauseId?: string | null
  isAnalyzing?: boolean
  analysisStep?: number
  editMode?: boolean
  filterType?: "all" | "mastered" | "concept" | "root-cause"
  onNodePositionChange?: (positions: NodePosition[]) => void
  onOpenQuiz?: () => void
}

interface GraphNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  x: number
  y: number
  description?: string
  category: "linear-algebra" | "calculus" | "data-structures"
}

const baseNodes: Omit<GraphNode, "type">[] = [
  { id: "1", label: "Vectors", category: "linear-algebra", x: 15, y: 18, description: "Vector operations and properties" },
  { id: "2", label: "Matrix Operations", category: "linear-algebra", x: 30, y: 18, description: "Basic matrix arithmetic" },
  { id: "3", label: "Matrix Multiplication", category: "linear-algebra", x: 18, y: 35, description: "Row-column multiplication" },
  { id: "4", label: "Determinants", category: "linear-algebra", x: 35, y: 35, description: "Calculating matrix determinants" },
  { id: "5", label: "Matrix Inverse", category: "linear-algebra", x: 15, y: 52, description: "Finding inverse matrices" },
  { id: "6", label: "Cofactor Expansion", category: "linear-algebra", x: 38, y: 52, description: "Cofactor method for determinants" },
  { id: "7", label: "Linear Systems", category: "linear-algebra", x: 25, y: 68, description: "Solving systems of equations" },
  { id: "8", label: "Limits", category: "calculus", x: 55, y: 15, description: "Understanding limits and continuity" },
  { id: "9", label: "Derivatives", category: "calculus", x: 68, y: 15, description: "Rate of change and slopes" },
  { id: "10", label: "Chain Rule", category: "calculus", x: 62, y: 32, description: "Derivative of composite functions" },
  { id: "11", label: "Integration", category: "calculus", x: 75, y: 32, description: "Finding antiderivatives" },
  { id: "12", label: "Partial Derivatives", category: "calculus", x: 58, y: 50, description: "Multivariable calculus" },
  { id: "13", label: "Arrays", category: "data-structures", x: 80, y: 50, description: "Linear data storage" },
  { id: "14", label: "Recursion", category: "data-structures", x: 72, y: 65, description: "Self-referential algorithms" },
  { id: "15", label: "Trees", category: "data-structures", x: 85, y: 65, description: "Hierarchical data structures" },
  { id: "16", label: "Tree Traversal", category: "data-structures", x: 78, y: 82, description: "Visiting tree nodes systematically" },
  { id: "17", label: "Binary Search", category: "data-structures", x: 60, y: 80, description: "Divide and conquer search" },
]

const connections: [string, string][] = [
  ["1", "2"], ["1", "3"], ["2", "3"], ["2", "4"], ["3", "4"],
  ["3", "5"], ["4", "5"], ["4", "6"], ["5", "7"], ["6", "7"],
  ["8", "9"], ["9", "10"], ["9", "11"], ["10", "11"], ["10", "12"],
  ["13", "14"], ["13", "15"], ["14", "15"], ["14", "16"], ["15", "16"], ["14", "17"],
  ["7", "12"], ["11", "17"],
]

const masteredIds = ["1", "2", "8", "9", "13"]

const analysisSteps = [
  "Mapping problem to related concepts...",
  "Analyzing reasoning and detecting gaps...",
  "Tracing prerequisite dependencies...",
  "Root cause identified",
]

export function KnowledgeGraphCanvas({ 
  onNodeClick, 
  selectedNodeId, 
  activeRootCauseId,
  isAnalyzing,
  analysisStep,
  editMode,
  filterType,
  onNodePositionChange,
  onOpenQuiz
}: KnowledgeGraphCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [nodes, setNodes] = useState(baseNodes)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 1.5))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.6))
  const handleReset = () => setZoom(1)

  const computedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      type: (activeRootCauseId === node.id 
        ? "missing" 
        : masteredIds.includes(node.id) 
          ? "mastered" 
          : "standard") as "standard" | "mastered" | "missing",
    }))
  }, [nodes, activeRootCauseId])

  const getNodeById = (id: string) => computedNodes.find((n) => n.id === id)

  const isEdgeHighlighted = (fromId: string, toId: string) => {
    const fromNode = getNodeById(fromId)
    const toNode = getNodeById(toId)
    const fromIsMissing = fromNode?.type === "missing"
    const toIsMissing = toNode?.type === "missing"
    const isHovered = fromId === hoveredNodeId || toId === hoveredNodeId
    return fromIsMissing || toIsMissing || isHovered
  }

  const getNodeOpacity = (node: GraphNode) => {
    if (filterType === "all") return 1
    if (filterType === "mastered" && node.type === "mastered") return 1
    if (filterType === "concept" && node.type === "standard") return 1
    if (filterType === "root-cause" && node.type === "missing") return 1
    return 0.15
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!editMode) return
    e.preventDefault()
    setDraggedNodeId(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !svgRef.current || !editMode) return
    
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setNodes((prev) =>
      prev.map((node) =>
        node.id === draggedNodeId
          ? { ...node, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
          : node
      )
    )
  }

  const handleMouseUp = () => {
    setDraggedNodeId(null)
  }

  const handleAddNode = () => {
    const newId = Math.max(...nodes.map(n => parseInt(n.id)), 0) + 1
    setNodes([
      ...nodes,
      {
        id: newId.toString(),
        label: `New Concept ${newId}`,
        category: "linear-algebra",
        x: 50,
        y: 50,
        description: "New concept",
      },
    ])
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId))
  }

  return (
    <main 
      className="flex-1 relative bg-muted/30 overflow-hidden max-md:hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Dotted Grid Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground) / 0.15) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Multi-Step Analysis Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-30 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-md">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
            
            {/* Analysis Steps */}
            <div className="w-full space-y-3">
              {analysisSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                    idx < (analysisStep + 1)
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/50 border border-border opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                      idx < (analysisStep + 1)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground"
                    )}
                  >
                    {idx < analysisStep ? "✓" : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      idx < (analysisStep + 1) ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-muted-foreground">
              <p>AI is analyzing your error...</p>
              <p className="font-medium text-foreground mt-1">This may take a few seconds</p>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out"
        style={{ transform: `scale(${zoom})` }}
      >
        <div className="relative w-full h-full">
          {/* SVG Connections */}
          <svg 
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {connections.map(([from, to]) => {
              const fromNode = getNodeById(from)
              const toNode = getNodeById(to)
              if (!fromNode || !toNode) return null

              const highlighted = isEdgeHighlighted(from, to)
              const isMissingPath = fromNode.type === "missing" || toNode.type === "missing"

              return (
                <line
                  key={`${from}-${to}`}
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke={isMissingPath ? "hsl(var(--destructive))" : highlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={highlighted ? 2.5 : 1.5}
                  strokeDasharray={isMissingPath ? "6,4" : "none"}
                  className={cn(
                    "transition-all duration-300",
                    isMissingPath && "animate-pulse"
                  )}
                  filter={highlighted ? "url(#glow)" : undefined}
                  opacity={highlighted ? 1 : 0.6}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {computedNodes.map((node) => {
            const isSelected = selectedNodeId === node.id
            const isHovered = hoveredNodeId === node.id
            const isDragging = draggedNodeId === node.id
            const nodeOpacity = getNodeOpacity(node)
            
            return (
              <div key={node.id} className="relative">
                <button
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={() =>
                    onNodeClick({
                      id: node.id,
                      label: node.label,
                      type: node.type,
                      description: node.description,
                    })
                  }
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={cn(
                    "absolute transform -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer",
                    editMode && draggedNodeId === node.id && "cursor-grabbing",
                    editMode && !draggedNodeId && "cursor-grab",
                    // Standard node
                    node.type === "standard" && [
                      "bg-card border-2 border-border text-foreground shadow-md",
                      "hover:border-primary/50 hover:shadow-lg hover:scale-105",
                      isHovered && "border-primary/50 shadow-lg scale-105",
                    ],
                    // Mastered node
                    node.type === "mastered" && [
                      "bg-primary text-primary-foreground border-2 border-primary shadow-lg shadow-primary/20",
                      "hover:brightness-110 hover:scale-105 hover:shadow-xl hover:shadow-primary/30",
                      isHovered && "brightness-110 scale-105 shadow-xl shadow-primary/30",
                    ],
                    // Missing/Root Cause node
                    node.type === "missing" && [
                      "bg-destructive/15 border-2 border-destructive text-destructive shadow-lg shadow-destructive/30",
                      "animate-pulse hover:bg-destructive/25 hover:scale-110",
                      isHovered && "bg-destructive/25 scale-110",
                    ],
                    // Selected state
                    isSelected && "ring-2 ring-ring ring-offset-2 ring-offset-background scale-105",
                    // Filter opacity
                    `opacity-${Math.round(nodeOpacity * 100)}`
                  )}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    opacity: nodeOpacity,
                  }}
                >
                  {node.type === "mastered" && <Check className="h-4 w-4" />}
                  {node.type === "missing" && <AlertTriangle className="h-4 w-4" />}
                  {node.type === "standard" && <Circle className="h-3 w-3 text-muted-foreground" />}
                  {node.label}
                </button>

                {/* Edit Mode Delete Button */}
                {editMode && (
                  <button
                    onClick={() => handleDeleteNode(node.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: "translate(50%, -50%)",
                    }}
                  >
                    <Minus className="h-3 w-3 text-destructive-foreground" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border shadow-lg">
          <h2 className="text-lg font-bold text-foreground">Knowledge Graph</h2>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Edit mode: Drag to move, click - to delete" : "Click on nodes to explore concepts"}
          </p>
        </div>
      </div>

      {/* Filter Legend */}
      <div className="absolute top-6 right-6 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={() => filterType === "all" ? null : setFilterType}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-border shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
            Mastered
          </button>
          <button
            onClick={() => filterType === "concept" ? setFilterType("all") : setFilterType("concept")}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-border shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            Concept
          </button>
          <button
            onClick={() => filterType === "root-cause" ? setFilterType("all") : setFilterType("root-cause")}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-2 rounded-full border border-border shadow-sm hover:border-destructive/50 transition-colors cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse shadow-sm shadow-destructive/50" />
            Root Cause
          </button>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-2 shadow-xl pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-secondary"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <span className="text-sm font-medium text-foreground px-3 min-w-[60px] text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-secondary"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-secondary"
          onClick={handleReset}
          title="Reset View"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </main>
  )
}
