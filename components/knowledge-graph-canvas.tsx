"use client"

import { useCallback, useMemo, useEffect } from "react"
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
  type NodeProps,
} from "reactflow"
import "reactflow/dist/style.css"
import { Check, AlertTriangle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

// Types
export interface KnowledgeNode {
  id: string
  label: string
  description: string
  prerequisites: string[]
}

export interface SelectedNodeData {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  description: string
}

interface KnowledgeGraphCanvasProps {
  onNodeClick: (node: SelectedNodeData) => void
  selectedNodeId?: string
  activeRootCauseId?: string | null
  isAnalyzing?: boolean
  analysisStep?: number
}

// 기초 선형대수학 개념 (8-12개)
const knowledgeNodes: KnowledgeNode[] = [
  { id: "1", label: "벡터", description: "벡터의 기본 개념과 연산", prerequisites: [] },
  { id: "2", label: "행렬", description: "행렬의 정의와 기본 연산", prerequisites: ["1"] },
  { id: "3", label: "행렬 곱셈", description: "행렬 간의 곱셈 연산", prerequisites: ["2"] },
  { id: "4", label: "행렬식", description: "행렬식(Determinant) 계산법", prerequisites: ["3"] },
  { id: "5", label: "역행렬", description: "역행렬의 존재 조건과 계산", prerequisites: ["4"] },
  { id: "6", label: "여인수 전개", description: "여인수를 이용한 행렬식 계산", prerequisites: ["4"] },
  { id: "7", label: "크래머 공식", description: "행렬식을 이용한 연립방정식 풀이", prerequisites: ["5", "6"] },
  { id: "8", label: "선형 변환", description: "행렬을 이용한 선형 변환", prerequisites: ["3"] },
  { id: "9", label: "고유값", description: "고유값과 고유벡터 계산", prerequisites: ["4", "8"] },
  { id: "10", label: "대각화", description: "행렬의 대각화", prerequisites: ["9"] },
]

// 완료된 개념 (파란색)
const masteredNodeIds = ["1", "2", "3"]

// 노드 위치 (계층 구조)
const nodePositions: Record<string, { x: number; y: number }> = {
  "1": { x: 400, y: 50 },
  "2": { x: 400, y: 130 },
  "3": { x: 280, y: 210 },
  "8": { x: 520, y: 210 },
  "4": { x: 400, y: 290 },
  "5": { x: 280, y: 370 },
  "6": { x: 520, y: 370 },
  "9": { x: 520, y: 290 },
  "7": { x: 400, y: 450 },
  "10": { x: 520, y: 450 },
}

// Custom Node Component
function ConceptNode({ data, selected }: NodeProps) {
  const { label, nodeType, isAnalyzing } = data

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-xl border-2 shadow-lg transition-all duration-300 min-w-[100px] text-center",
        nodeType === "mastered" && "bg-primary text-primary-foreground border-primary shadow-primary/25",
        nodeType === "standard" && "bg-card text-card-foreground border-border hover:border-primary/50",
        nodeType === "missing" && "bg-destructive/10 text-destructive border-destructive shadow-destructive/30 shadow-xl",
        nodeType === "missing" && isAnalyzing && "animate-pulse",
        selected && "ring-2 ring-ring ring-offset-2"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2 !border-0" />

      <div className="flex items-center justify-center gap-2">
        {nodeType === "mastered" && <Check className="h-4 w-4" />}
        {nodeType === "missing" && <AlertTriangle className="h-4 w-4" />}
        {nodeType === "standard" && <Circle className="h-3 w-3 opacity-50" />}
        <span className="font-medium text-sm">{label}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2 !border-0" />
    </div>
  )
}

const nodeTypes = { concept: ConceptNode }

export function KnowledgeGraphCanvas({
  onNodeClick,
  selectedNodeId,
  activeRootCauseId,
  isAnalyzing,
  analysisStep,
}: KnowledgeGraphCanvasProps) {
  // Generate nodes
  const initialNodes: Node[] = useMemo(() => {
    return knowledgeNodes.map((node) => {
      let nodeType: "standard" | "mastered" | "missing" = "standard"
      if (masteredNodeIds.includes(node.id)) nodeType = "mastered"
      else if (node.id === activeRootCauseId) nodeType = "missing"

      return {
        id: node.id,
        type: "concept",
        position: nodePositions[node.id] || { x: 0, y: 0 },
        data: {
          label: node.label,
          nodeType,
          description: node.description,
          isAnalyzing: isAnalyzing && node.id === activeRootCauseId,
        },
        selected: node.id === selectedNodeId,
      }
    })
  }, [activeRootCauseId, selectedNodeId, isAnalyzing])

  // Generate edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    knowledgeNodes.forEach((node) => {
      node.prerequisites.forEach((prereqId) => {
        const isPathToRootCause =
          activeRootCauseId && (node.id === activeRootCauseId || prereqId === activeRootCauseId)

        edges.push({
          id: `${prereqId}-${node.id}`,
          source: prereqId,
          target: node.id,
          type: "smoothstep",
          animated: isAnalyzing && isPathToRootCause,
          style: {
            stroke: isPathToRootCause ? "hsl(var(--destructive))" : "hsl(var(--border))",
            strokeWidth: isPathToRootCause ? 2.5 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isPathToRootCause ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))",
            width: 16,
            height: 16,
          },
        })
      })
    })
    return edges
  }, [activeRootCauseId, isAnalyzing])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update when activeRootCauseId changes
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const kNode = knowledgeNodes.find((n) => n.id === node.id)
      if (kNode) {
        let nodeType: "standard" | "mastered" | "missing" = "standard"
        if (masteredNodeIds.includes(node.id)) nodeType = "mastered"
        else if (node.id === activeRootCauseId) nodeType = "missing"

        onNodeClick({
          id: node.id,
          label: kNode.label,
          type: nodeType,
          description: kNode.description,
        })
      }
    },
    [onNodeClick, activeRootCauseId]
  )

  const analysisSteps = [
    "문제를 관련 개념에 매핑 중...",
    "풀이 과정 분석 및 오류 탐지 중...",
    "선행 개념 의존성 추적 중...",
    "결손 개념 확정 완료",
  ]

  return (
    <div className="flex-1 h-full max-md:hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={1.5}
        className="bg-muted/30"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(var(--border))" />
        <Controls
          className="!bg-card !border-border !rounded-xl !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!rounded-lg [&>button:hover]:!bg-muted"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Analysis Progress Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center gap-5">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />

              <div className="w-full space-y-2">
                {analysisSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                      idx <= (analysisStep ?? 0)
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/50 border border-transparent opacity-40"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                        idx <= (analysisStep ?? 0)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground text-muted-foreground"
                      )}
                    >
                      {idx < (analysisStep ?? 0) ? <Check className="h-3 w-3" /> : idx + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
          <h2 className="text-base font-bold text-foreground">지식 그래프</h2>
          <p className="text-xs text-muted-foreground">기초 선형대수학</p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">완료된 개념</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/30 border border-border" />
            <span className="text-muted-foreground">학습 필요</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">결손 개념</span>
          </div>
        </div>
      </div>
    </div>
  )
}
