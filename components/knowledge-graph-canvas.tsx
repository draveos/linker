"use client"

import { useState } from "react"
import { ZoomIn, ZoomOut, Maximize2, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SelectedNode } from "@/app/page"

interface KnowledgeGraphCanvasProps {
  onNodeClick: (node: SelectedNode) => void
  selectedNodeId?: string
}

interface GraphNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  x: number
  y: number
  description?: string
}

const nodes: GraphNode[] = [
  { id: "1", label: "Matrix Operations", type: "mastered", x: 50, y: 20, description: "Basic matrix arithmetic" },
  { id: "2", label: "Matrix Multiplication", type: "mastered", x: 25, y: 35, description: "Row-column multiplication" },
  { id: "3", label: "Identity Matrix", type: "standard", x: 75, y: 35, description: "The multiplicative identity" },
  { id: "4", label: "Determinants", type: "missing", x: 50, y: 50, description: "Calculating matrix determinants" },
  { id: "5", label: "Matrix Inverse", type: "standard", x: 30, y: 65, description: "Finding inverse matrices" },
  { id: "6", label: "Cofactor Expansion", type: "standard", x: 70, y: 65, description: "Cofactor method for determinants" },
  { id: "7", label: "Linear Systems", type: "standard", x: 50, y: 80, description: "Solving systems of equations" },
]

const connections: [string, string][] = [
  ["1", "2"],
  ["1", "3"],
  ["2", "4"],
  ["3", "4"],
  ["4", "5"],
  ["4", "6"],
  ["5", "7"],
  ["6", "7"],
]

export function KnowledgeGraphCanvas({ onNodeClick, selectedNodeId }: KnowledgeGraphCanvasProps) {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 1.5))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5))
  const handleReset = () => setZoom(1)

  const getNodeById = (id: string) => nodes.find((n) => n.id === id)

  return (
    <main className="flex-1 relative bg-muted/30 overflow-hidden">
      {/* Dotted Grid Background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Canvas Area */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease-out" }}
      >
        <div className="relative w-full h-full max-w-3xl max-h-[600px]">
          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map(([from, to]) => {
              const fromNode = getNodeById(from)
              const toNode = getNodeById(to)
              if (!fromNode || !toNode) return null

              const fromIsMissing = fromNode.type === "missing"
              const toIsMissing = toNode.type === "missing"
              const isErrorPath = fromIsMissing || toIsMissing

              return (
                <line
                  key={`${from}-${to}`}
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke={isErrorPath ? "hsl(var(--destructive))" : "hsl(var(--border))"}
                  strokeWidth={isErrorPath ? 2 : 1.5}
                  strokeDasharray={isErrorPath ? "5,5" : "none"}
                  className={cn(isErrorPath && "animate-pulse")}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() =>
                onNodeClick({
                  id: node.id,
                  label: node.label,
                  type: node.type,
                  description: node.description,
                })
              }
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-lg",
                node.type === "standard" &&
                  "bg-card border-2 border-border text-foreground hover:border-primary/50 hover:shadow-xl",
                node.type === "mastered" &&
                  "bg-primary text-primary-foreground border-2 border-primary hover:brightness-110",
                node.type === "missing" &&
                  "bg-destructive/10 border-2 border-destructive text-destructive shadow-destructive/20 animate-pulse hover:bg-destructive/20",
                selectedNodeId === node.id && "ring-2 ring-ring ring-offset-2 ring-offset-background"
              )}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
              }}
            >
              {node.type === "mastered" && <Check className="h-4 w-4" />}
              {node.type === "missing" && <AlertTriangle className="h-4 w-4" />}
              {node.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Knowledge Graph</h2>
          <p className="text-sm text-muted-foreground">Click on nodes to explore concepts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Mastered
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border">
            <span className="w-2 h-2 rounded-full bg-border" />
            Concept
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Root Cause
          </span>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card border border-border rounded-xl p-1.5 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-secondary"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <span className="text-xs font-medium text-muted-foreground px-2 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-secondary"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-secondary"
          onClick={handleReset}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </main>
  )
}
