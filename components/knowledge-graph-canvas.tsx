"use client"

import { useCallback, useMemo, useEffect, useState, useRef, useContext, createContext } from "react"
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
  ConnectionMode,
  addEdge,
  Connection,
  type NodeProps,
  type EdgeProps,
  getBezierPath,
  BaseEdge,
} from "reactflow"
import "reactflow/dist/style.css"
import { Check, AlertTriangle, Circle, Settings, Save, X, Plus, Sparkles, MessageCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ─────────────────────────────────────────────────────────────
// Context — editMode와 핸들러를 data prop 없이 공유
// ─────────────────────────────────────────────────────────────

interface GraphEditContextValue {
  editMode: boolean
  onDeleteNode: (id: string, label: string) => void
  onDeleteEdge: (id: string) => void
}

const GraphEditContext = createContext<GraphEditContextValue>({
  editMode: false,
  onDeleteNode: () => { },
  onDeleteEdge: () => { },
})

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface KnowledgeNode {
  id: string
  label: string
  description: string
  prerequisites: string[]
  confidence?: number
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
  nodes: KnowledgeNode[]
  masteredNodeIds: string[]
  domain: string
}

interface DeleteConfirmState {
  type: "node" | "edge" | null
  id: string | null
  name: string
}

// ─────────────────────────────────────────────────────────────
// Auto Layout — DAG topological sort → position 계산
// ─────────────────────────────────────────────────────────────

function computeLayout(nodes: KnowledgeNode[]): Record<string, { x: number; y: number }> {
  const nodeIds = new Set(nodes.map((n) => n.id))
  // 각 노드의 레벨(깊이) 계산
  const levels: Record<string, number> = {}

  function getLevel(id: string, visited = new Set<string>()): number {
    if (levels[id] !== undefined) return levels[id]
    if (visited.has(id)) return 0
    visited.add(id)
    const node = nodes.find((n) => n.id === id)
    if (!node || node.prerequisites.length === 0) {
      levels[id] = 0
      return 0
    }
    const validPrereqs = node.prerequisites.filter((p) => nodeIds.has(p))
    const level = Math.max(...validPrereqs.map((p) => getLevel(p, new Set(visited)) + 1))
    levels[id] = level
    return level
  }

  nodes.forEach((n) => getLevel(n.id))

  // 레벨별 그룹화
  const byLevel: Record<number, string[]> = {}
  Object.entries(levels).forEach(([id, lvl]) => {
    if (!byLevel[lvl]) byLevel[lvl] = []
    byLevel[lvl].push(id)
  })

  const HORIZONTAL_GAP = 160
  const VERTICAL_GAP = 110
  const positions: Record<string, { x: number; y: number }> = {}

  Object.entries(byLevel).forEach(([lvlStr, ids]) => {
    const lvl = parseInt(lvlStr)
    const totalWidth = (ids.length - 1) * HORIZONTAL_GAP
    const startX = 400 - totalWidth / 2
    ids.forEach((id, idx) => {
      positions[id] = { x: startX + idx * HORIZONTAL_GAP, y: 60 + lvl * VERTICAL_GAP }
    })
  })

  return positions
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function resolveNodeType(
    nodeId: string,
    masteredNodeIds: string[],
    activeRootCauseId?: string | null
): "standard" | "mastered" | "missing" {
  if (nodeId === activeRootCauseId) return "missing"
  if (masteredNodeIds.includes(nodeId)) return "mastered"
  return "standard"
}

// SVG에서 CSS 변수(hsl(var(...)))가 렌더 안 되는 경우 대비 → 직접 색상 사용
const EDGE_COLOR_DEFAULT = "#94a3b8"   // slate-400
const EDGE_COLOR_DANGER  = "#ef4444"   // red-500

function buildEdgeStyle(
    isPathToRootCause: boolean,
    filterType: string,
    isAnalyzing?: boolean
) {
  return {
    style: {
      stroke: isPathToRootCause ? EDGE_COLOR_DANGER : EDGE_COLOR_DEFAULT,
      strokeWidth: isPathToRootCause ? 2.5 : 1.5,
      opacity: filterType !== "all" ? 0.3 : 1,
    },
    animated: !!(isAnalyzing && isPathToRootCause),
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isPathToRootCause ? EDGE_COLOR_DANGER : EDGE_COLOR_DEFAULT,
      width: 16,
      height: 16,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Custom Node — editMode/핸들러를 data가 아닌 Context에서 읽음
// ─────────────────────────────────────────────────────────────

function ConceptNode({ data, selected, id }: NodeProps) {
  const { editMode, onDeleteNode } = useContext(GraphEditContext)
  const { label, nodeType, isAnalyzing, isFiltered } = data

  return (
      <div className="relative group">
        {editMode && (
            <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteNode(id, label)
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive hover:bg-destructive/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
            >
              <X className="h-3 w-3" />
            </button>
        )}

        <div
            className={cn(
                "px-4 py-3 rounded-xl border-2 shadow-lg transition-all duration-300 min-w-[100px] text-center",
                nodeType === "mastered" &&
                "bg-primary text-primary-foreground border-primary shadow-primary/25",
                nodeType === "standard" &&
                "bg-card text-card-foreground border-border hover:border-primary/50",
                nodeType === "missing" &&
                "bg-destructive/10 text-destructive border-destructive shadow-destructive/30 shadow-xl",
                nodeType === "missing" && isAnalyzing && "animate-pulse",
                selected && "ring-2 ring-ring ring-offset-2",
                isFiltered && "opacity-20",
                editMode && "cursor-move"
            )}
        >
          <Handle
              type="target"
              position={Position.Top}
              className="!bg-muted-foreground !w-2 !h-2 !border-0"
          />
          <div className="flex items-center justify-center gap-2">
            {nodeType === "mastered" && <Check className="h-4 w-4" />}
            {nodeType === "missing" && <AlertTriangle className="h-4 w-4" />}
            {nodeType === "standard" && <Circle className="h-3 w-3 opacity-50" />}
            <span className="font-medium text-sm">{label}</span>
          </div>
          <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-muted-foreground !w-2 !h-2 !border-0"
          />
        </div>
      </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Custom Edge — Context에서 editMode 읽음
// ─────────────────────────────────────────────────────────────

function DeletableEdge({
                         id,
                         sourceX,
                         sourceY,
                         targetX,
                         targetY,
                         sourcePosition,
                         targetPosition,
                         style,
                         markerEnd,
                       }: EdgeProps) {
  const { editMode, onDeleteEdge } = useContext(GraphEditContext)
  const [hovered, setHovered] = useState(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const stroke = (style?.stroke as string) ?? EDGE_COLOR_DEFAULT
  const strokeWidth = (style?.strokeWidth as number) ?? 1.5
  const opacity = (style?.opacity as number) ?? 1

  return (
      <g
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
      >
        {/* 호버 감지용 넓은 투명 패스 */}
        <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
        {/* 실제 엣지 라인 */}
        <path
            d={edgePath}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
            markerEnd={markerEnd}
        />
        {/* 수정 모드 + 호버 시 삭제 버튼 */}
        {editMode && hovered && (
            <foreignObject
                width={20}
                height={20}
                x={labelX - 10}
                y={labelY - 10}
                className="overflow-visible"
                requiredExtensions="http://www.w3.org/1999/xhtml"
            >
              <button
                  onClick={(e) => { e.stopPropagation(); onDeleteEdge(id) }}
                  className="w-5 h-5 bg-destructive hover:bg-destructive/80 text-white rounded-full flex items-center justify-center shadow-md"
              >
                <X className="h-3 w-3" />
              </button>
            </foreignObject>
        )}
      </g>
  )
}

// ─────────────────────────────────────────────────────────────
// Node / Edge type maps — 컴포넌트 외부 선언 (리렌더 시 재생성 방지)
// 항상 같은 타입 고정 → editMode에 따라 타입 스왑 불필요
// ─────────────────────────────────────────────────────────────

const nodeTypes = { concept: ConceptNode } as const
const edgeTypes = { deletable: DeletableEdge } as const

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function KnowledgeGraphCanvas({
                                       onNodeClick,
                                       selectedNodeId,
                                       activeRootCauseId,
                                       isAnalyzing,
                                       analysisStep,
                                       nodes: knowledgeNodes,
                                       masteredNodeIds,
                                       domain,
                                     }: KnowledgeGraphCanvasProps) {
  const [editMode, setEditMode] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "mastered" | "standard" | "missing">("all")
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    type: null,
    id: null,
    name: "",
  })
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const errorTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // 취소용 스냅샷 — ref로 보관해 불필요한 리렌더 방지
  const snapshotRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null)

  // ── 핸들러 ───────────────────────────────────────────────

  const handleDeleteNode = useCallback(
      (nodeId: string, nodeName: string) => {
        if (skipDeleteConfirm) {
          setNodes((nds) => nds.filter((n) => n.id !== nodeId))
          setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
        } else {
          setDeleteConfirm({ type: "node", id: nodeId, name: nodeName })
        }
      },
      [skipDeleteConfirm]
  )

  const handleDeleteEdge = useCallback(
      (edgeId: string) => {
        if (skipDeleteConfirm) {
          setEdges((eds) => eds.filter((e) => e.id !== edgeId))
        } else {
          setDeleteConfirm({ type: "edge", id: edgeId, name: "연결선" })
        }
      },
      [skipDeleteConfirm]
  )

  // Context value 메모이제이션 — 값이 바뀔 때만 하위 리렌더
  const contextValue = useMemo<GraphEditContextValue>(
      () => ({ editMode, onDeleteNode: handleDeleteNode, onDeleteEdge: handleDeleteEdge }),
      [editMode, handleDeleteNode, handleDeleteEdge]
  )

  // ── 노드/엣지 빌더 ───────────────────────────────────────

  const buildNodes = useCallback(
      (kNodes: KnowledgeNode[], mIds: string[], rootCauseId?: string | null, fType = "all"): Node[] => {
        const positions = computeLayout(kNodes)
        return kNodes.map((node) => {
          const nodeType = resolveNodeType(node.id, mIds, rootCauseId)
          const isFiltered = fType !== "all" && fType !== nodeType
          return {
            id: node.id,
            type: "concept",
            position: positions[node.id] ?? { x: 0, y: 0 },
            data: {
              label: node.label,
              nodeType,
              description: node.description,
              isAnalyzing: !!isAnalyzing && node.id === rootCauseId,
              isFiltered,
              confidence: node.confidence,
              _editMode: false,
            },
            selected: node.id === selectedNodeId,
            draggable: false,
          }
        })
      },
      [isAnalyzing, selectedNodeId]
  )

  const buildEdges = useCallback(
      (kNodes: KnowledgeNode[], rootCauseId?: string | null, fType = "all"): Edge[] => {
        const nodeIdSet = new Set(kNodes.map((n) => n.id))
        const edges: Edge[] = []
        kNodes.forEach((node) => {
          node.prerequisites.forEach((prereqId) => {
            if (!nodeIdSet.has(prereqId)) return
            const isPath = !!rootCauseId && (node.id === rootCauseId || prereqId === rootCauseId)
            edges.push({
              id: `${prereqId}-${node.id}`,
              source: prereqId,
              target: node.id,
              type: "deletable",
              data: { _editMode: false },
              ...buildEdgeStyle(isPath, fType, isAnalyzing),
            })
          })
        })
        return edges
      },
      [isAnalyzing]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(
      buildNodes(knowledgeNodes, masteredNodeIds, activeRootCauseId, filterType)
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
      buildEdges(knowledgeNodes, activeRootCauseId, filterType)
  )

  // ── props.nodes 변경 시 전체 재빌드 (그래프 교체) ─────────

  const prevNodesRef = useRef(knowledgeNodes)
  useEffect(() => {
    if (prevNodesRef.current === knowledgeNodes) return
    prevNodesRef.current = knowledgeNodes
    if (editMode) return
    setNodes(buildNodes(knowledgeNodes, masteredNodeIds, activeRootCauseId, filterType))
    setEdges(buildEdges(knowledgeNodes, activeRootCauseId, filterType))
  }, [knowledgeNodes, masteredNodeIds, activeRootCauseId, filterType, editMode, buildNodes, buildEdges, setNodes, setEdges])

  // ── 비editMode: 표시 속성만 동기화, 포지션·구조는 유지 ──

  useEffect(() => {
    if (editMode) return

    setNodes((nds) =>
        nds.map((n) => {
          const nodeType = resolveNodeType(n.id, masteredNodeIds, activeRootCauseId)
          const isFiltered = filterType !== "all" && filterType !== nodeType
          return {
            ...n,
            draggable: false,
            selected: n.id === selectedNodeId,
            data: {
              ...n.data,
              nodeType,
              isAnalyzing: isAnalyzing && n.id === activeRootCauseId,
              isFiltered,
            },
          }
        })
    )

    setEdges((eds) =>
        eds.map((e) => {
          const isPath =
              !!activeRootCauseId &&
              (e.target === activeRootCauseId || e.source === activeRootCauseId)
          return {
            ...e,
            ...buildEdgeStyle(isPath, filterType, isAnalyzing),
          }
        })
    )
  }, [
    activeRootCauseId,
    masteredNodeIds,
    isAnalyzing,
    filterType,
    selectedNodeId,
    editMode,
    setNodes,
    setEdges,
  ])

  // ── editMode 진입: draggable 전환만 (타입 스왑 불필요) ───

  useEffect(() => {
    if (!editMode) return
    setNodes((nds) => nds.map((n) => ({ ...n, draggable: true })))
  }, [editMode, setNodes])

  // ── ReactFlow memoize 무력화 — editMode 바뀔 때 data에 트리거 주입 ──
  // Context만으론 ReactFlow가 edge/node를 리렌더하지 않아서 필요

  useEffect(() => {
    setEdges((eds) =>
        eds.map((e) => ({ ...e, data: { ...e.data, _editMode: editMode } }))
    )
    setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, _editMode: editMode } }))
    )
  }, [editMode, setEdges, setNodes])

  // ── 연결 오류 팝업 ────────────────────────────────────────

  const showConnectionError = useCallback((msg: string) => {
    setConnectionError(msg)
    clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setConnectionError(null), 3000)
  }, [])

  // ── 연결 유효성 검사 ──────────────────────────────────────

  const isValidConnection = useCallback(
      (connection: Connection) => {
        if (connection.source === connection.target) {
          showConnectionError("같은 노드끼리는 연결할 수 없습니다")
          return false
        }
        const duplicate = edges.some(
            (e) => e.source === connection.source && e.target === connection.target
        )
        if (duplicate) {
          showConnectionError("이미 연결된 개념입니다. 반대 방향으로 연결하거나 다른 노드를 선택하세요")
          return false
        }
        return true
      },
      [edges, showConnectionError]
  )

  // ── 엣지 연결 ────────────────────────────────────────────

  const onConnect = useCallback(
      (params: Connection) => {
        if (!editMode) return
        setEdges((eds) => addEdge({
          ...params,
          type: "deletable",
          data: { _editMode: true },
          ...buildEdgeStyle(false, filterType, false),
        }, eds))
      },
      [editMode, filterType, setEdges]
  )

  // ── 노드 클릭 ────────────────────────────────────────────

  const handleNodeClick = useCallback(
      (_: React.MouseEvent, node: Node) => {
        if (editMode) return
        const kNode = knowledgeNodes.find((n) => n.id === node.id)
        if (!kNode) return
        onNodeClick({
          id: node.id,
          label: kNode.label,
          type: resolveNodeType(node.id, masteredNodeIds, activeRootCauseId),
          description: kNode.description,
        })
      },
      [onNodeClick, activeRootCauseId, masteredNodeIds, editMode, knowledgeNodes]
  )

  // ── 수정 모드 진입/저장/취소 ─────────────────────────────

  const enterEditMode = useCallback(() => {
    snapshotRef.current = {
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: edges.map((e) => ({ ...e })),
    }
    setEditMode(true)
  }, [nodes, edges])

  const saveChanges = useCallback(async () => {
    // TODO: 서버 저장 로직
    // await fetch('/api/graph/save', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     nodes: nodes.map(n => ({ id: n.id, position: n.position, label: n.data.label })),
    //     edges: edges.map(e => ({ source: e.source, target: e.target }))
    //   })
    // })
    snapshotRef.current = null
    setEditMode(false)
  }, [])

  const cancelChanges = useCallback(() => {
    if (snapshotRef.current) {
      setNodes(snapshotRef.current.nodes)
      setEdges(snapshotRef.current.edges)
      snapshotRef.current = null
    }
    setEditMode(false)
  }, [setNodes, setEdges])

  // ── 노드 추가 ────────────────────────────────────────────

  const addNewNode = useCallback(() => {
    const maxId = Math.max(...nodes.map((n) => parseInt(n.id) || 0), 0)
    const newId = String(maxId + 1)
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        type: "concept",
        position: { x: 400, y: 520 },
        data: {
          label: `새 개념 ${newId}`,
          nodeType: "standard",
          description: "새로운 개념",
          isFiltered: false,
          _editMode: editMode,
        },
        draggable: true,
      },
    ])
  }, [nodes, setNodes])

  // ── 삭제 확정/취소 ────────────────────────────────────────

  const executeDelete = useCallback(() => {
    const { id, type } = deleteConfirm
    if (!id) return
    if (type === "node") {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    } else if (type === "edge") {
      setEdges((eds) => eds.filter((e) => e.id !== id))
    }
    setDeleteConfirm({ type: null, id: null, name: "" })
  }, [deleteConfirm, setNodes, setEdges])

  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ type: null, id: null, name: "" })
  }, [])

  // ── 필터 토글 ─────────────────────────────────────────────

  const toggleFilter = useCallback(
      (type: "mastered" | "standard" | "missing") =>
          setFilterType((prev) => (prev === type ? "all" : type)),
      []
  )

  const requestAiOrganize = useCallback(() => {
    setShowAiSuggestion(true)
    // TODO: AI 레이아웃 최적화 API 연동
  }, [])

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  const analysisSteps = [
    "문제를 관련 개념에 매핑 중...",
    "풀이 과정 분석 및 오류 탐지 중...",
    "선행 개념 의존성 추적 중...",
    "결손 개념 확정 완료",
  ]

  return (
      <GraphEditContext.Provider value={contextValue}>
        <div className="flex-1 h-full w-full relative">
          <div style={{ width: "100%", height: "100%" }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.5}
                maxZoom={1.5}
                className="bg-muted/30"
                proOptions={{ hideAttribution: true }}
                nodesDraggable={editMode}
                nodesConnectable={editMode}
                elementsSelectable={editMode}
                panOnDrag={!editMode}
                zoomOnScroll
                zoomOnPinch
                zoomOnDoubleClick={false}
                selectNodesOnDrag={false}
            >
              <Background
                  variant={BackgroundVariant.Dots}
                  gap={24}
                  size={1}
                  color="hsl(var(--border))"
              />
              <Controls
                  className="!bg-card !border-border !rounded-xl !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!rounded-lg [&>button:hover]:!bg-muted"
                  showInteractive={false}
              />
            </ReactFlow>
          </div>

          {/* ── Analysis Progress Overlay ── */}
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
                              {idx < (analysisStep ?? 0) ? (
                                  <Check className="h-3 w-3" />
                              ) : (
                                  idx + 1
                              )}
                            </div>
                            <span className="text-sm">{step}</span>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* ── Title & Edit Controls ── */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
              <h2 className="text-base font-bold text-foreground">지식 그래프</h2>
              <p className="text-xs text-muted-foreground">{domain}</p>
            </div>

            {editMode ? (
                <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-2 shadow-lg flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={addNewNode}>
                    <Plus className="h-4 w-4 mr-1" />
                    노드 추가
                  </Button>
                  <Button size="sm" variant="outline" onClick={requestAiOrganize}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI 정리
                  </Button>
                  <Button size="sm" variant="default" onClick={saveChanges}>
                    <Save className="h-4 w-4 mr-1" />
                    저장
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelChanges}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
            ) : (
                <Button
                    size="sm"
                    variant="outline"
                    className="bg-card/95 backdrop-blur-sm border-border shadow-lg w-fit"
                    onClick={enterEditMode}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  수정 모드
                </Button>
            )}
          </div>

          {/* ── Legend / Filter ── */}
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg space-y-2">
              {(
                  [
                    { key: "mastered", color: "bg-primary", label: "완료된 개념" },
                    { key: "standard", color: "bg-muted-foreground/30 border border-border", label: "학습 필요" },
                    { key: "missing", color: "bg-destructive", label: "결손 개념" },
                  ] as const
              ).map(({ key, color, label }) => (
                  <button
                      key={key}
                      onClick={() => toggleFilter(key)}
                      className={cn(
                          "flex items-center gap-2 text-xs w-full px-2 py-1 rounded-lg transition-colors",
                          filterType === key ? "bg-muted" : "hover:bg-muted"
                      )}
                  >
                    <div className={cn("w-3 h-3 rounded-full", color)} />
                    <span className="text-muted-foreground">{label}</span>
                  </button>
              ))}
            </div>
          </div>

          {/* ── Connection Error Toast ── */}
          {connectionError && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-3 fade-in duration-200">
                <div className="bg-destructive text-destructive-foreground text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 max-w-sm">
                  <X className="h-4 w-4 shrink-0" />
                  <span>{connectionError}</span>
                </div>
              </div>
          )}

          {/* ── AI Suggestion Bubble ── */}
          {showAiSuggestion && (
              <div className="absolute bottom-20 right-4 z-20 max-w-xs animate-in slide-in-from-bottom-4">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-full shrink-0">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground leading-relaxed">
                        보니까 <strong>행렬식</strong> 개념에서 자주 막히시는 것 같아요!{" "}
                        <strong>행렬 곱셈</strong>부터 차근차근 복습해볼까요?
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="default" className="h-8">
                          네, 시작할게요
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAiSuggestion(false)}>
                          나중에
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* ── Delete Confirmation Modal ── */}
          {deleteConfirm.id && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-destructive/10 rounded-full">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {deleteConfirm.type === "node" ? "노드 삭제" : "연결선 삭제"}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    <strong className="text-foreground">{deleteConfirm.name}</strong>
                    을(를) 정말로 삭제하시겠습니까?
                    {deleteConfirm.type === "node" && (
                        <>
                          <br />
                          <span className="text-xs">연결된 모든 엣지도 함께 삭제됩니다.</span>
                        </>
                    )}
                  </p>

                  <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={skipDeleteConfirm}
                        onChange={(e) => setSkipDeleteConfirm(e.target.checked)}
                        className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">오늘은 다시 묻지 않기</span>
                  </label>

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={cancelDelete}>
                      취소
                    </Button>
                    <Button variant="destructive" size="sm" onClick={executeDelete}>
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </GraphEditContext.Provider>
  )
}